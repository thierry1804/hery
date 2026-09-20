import { describe, expect, it } from 'vitest';
import { midSetHint } from '../../src/domain/coach-midset';

describe('midSetHint', () => {
  it('RIR 0 → ne pas monter', () => {
    expect(midSetHint({ rir: 0, reps: 12, maxReps: 12, setKind: 'work' })).toMatch(/Ne monte pas/i);
  });
  it('RIR 3 + reps hautes → série facile', () => {
    expect(midSetHint({ rir: 3, reps: 15, maxReps: 12, setKind: 'work' })).toMatch(/facile/i);
  });
  it('warmup → null', () => {
    expect(midSetHint({ rir: 0, reps: 12, maxReps: 12, setKind: 'warmup' })).toBeNull();
  });
});
