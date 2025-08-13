import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getUser } from '../utils/authStorage';

export type MyProgress = {
  current_step: number;
  finished_at: string | null;
  dnf_partial_reps: number;
  rounds_completed?: number;
};

export function useMyProgress(classId: number, enabled = true) {
  const [progress, setProgress] = useState<MyProgress>({
    current_step: 0,
    finished_at: null,
    dnf_partial_reps: 0,
    rounds_completed: 0,
  });
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    getUser().then(u => setUserId(u?.userId ?? null));
  }, []);

  const fetchOnce = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('live_progress')
      .select('current_step, finished_at, dnf_partial_reps, rounds_completed')
      .eq('class_id', classId)
      .eq('user_id', userId)
      .maybeSingle();
    if (data) {
      setProgress(data as MyProgress);
    }
  }, [classId, userId]);

  useEffect(() => {
    if (!enabled || !userId) return;
    fetchOnce();

    const ch = supabase.channel(`me-${classId}-${userId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_progress',
          filter: `class_id=eq.${classId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (row?.user_id === userId) {
            const { current_step, finished_at, dnf_partial_reps, rounds_completed } = row;
            setProgress({
              current_step,
              finished_at,
              dnf_partial_reps,
              rounds_completed: typeof rounds_completed === 'number' ? rounds_completed : 0,
            });
          }
        }
      )
      .subscribe();

    // fallback poll (20s)
    const poll = setInterval(fetchOnce, 20000);

    return () => {
      supabase.removeChannel(ch);
      clearInterval(poll);
    };
  }, [classId, userId, enabled, fetchOnce]);

  return { progress, userId, refresh: fetchOnce, setProgress };
}
