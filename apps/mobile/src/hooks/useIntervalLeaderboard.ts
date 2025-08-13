import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import config from '../config';
import { getToken } from '../utils/authStorage';

type Row = {
  user_id: number;
  total_reps: number;
  display_score: string;
  first_name?: string;
  last_name?: string;
};

export function useIntervalLeaderboard(classId: number) {
  const [rows, setRows] = useState<Row[]>([]);

  const refresh = useCallback(async () => {
    const token = await getToken();
    const { data } = await axios.get<Row[]>(
      `${config.BASE_URL}/live/${classId}/interval/leaderboard`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setRows(data ?? []);
  }, [classId]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 1500);
    return () => clearInterval(id);
  }, [refresh]);

  return { rows, refresh };
}
