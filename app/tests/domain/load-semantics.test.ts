import { describe, expect, it } from 'vitest';
import { isLoadHistoryComparable, nextLoadKg } from '../../src/domain/load-semantics';

describe('load-semantics', () => {
  it('détecte un écart > 30 % vs médiane', () => {
    expect(isLoadHistoryComparable([50, 50, 25])).toBe(false);
    expect(isLoadHistoryComparable([65, 65, 60])).toBe(true);
  });

  it('inverse le sens pour assistance', () => {
    expect(nextLoadKg(20, 2.5, 'assistance', 'up')).toBe(17.5);
    expect(nextLoadKg(20, 2.5, 'external_weight', 'up')).toBe(22.5);
  });
});
