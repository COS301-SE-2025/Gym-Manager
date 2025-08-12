// src/hooks/useLeaderboard.ts
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import config from '../config';
import { getToken } from '../utils/authStorage';

type LbRow = {
  class_id: number;
  user_id: number;
  finished: boolean;
  elapsed_seconds: number | null;
  total_reps: number | null;
  sort_bucket: number;
  sort_key: number;
};

function fmtTime(totalSeconds: number) {
  const total = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function useLeaderboard(classId: number) {
  const [rows, setRows] = useState<any[]>([]);

  const refresh = useCallback(async () => {
    const token = await getToken();
    const { data } = await axios.get<LbRow[]>(
      `${config.BASE_URL}/live/${classId}/leaderboard`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const mapped = (data ?? []).map(r => ({
      ...r,
      display_score: r.finished
        ? fmtTime(Number(r.elapsed_seconds ?? 0))
        : `${Number(r.total_reps ?? 0)} reps`,
    }));
    setRows(mapped);
  }, [classId]);

  useEffect(() => {
    let id: any;
    refresh();
    id = setInterval(refresh, 1500);
    return () => clearInterval(id);
  }, [refresh]);

  return { rows, refresh };
}
