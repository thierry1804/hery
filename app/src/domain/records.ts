import type { PrKind } from '../db/schema';

export interface RecordCandidate {
  weightKg: number | null;
  reps: number | null;
  e1rm: number | null;
  isWarmup: boolean;
}

export interface PriorSet {
  weightKg: number | null;
  reps: number | null;
  e1rm: number | null;
  isWarmup: boolean;
}

// RG-16: un PR n'est valide que sur une serie non-echauffement d'au moins 1 repetition complete.
export function detectPrKinds(candidate: RecordCandidate, priorSets: PriorSet[]): PrKind[] {
  if (candidate.isWarmup) return [];
  if (candidate.reps == null || candidate.reps < 1) return [];

  const working = priorSets.filter((s) => !s.isWarmup && s.reps != null && s.reps >= 1);
  const kinds: PrKind[] = [];

  if (candidate.weightKg != null) {
    const maxWeight = Math.max(0, ...working.map((s) => s.weightKg ?? 0));
    if (candidate.weightKg > maxWeight) kinds.push('weight');

    const maxRepsAtWeightOrAbove = Math.max(
      0,
      ...working.filter((s) => (s.weightKg ?? 0) >= (candidate.weightKg ?? 0)).map((s) => s.reps ?? 0),
    );
    if (candidate.reps > maxRepsAtWeightOrAbove) kinds.push('reps');
  }

  if (candidate.e1rm != null) {
    const maxE1rm = Math.max(0, ...working.map((s) => s.e1rm ?? 0));
    if (candidate.e1rm > maxE1rm) kinds.push('e1rm');
  }

  return kinds;
}

export function isPersonalRecord(candidate: RecordCandidate, priorSets: PriorSet[]): boolean {
  return detectPrKinds(candidate, priorSets).length > 0;
}
