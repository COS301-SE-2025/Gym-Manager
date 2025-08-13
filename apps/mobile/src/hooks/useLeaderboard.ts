import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type LbRow = {
  class_id: number; user_id: number;
  finished: boolean; final_time_seconds: number | null;
  total_reps: number; display_score: string;
  sort_key: number;
};

export function useLeaderboard(classId: number) {
  const [rows, setRows] = useState<LbRow[]>([]);

  const refresh = async () => {
    const { data } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('class_id', classId)
      .order('sort_key', { ascending: true });
    setRows((data ?? []) as LbRow[]);
  };

  useEffect(() => {
    refresh();
    const ch = supabase.channel(`lb-${classId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'leaderboard', filter: `class_id=eq.${classId}` },
        () => { refresh(); }
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [classId]);

  return rows;
}
