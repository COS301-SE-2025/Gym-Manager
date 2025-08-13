import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type StepRow = {
  index: number;
  name: string;
  reps?: number;
  duration?: number;
  round: number;
  subround: number;
  target_reps?: number;
};
export type SessionRow = {
  class_id: number;
  status: 'ready' | 'live' | 'paused' | 'ended';
  started_at: string | null;
  ended_at: string | null;
  time_cap_seconds: number;
  steps: StepRow[];
  // workout_type might be present if backend stores it, but not guaranteed
};

export function useLiveSession(classId: number, enabled = true) {
  const [session, setSession] = useState<SessionRow | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;

    const fetchOnce = async () => {
      const { data, error } = await supabase
        .from('class_sessions')
        .select('*')
        .eq('class_id', classId)
        .maybeSingle();
      if (!stopped && !error && data) {
        setSession(data as SessionRow);
      }
    };

    fetchOnce();

    const ch = supabase.channel(`session-${classId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'class_sessions', filter: `class_id=eq.${classId}` },
        (payload) => setSession(payload.new as SessionRow)
      )
      .subscribe();

    // fallback poll (20s) in case realtime misses update
    const poll = setInterval(fetchOnce, 20000);

    return () => {
      stopped = true;
      supabase.removeChannel(ch);
      clearInterval(poll);
    };
  }, [classId, enabled]);

  return session;
}
