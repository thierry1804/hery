export const MIN_PLAUSIBLE_DURATION_SEC = 15 * 60;
export const MAX_PLAUSIBLE_DURATION_SEC = 3 * 60 * 60;

export function setCountsTowardTonnage(set: {
  weightKg: number | null;
  reps: number | null;
  isWarmup: boolean;
  deletedAt?: string | null;
}): boolean {
  if (set.isWarmup) return false;
  if (set.deletedAt != null) return false;
  if (set.weightKg == null) return false;
  if (set.reps == null || set.reps < 1) return false;
  return true;
}

export function computeWorkoutTonnage(
  sets: Array<{
    weightKg: number | null;
    reps: number | null;
    isWarmup: boolean;
    deletedAt?: string | null;
    exerciseId: string;
  }>,
  unilateralByExerciseId: Map<string, boolean>,
): number {
  let total = 0;
  for (const set of sets) {
    if (!setCountsTowardTonnage(set)) continue;
    const multiplier = unilateralByExerciseId.get(set.exerciseId) ? 2 : 1;
    total += (set.weightKg as number) * (set.reps as number) * multiplier;
  }
  return total;
}

export function workoutDurationSec(startedAt: string | null, endedAt: string | null): number | null {
  if (startedAt == null || endedAt == null) return null;
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.round(ms / 1000);
}

export function isImplausibleDuration(durationSec: number): boolean {
  return durationSec < MIN_PLAUSIBLE_DURATION_SEC || durationSec > MAX_PLAUSIBLE_DURATION_SEC;
}
