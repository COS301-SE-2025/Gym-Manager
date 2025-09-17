import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import config from '../config';
import { getToken } from '../utils/authStorage';
import { supabase } from '../lib/supabase';

export function useLeaderboardRealtime(classId: number) {
  const [rows, setRows] = useState<any[]>([]);

  const refresh = useCallback(async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get(`${config.BASE_URL}/live/${classId}/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRows(data ?? []);
    } catch {}
  }, [classId]);

  useEffect(() => {
    refresh();

    const ch = supabase.channel(`lb-${classId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_sessions', filter: `class_id=eq.${classId}`}, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_progress',  filter: `class_id=eq.${classId}`}, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_interval_scores', filter: `class_id=eq.${classId}`}, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_emom_scores', filter: `class_id=eq.${classId}`}, refresh)
      .subscribe();

    const poll = setInterval(refresh, 2500);
    return () => { supabase.removeChannel(ch); clearInterval(poll); };
  }, [classId, refresh]);

  return rows;
}
