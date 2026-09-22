import { describe, expect, it } from 'vitest';
import { summarizeSessionAppreciation } from '../../src/domain/session-appreciation';

describe('summarizeSessionAppreciation', () => {
  it('aucune ligne → pas de verdict', () => {
    expect(summarizeSessionAppreciation([])).toBeNull();
  });

  it('douleur (watch) présente → vigilance, priorité sur tout le reste', () => {
    const result = summarizeSessionAppreciation([
      { status: 'increase' },
      { status: 'increase' },
      { status: 'watch' },
    ]);
    expect(result?.tone).toBe('caution');
    expect(result?.headline).toMatch(/surveiller/i);
    expect(result?.advice).toMatch(/1 exercice/);
  });

  it('plus de réductions que d\'augmentations → fatigue dominante', () => {
    const result = summarizeSessionAppreciation([
      { status: 'decrease' },
      { status: 'decrease' },
      { status: 'increase' },
    ]);
    expect(result?.tone).toBe('caution');
    expect(result?.headline).toMatch(/fatigue/i);
    expect(result?.advice).toMatch(/2 exercices/);
  });

  it('au moins une augmentation, pas plus de réductions → progression', () => {
    const result = summarizeSessionAppreciation([
      { status: 'increase' },
      { status: 'hold' },
      { status: 'decrease' },
    ]);
    expect(result?.tone).toBe('positive');
    expect(result?.headline).toMatch(/solide/i);
  });

  it('que du hold/repeat → stable', () => {
    const result = summarizeSessionAppreciation([{ status: 'hold' }, { status: 'repeat' }]);
    expect(result?.tone).toBe('neutral');
    expect(result?.headline).toMatch(/stable/i);
  });
});
