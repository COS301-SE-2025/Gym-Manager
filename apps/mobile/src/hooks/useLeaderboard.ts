import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import config from '../config';
import { getToken } from '../utils/authStorage';
import { supabase } from '../lib/supabase';

type LbRow = {
  class_id: number;
  user_id: number;
  finished: boolean;
  elapsed_seconds: number | null;
  total_reps: number | null;
  sort_bucket: number;
  sort_key: number;
  completed_minutes?: number | null;  // present for EMOM (and always numeric for interval types, possibly 0)
};

function fmtTime(totalSeconds: number) {
  const total = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// tiny debounce so multiple realtime events trigger a single refresh
function debounce<F extends (...args: any[]) => void>(fn: F, ms: number) {
  let t: any;
  return (...args: Parameters<F>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function useLeaderboard(classId: number, enabled = true) {
  const [rows, setRows] = useState<any[]>([]);

  const refresh = useCallback(async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get<LbRow[]>(
        `${config.BASE_URL}/live/${classId}/leaderboard`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const mapped = (data ?? []).map(r => ({
        ...r,
        // Display: if finished show time, otherwise show total reps
        display_score: r.finished
          ? fmtTime(Number(r.elapsed_seconds ?? 0))
          : `${Number(r.total_reps ?? 0)} reps`,
        // If EMOM, show number of fully completed minutes; hide badge if 0 or undefined
        badge: (typeof r.completed_minutes === 'number' && r.completed_minutes > 0)
          ? `${r.completed_minutes}m ✓`
          : undefined,
      }));
      setRows(mapped);
    } catch {
      // ignore errors; a later realtime tick or fallback poll will recover
      // (e.g., if class not started yet, the request may 404 until then)
    }
  }, [classId]);

  useEffect(() => {
    if (!enabled) return;
    refresh(); // initial fetch
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) return;
    const debounced = debounce(refresh, 250);

    const ch = supabase.channel(`lb-${classId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'class_sessions', filter: `class_id=eq.${classId}` },
        debounced
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'live_progress', filter: `class_id=eq.${classId}` },
        debounced
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'live_interval_scores', filter: `class_id=eq.${classId}` },
        debounced
      )
      .subscribe();

    // slow safety poll (15s) in case realtime misses an update
    const poll = setInterval(() => { if (enabled) refresh(); }, 15000);

    return () => {
      supabase.removeChannel(ch);
      clearInterval(poll);
    };
  }, [classId, enabled, refresh]);

  return { rows, refresh };
}
