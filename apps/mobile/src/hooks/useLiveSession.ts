import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type SessionRow = {
  class_id: number;
  status: 'ready'|'live'|'paused'|'ended';
  started_at: string | null;
  ended_at: string | null;
  time_cap_seconds: number;
  workout_type: 'FOR_TIME'|'AMRAP'|'EMOM'|'TABATA';
  steps: Array<{ index:number; name:string; reps?:number; duration?:number; round:number; subround:number }>;
};


export function useLiveSession(classId: number) {
  const [session, setSession] = useState<SessionRow | null>(null);

  useEffect(() => {
    let poll: any;

    const fetchOnce = async () => {
      const { data, error } = await supabase
        .from('class_sessions')
        .select('*')
        .eq('class_id', classId)
        .maybeSingle();
      if (!error && data) setSession(data as SessionRow);
    };

    // initial
    fetchOnce();

    // realtime
    const ch = supabase.channel(`session-${classId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'class_sessions', filter: `class_id=eq.${classId}` },
        (payload) => setSession(payload.new as SessionRow)
      )
      .subscribe();

    // polling fallback (keeps UI moving if realtime misses)
    poll = setInterval(fetchOnce, 1500);

    return () => {
      supabase.removeChannel(ch);
      clearInterval(poll);
    };
  }, [classId]);

  return session;
}
