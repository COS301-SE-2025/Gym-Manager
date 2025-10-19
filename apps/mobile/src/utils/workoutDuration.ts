// Utility function to calculate workout duration based on workout type and session data
// This mirrors the logic from OverviewScreen to ensure consistency

export function calculateWorkoutDuration(session: any): number {
  if (!session) return 0;

  const workoutType = (session?.workout_type || '').toUpperCase();
  const workoutMetadata = (session as any)?.workout_metadata || {};

  // EMOM: total repeats × 60
  if (workoutType === 'EMOM' && Array.isArray(workoutMetadata.emom_repeats)) {
    const totalRepeats = workoutMetadata.emom_repeats.reduce((sum: number, n: any) => sum + (Number(n) || 0), 0);
    return totalRepeats * 60;
  }

  // TABATA / INTERVAL: sum durations of *every* step
  if (workoutType === 'TABATA' || workoutType === 'INTERVAL') {
    const steps = Array.isArray(session?.steps) ? session.steps : [];
    const sum = steps.reduce((acc: number, s: any) => acc + (Number(s?.duration) || 0), 0);
    if (sum > 0) return sum;
    // fallback
    return Number(workoutMetadata.duration_seconds || 0) ||
           Number(session?.time_cap_seconds || 0);
  }

  // FOR_TIME / AMRAP etc.
  return Number(workoutMetadata.time_limit || 0) * 60 ||
         Number(workoutMetadata.duration_seconds || 0) ||
         Number(session?.time_cap_seconds || 0);
}