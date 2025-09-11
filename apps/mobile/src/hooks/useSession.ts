import * as React from 'react';
import apiClient from '../utils/apiClient';
import { supabase } from '../lib/supabase';

export function useSession(classId?: number) {
  const [sess, setSess] = React.useState<any | null>(null);

  React.useEffect(() => {
    if (!classId) return;
    let canceled = false;

    const initial = async () => {
      try {
        const r = await apiClient.get(`/live/${classId}/session`);
        if (!canceled) setSess(r.data);
      } catch (err: any) {
        console.error('Failed to fetch session:', err);
      }
    };

    // realtime updates from Postgres
    const ch = supabase.channel(`sess-${classId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_sessions', filter: `class_id=eq.${classId}` }, payload => {
        if (payload?.new && !canceled) setSess(payload.new);
      })
      .subscribe();

    // very light fallback poll (every 5s) in case realtime lags
    const poll = setInterval(initial, 3000);

    initial();
    return () => { canceled = true; supabase.removeChannel(ch); clearInterval(poll); };
  }, [classId]);

  return sess;
}
