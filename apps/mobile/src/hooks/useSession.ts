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
        const status = err?.response?.status;
        if (status === 404) {
          // No session yet - clear stale state & avoid noisy redbox
          if (!canceled) setSess(null);
        } else {
          console.warn('Failed to fetch session:', err?.message ?? err);
        }
      }
    };

    // Realtime updates from Postgres
    const ch = supabase
      .channel(`sess-${classId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'class_sessions', filter: `class_id=eq.${classId}` },
        (payload) => {
          if (canceled) return;
          if (payload?.new) setSess(payload.new);
          // (If the row were ever deleted, you'd get payload.old; not expected in this flow.)
        }
      )
      .subscribe();

    // Light poll as a fallback
    const poll = setInterval(initial, 2000);

    initial();
    return () => {
      canceled = true;
      supabase.removeChannel(ch);
      clearInterval(poll);
    };
  }, [classId]);

  return sess;
}
