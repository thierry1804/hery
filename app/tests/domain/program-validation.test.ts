import { describe, expect, it } from 'vitest';
import { validateDayOfWeek, validateItemPatch } from '../../src/domain/program-validation';

describe('validateDayOfWeek', () => {
  it('accepts 1..7', () => {
    expect(validateDayOfWeek(1).ok).toBe(true);
    expect(validateDayOfWeek(7).ok).toBe(true);
  });
  it('rejects 0 and 8', () => {
    expect(validateDayOfWeek(0).ok).toBe(false);
    expect(validateDayOfWeek(8).ok).toBe(false);
  });
});

describe('validateItemPatch', () => {
  it('accepts strength with sets and repsTarget', () => {
    expect(
      validateItemPatch({
        kind: 'strength',
        sets: 3,
        repsTarget: 10,
        repsRangeMin: null,
        repsRangeMax: null,
        durationSec: null,
        restSec: 90,
      }).ok,
    ).toBe(true);
  });
  it('rejects strength without sets', () => {
    expect(
      validateItemPatch({
        kind: 'strength',
        sets: null,
        repsTarget: 10,
        repsRangeMin: null,
        repsRangeMax: null,
        durationSec: null,
        restSec: 60,
      }).ok,
    ).toBe(false);
  });
  it('accepts core with sets and duration', () => {
    expect(
      validateItemPatch({
        kind: 'core',
        sets: 3,
        repsTarget: null,
        repsRangeMin: null,
        repsRangeMax: null,
        durationSec: 45,
        restSec: 30,
      }).ok,
    ).toBe(true);
  });
  it('rejects core without repetitions or duration', () => {
    expect(
      validateItemPatch({
        kind: 'core',
        sets: 3,
        repsTarget: null,
        repsRangeMin: null,
        repsRangeMax: null,
        durationSec: null,
        restSec: 30,
      }).ok,
    ).toBe(false);
  });
  it('rejects negative rest', () => {
    expect(
      validateItemPatch({
        kind: 'strength',
        sets: 3,
        repsTarget: 10,
        repsRangeMin: null,
        repsRangeMax: null,
        durationSec: null,
        restSec: -1,
      }).ok,
    ).toBe(false);
  });
  it('requires duration for cardio', () => {
    expect(
      validateItemPatch({
        kind: 'cardio',
        sets: null,
        repsTarget: null,
        repsRangeMin: null,
        repsRangeMax: null,
        durationSec: null,
        restSec: 0,
      }).ok,
    ).toBe(false);
  });
});
