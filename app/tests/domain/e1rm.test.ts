import { describe, expect, it } from 'vitest';
import { calculateE1rm } from '../../src/domain/e1rm';

describe('calculateE1rm (RG-13, Epley)', () => {
  it('calcule charge x (1 + reps/30)', () => {
    expect(calculateE1rm(80, 12)).toBeCloseTo(80 * (1 + 12 / 30));
  });

  it('retourne null au-dela de 12 repetitions', () => {
    expect(calculateE1rm(80, 13)).toBeNull();
  });

  it('retourne null si charge ou reps sont nuls', () => {
    expect(calculateE1rm(null, 10)).toBeNull();
    expect(calculateE1rm(80, null)).toBeNull();
  });

  it('retourne null si reps < 1', () => {
    expect(calculateE1rm(80, 0)).toBeNull();
  });
});
