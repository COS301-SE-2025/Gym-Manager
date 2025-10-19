import { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';
import { getToken } from '../utils/authStorage';

type WorkoutStep = {
  round?: number;
  subround?: number;
  title?: string;
  quantityType?: string;
  quantity?: number;
  notes?: string;
};

interface UseWorkoutStepsResult {
  steps: WorkoutStep[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useWorkoutSteps(workoutId: number | null): UseWorkoutStepsResult {
  const [steps, setSteps] = useState<WorkoutStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkoutSteps = async () => {
    if (!workoutId) {
      setSteps([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Missing token');

      const { data } = await axios.get(`${config.BASE_URL}/workout/${workoutId}/steps`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // API returns { steps: FlatStep[] } like member Overview
      const arr = Array.isArray(data?.steps) ? data.steps : Array.isArray(data) ? data : [];
      const normalized: WorkoutStep[] = arr.map((d: any) => ({
        round: d.round ?? d.roundNumber ?? undefined,
        subround: d.subround ?? d.subroundNumber ?? undefined,
        title: d.name ?? d.title ?? d.exerciseName ?? 'Step',
        // handle both reps/duration shapes
        quantityType:
          d.reps != null ? 'reps' : d.duration != null ? 'sec' : (d.quantityType ?? undefined),
        quantity: d.reps ?? d.duration ?? d.quantity ?? undefined,
        notes: d.notes,
      }));

      setSteps(normalized);
    } catch (e: any) {
      console.error('useWorkoutSteps error:', e);
      setError('Failed to load workout details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkoutSteps();
  }, [workoutId]);

  const refetch = () => {
    loadWorkoutSteps();
  };

  return {
    steps,
    loading,
    error,
    refetch,
  };
}
