import { describe, expect, it } from 'vitest';
import {
  computeWorkoutTonnage,
  isImplausibleDuration,
  setCountsTowardTonnage,
  workoutDurationSec,
  MIN_PLAUSIBLE_DURATION_SEC,
  MAX_PLAUSIBLE_DURATION_SEC,
} from '../../src/domain/tonnage';

describe('setCountsTowardTonnage', () => {
  it('exclut warmup, soft-delete, reps < 1, weight null', () => {
    expect(setCountsTowardTonnage({ weightKg: 100, reps: 10, isWarmup: true })).toBe(false);
    expect(setCountsTowardTonnage({ weightKg: 100, reps: 10, isWarmup: false, deletedAt: 'x' })).toBe(false);
    expect(setCountsTowardTonnage({ weightKg: 100, reps: 0, isWarmup: false })).toBe(false);
    expect(setCountsTowardTonnage({ weightKg: null, reps: 10, isWarmup: false })).toBe(false);
    expect(setCountsTowardTonnage({ weightKg: 100, reps: 10, isWarmup: false })).toBe(true);
  });
});

describe('computeWorkoutTonnage', () => {
  it('somme weight×reps et double si unilatéral', () => {
    const unilateral = new Map([
      ['ex-bi', false],
      ['ex-uni', true],
    ]);
    const kg = computeWorkoutTonnage(
      [
        { exerciseId: 'ex-bi', weightKg: 100, reps: 10, isWarmup: false },
        { exerciseId: 'ex-uni', weightKg: 20, reps: 8, isWarmup: false },
        { exerciseId: 'ex-bi', weightKg: 50, reps: 10, isWarmup: true },
      ],
      unilateral,
    );
    expect(kg).toBe(100 * 10 + 20 * 8 * 2);
  });

  it('multiplier 1 si exercice absent de la map', () => {
    expect(
      computeWorkoutTonnage(
        [{ exerciseId: 'unknown', weightKg: 50, reps: 5, isWarmup: false }],
        new Map(),
      ),
    ).toBe(250);
  });
});

describe('duration helpers', () => {
  it('workoutDurationSec retourne null si bornes manquantes', () => {
    expect(workoutDurationSec(null, '2026-09-13T10:00:00.000Z')).toBeNull();
    expect(workoutDurationSec('2026-09-13T10:00:00.000Z', null)).toBeNull();
  });

  it('workoutDurationSec calcule la différence en secondes', () => {
    expect(workoutDurationSec('2026-09-13T10:00:00.000Z', '2026-09-13T11:30:00.000Z')).toBe(90 * 60);
  });

  it('isImplausibleDuration hors [15min, 3h]', () => {
    expect(isImplausibleDuration(MIN_PLAUSIBLE_DURATION_SEC - 1)).toBe(true);
    expect(isImplausibleDuration(MIN_PLAUSIBLE_DURATION_SEC)).toBe(false);
    expect(isImplausibleDuration(MAX_PLAUSIBLE_DURATION_SEC)).toBe(false);
    expect(isImplausibleDuration(MAX_PLAUSIBLE_DURATION_SEC + 1)).toBe(true);
  });
});
