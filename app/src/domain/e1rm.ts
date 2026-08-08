// RG-13: e1RM (Epley) = charge x (1 + reps / 30). Non calcule au-dela de 12 reps.
export function calculateE1rm(weightKg: number | null, reps: number | null): number | null {
  if (weightKg == null || reps == null) return null;
  if (reps > 12) return null;
  if (reps < 1) return null;
  return weightKg * (1 + reps / 30);
}
