// apps/mobile/src/hooks/useLeaderboardRealtime.ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import config from '../config';
import { getToken } from '../utils/authStorage';
import { supabase } from '../lib/supabase';

export type LbFilter = 'ALL' | 'RX' | 'SC';

export type LbRow = {
  user_id: number;
  first_name?: string | null;
  last_name?: string | null;
  finished?: boolean;
  elapsed_seconds?: number | null;
  total_reps?: number | null;
  scaling?: 'RX' | 'SC' | null; // NEW
  // in case backend sends name
  name?: string | null;
};

export function useLeaderboardRealtime(classId: number, filter: LbFilter = 'ALL') {
  const [allRows, setAllRows] = useState<LbRow[]>([]);

  const refresh = useCallback(async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get(`${config.BASE_URL}/live/${classId}/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const rows = Array.isArray(data) ? data : [];
      console.log('Leaderboard data received:', { classId, rowCount: rows.length, rows: rows.slice(0, 3) });
      setAllRows(rows);
    } catch (err) {
      console.log('Leaderboard fetch error:', err);
    }
  }, [classId]);

  useEffect(() => {
    refresh();

    const ch = supabase.channel(`lb-${classId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_sessions', filter: `class_id=eq.${classId}`}, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_progress', filter: `class_id=eq.${classId}`}, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_interval_scores', filter: `class_id=eq.${classId}`}, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classattendance', filter: `class_id=eq.${classId}`}, refresh) // NEW: watch scaling & final scores
      .subscribe();

    const poll = setInterval(refresh, 2500);
    return () => { supabase.removeChannel(ch); clearInterval(poll); };
  }, [classId, refresh]);

  const rows = useMemo(() => {
    if (filter === 'ALL') return allRows;
    return allRows.filter(r => (r.scaling ?? 'RX').toUpperCase() === filter);
  }, [allRows, filter]);

  return rows;
}
