import * as React from 'react';
import axios from 'axios';
import config from '../config';
import { getToken, getUser } from '../utils/authStorage';
import { supabase } from '../lib/supabase';

type Progress = {
  current_step: number;
  finished_at: string | null;
  finished_at_s?: number | null;
  dnf_partial_reps: number;
  rounds_completed: number;
};

export function useMyProgress(classId?: number, refreshSignal: number = 0) {
  const [prog, setProg] = React.useState<Progress>({
    current_step: 0,
    finished_at: null,
    finished_at_s: null,
    dnf_partial_reps: 0,
    rounds_completed: 0,
  });

  React.useEffect(() => {
    if (!classId) return;
    let stop = false;

    const fetchOnce = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const r = await axios.get(`${config.BASE_URL}/live/${classId}/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!stop) setProg(r.data);
      } catch {}
    };

    const subRealtime = async () => {
      const me = await getUser();
      const userId = me?.userId;
      if (!userId) return;

      const ch = supabase.channel(`me-${classId}-${userId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'live_progress',
          filter: `class_id=eq.${classId},user_id=eq.${userId}`
        }, payload => {
          if (stop) return;
          if (payload?.new) {
            const n = payload.new as any;
            setProg({
              current_step: Number(n.current_step ?? 0),
              finished_at: n.finished_at ?? null,
              finished_at_s: n.finished_at ? Math.floor(new Date(n.finished_at).getTime() / 1000) : null,
              dnf_partial_reps: Number(n.dnf_partial_reps ?? 0),
              rounds_completed: Number(n.rounds_completed ?? 0),
            });
          } else {
            fetchOnce();
          }
        })
        .subscribe();
      return ch;
    };

    let chRef: any;
    (async () => { chRef = await subRealtime(); })();

    // slow fallback poll (2s) so UI never feels stuck on free tier
    const poll = setInterval(fetchOnce, 2000);

    fetchOnce();
    return () => { stop = true; if (chRef) supabase.removeChannel(chRef); clearInterval(poll); };
  }, [classId, refreshSignal]);

  return prog;
}
