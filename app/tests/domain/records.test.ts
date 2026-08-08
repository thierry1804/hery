import { describe, expect, it } from 'vitest';
import { detectPrKinds } from '../../src/domain/records';

describe('detectPrKinds (RG-16)', () => {
  const history = [
    { weightKg: 80, reps: 10, e1rm: 106.6, isWarmup: false },
    { weightKg: 82.5, reps: 8, e1rm: 104.5, isWarmup: false },
  ];

  it('detecte un PR de charge', () => {
    const kinds = detectPrKinds({ weightKg: 85, reps: 8, e1rm: 107.6, isWarmup: false }, history);
    expect(kinds).toContain('weight');
  });

  it('ignore les series d\'echauffement', () => {
    const kinds = detectPrKinds({ weightKg: 90, reps: 10, e1rm: 120, isWarmup: true }, history);
    expect(kinds).toEqual([]);
  });

  it('exige au moins 1 repetition', () => {
    const kinds = detectPrKinds({ weightKg: 90, reps: 0, e1rm: null, isWarmup: false }, history);
    expect(kinds).toEqual([]);
  });

  it('ne detecte rien si aucune amelioration', () => {
    const kinds = detectPrKinds({ weightKg: 75, reps: 8, e1rm: 95, isWarmup: false }, history);
    expect(kinds).toEqual([]);
  });

  it('premiere serie jamais loguee est toujours un record', () => {
    const kinds = detectPrKinds({ weightKg: 20, reps: 10, e1rm: 26.6, isWarmup: false }, []);
    expect(kinds.length).toBeGreaterThan(0);
  });
});
