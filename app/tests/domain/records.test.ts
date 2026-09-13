import { describe, expect, it } from 'vitest';
import { detectPrKinds, MIN_PRIOR_COMPLETED_SESSIONS_FOR_PR } from '../../src/domain/records';

const ctxOk = { priorCompletedSessionCount: MIN_PRIOR_COMPLETED_SESSIONS_FOR_PR };
const history = [
  { weightKg: 80, reps: 10, e1rm: 106.6, isWarmup: false },
  { weightKg: 82.5, reps: 8, e1rm: 104.5, isWarmup: false },
];

describe('detectPrKinds v2 (RG-16)', () => {
  it('refuse sous le seuil de séances', () => {
    expect(
      detectPrKinds({ weightKg: 100, reps: 10, e1rm: 130, isWarmup: false }, history, {
        priorCompletedSessionCount: 1,
      }),
    ).toEqual([]);
  });

  it('detecte un PR de charge au-dessus du seuil', () => {
    const kinds = detectPrKinds(
      { weightKg: 85, reps: 8, e1rm: 107.6, isWarmup: false },
      history,
      ctxOk,
    );
    expect(kinds).toContain('weight');
  });

  it('detecte un PR de volume', () => {
    const kinds = detectPrKinds(
      { weightKg: 80, reps: 12, e1rm: null, isWarmup: false },
      history,
      { ...ctxOk, unilateral: false },
    );
    expect(kinds).toContain('volume');
  });

  it('ignore les series d\'echauffement', () => {
    const kinds = detectPrKinds(
      { weightKg: 90, reps: 10, e1rm: 120, isWarmup: true },
      history,
      ctxOk,
    );
    expect(kinds).toEqual([]);
  });

  it('exige au moins 1 repetition', () => {
    const kinds = detectPrKinds(
      { weightKg: 90, reps: 0, e1rm: null, isWarmup: false },
      history,
      ctxOk,
    );
    expect(kinds).toEqual([]);
  });

  it('ne detecte rien si aucune amelioration', () => {
    const kinds = detectPrKinds(
      { weightKg: 75, reps: 8, e1rm: 95, isWarmup: false },
      history,
      ctxOk,
    );
    expect(kinds).toEqual([]);
  });

  it('historique vide sous seuil → pas de PR', () => {
    const kinds = detectPrKinds(
      { weightKg: 20, reps: 10, e1rm: 26.6, isWarmup: false },
      [],
      { priorCompletedSessionCount: 0 },
    );
    expect(kinds).toEqual([]);
  });
});
