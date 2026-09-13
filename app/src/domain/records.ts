import type { PrKind } from '../db/schema';

export const MIN_PRIOR_COMPLETED_SESSIONS_FOR_PR = 2;

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

export interface DetectPrContext {
  priorCompletedSessionCount: number;
  unilateral?: boolean;
}

export function setVolumeKg(weightKg: number, reps: number, unilateral: boolean): number {
  return weightKg * reps * (unilateral ? 2 : 1);
}

// RG-16: PR uniquement sur serie work, reps >= 1, et >= 2 seances completed anterieures.
export function detectPrKinds(
  candidate: RecordCandidate,
  priorSets: PriorSet[],
  ctx: DetectPrContext,
): PrKind[] {
  if (candidate.isWarmup) return [];
  if (candidate.reps == null || candidate.reps < 1) return [];
  if (ctx.priorCompletedSessionCount < MIN_PRIOR_COMPLETED_SESSIONS_FOR_PR) return [];

  const working = priorSets.filter((s) => !s.isWarmup && s.reps != null && s.reps >= 1);
  const unilateral = ctx.unilateral ?? false;
  const kinds: PrKind[] = [];

  if (candidate.weightKg != null) {
    const maxWeight = Math.max(0, ...working.map((s) => s.weightKg ?? 0));
    if (candidate.weightKg > maxWeight) kinds.push('weight');

    const maxRepsAtWeightOrAbove = Math.max(
      0,
      ...working.filter((s) => (s.weightKg ?? 0) >= (candidate.weightKg ?? 0)).map((s) => s.reps ?? 0),
    );
    if (candidate.reps > maxRepsAtWeightOrAbove) kinds.push('reps');

    const candVol = setVolumeKg(candidate.weightKg, candidate.reps, unilateral);
    const maxVol = Math.max(
      0,
      ...working
        .filter((s) => s.weightKg != null && s.reps != null)
        .map((s) => setVolumeKg(s.weightKg!, s.reps!, unilateral)),
    );
    if (candVol > maxVol) kinds.push('volume');
  }

  if (candidate.e1rm != null) {
    const maxE1rm = Math.max(0, ...working.map((s) => s.e1rm ?? 0));
    if (candidate.e1rm > maxE1rm) kinds.push('e1rm');
  }

  return kinds;
}

export function isPersonalRecord(
  candidate: RecordCandidate,
  priorSets: PriorSet[],
  ctx: DetectPrContext,
): boolean {
  return detectPrKinds(candidate, priorSets, ctx).length > 0;
}
