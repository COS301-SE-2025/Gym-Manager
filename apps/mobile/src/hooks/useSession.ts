import * as React from 'react';
import axios from 'axios';
import config from '../config';
import { getToken } from '../utils/authStorage';
import { supabase } from '../lib/supabase';

export function useSession(classId?: number) {
  const [sess, setSess] = React.useState<any | null>(null);

  React.useEffect(() => {
    if (!classId) return;
    let canceled = false;

    const initial = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const r = await axios.get(`${config.BASE_URL}/live/${classId}/session`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!canceled) setSess(r.data);
      } catch {}
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
