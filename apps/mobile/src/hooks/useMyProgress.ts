import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getUser } from '../utils/authStorage';

export type MyProgress = { current_step: number; finished_at: string | null; dnf_partial_reps: number };

export function useMyProgress(classId: number) {
  const [progress, setProgress] = useState<MyProgress>({ current_step: 0, finished_at: null, dnf_partial_reps: 0 });
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => { getUser().then(u => setUserId(u?.userId ?? null)); }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchOnce = async () => {
      const { data } = await supabase
        .from('live_progress')
        .select('current_step, finished_at, dnf_partial_reps')
        .eq('class_id', classId).eq('user_id', userId).maybeSingle();
      if (data) setProgress(data as any);
    };
    fetchOnce();

    const ch = supabase.channel(`me-${classId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'live_progress', filter: `class_id=eq.${classId}` },
        (payload) => {
          if ((payload.new as any)?.user_id === userId) {
            const { current_step, finished_at, dnf_partial_reps } = payload.new as any;
            setProgress({ current_step, finished_at, dnf_partial_reps });
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [classId, userId]);

  return { progress, userId };
}
