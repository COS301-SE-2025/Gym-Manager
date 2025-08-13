import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type SessionRow = {
  class_id: number;
  status: 'ready'|'live'|'paused'|'ended';
  started_at: string | null;
  ended_at: string | null;
  time_cap_seconds: number;
  steps: Array<{ index:number; name:string; reps?:number; duration?:number; round:number; subround:number }>;
};

export function useLiveSession(classId: number) {
  const [session, setSession] = useState<SessionRow | null>(null);

  useEffect(() => {
    supabase.from('class_sessions').select('*').eq('class_id', classId).maybeSingle()
      .then(({ data }) => data && setSession(data as SessionRow));

    const ch = supabase.channel(`session-${classId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'class_sessions', filter: `class_id=eq.${classId}` },
        (payload) => setSession(payload.new as SessionRow)
      )
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [classId]);

  return session;
}
