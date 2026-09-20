import { describe, expect, it } from 'vitest';
import {
  evaluateCoach,
  evaluateExerciseProgression,
  type CoachContext,
  type CoachExercise,
} from '../../src/domain/coach';

const base = {
  exerciseId: 'ex',
  name: 'Exo',
  incrementKg: 5,
  loadSemantics: 'external_weight' as const,
  minReps: 10,
  maxReps: 12,
  targetRirMin: 1,
  targetRirMax: 2,
  recentPainHigh: false,
  phase: 'progression' as const,
};

function exercise(overrides: Partial<CoachExercise> = {}): CoachExercise {
  return {
    exerciseId: 'press',
    name: 'Presse',
    incrementKg: 5,
    sessions: [
      {
        date: '2026-09-01',
        maxWeightKg: 100,
        maxE1rm: 130,
        workSetReps: [12, 12, 12],
        repsTarget: 12,
        setsTarget: 3,
        averageRir: 2,
      },
      {
        date: '2026-09-08',
        maxWeightKg: 100,
        maxE1rm: 132,
        workSetReps: [12, 12, 12],
        repsTarget: 12,
        setsTarget: 3,
        averageRir: 2,
      },
    ],
    ...overrides,
  };
}

function context(overrides: Partial<CoachContext> = {}): CoachContext {
  return {
    phase: 'progression',
    phaseChanged: false,
    exercises: [exercise()],
    muscleVolumes: [],
    recentFatigueLevels: [],
    recentPainLevels: [],
    ...overrides,
  };
}

describe('evaluateExerciseProgression', () => {
  it('Smith 65×12 @ RIR 0 → hold ou decrease, jamais increase', () => {
    const r = evaluateExerciseProgression({
      ...base,
      name: 'Smith squat',
      sessions: [
        {
          date: '2026-09-16',
          maxWeightKg: 65,
          maxE1rm: null,
          workSets: [
            { reps: 12, rir: 0, weightKg: 65 },
            { reps: 10, rir: 0, weightKg: 65 },
          ],
          repsTarget: 12,
          setsTarget: 2,
        },
      ],
    });
    expect(r.status).not.toBe('increase');
    expect(['hold', 'decrease']).toContain(r.status);
  });

  it('Leg curl 60×15 @ RIR 3 → repeat sur 1 bonne séance', () => {
    const one = evaluateExerciseProgression({
      ...base,
      maxReps: 15,
      minReps: 12,
      sessions: [
        {
          date: '2026-09-14',
          maxWeightKg: 60,
          maxE1rm: null,
          workSets: [
            { reps: 15, rir: 3, weightKg: 60 },
            { reps: 15, rir: 3, weightKg: 60 },
            { reps: 15, rir: 3, weightKg: 60 },
          ],
          repsTarget: 15,
          setsTarget: 3,
        },
      ],
    });
    expect(one.status).toBe('repeat');
  });

  it('Leg press 190×13 @ RIR 1 → hold', () => {
    const r = evaluateExerciseProgression({
      ...base,
      maxReps: 15,
      minReps: 12,
      incrementKg: 10,
      sessions: [
        {
          date: '2026-09-14',
          maxWeightKg: 190,
          maxE1rm: null,
          workSets: [{ reps: 13, rir: 1, weightKg: 190 }],
          repsTarget: 12,
          setsTarget: 1,
        },
      ],
    });
    expect(r.status).toBe('hold');
  });

  it('Face pull 50→25 → watch', () => {
    const r = evaluateExerciseProgression({
      ...base,
      sessions: [
        {
          date: '2026-09-01',
          maxWeightKg: 50,
          maxE1rm: null,
          workSets: [{ reps: 12, rir: 2, weightKg: 50 }],
          repsTarget: 12,
          setsTarget: 1,
        },
        {
          date: '2026-09-08',
          maxWeightKg: 50,
          maxE1rm: null,
          workSets: [{ reps: 12, rir: 2, weightKg: 50 }],
          repsTarget: 12,
          setsTarget: 1,
        },
        {
          date: '2026-09-18',
          maxWeightKg: 25,
          maxE1rm: null,
          workSets: [{ reps: 12, rir: 1, weightKg: 25 }],
          repsTarget: 12,
          setsTarget: 1,
        },
      ],
    });
    expect(r.status).toBe('watch');
    expect(r.comparableHistory).toBe(false);
    expect(r.confidence).toBe('low');
  });

  it('douleur élevée → watch', () => {
    const r = evaluateExerciseProgression({
      ...base,
      recentPainHigh: true,
      sessions: [
        {
          date: '2026-09-14',
          maxWeightKg: 100,
          maxE1rm: null,
          workSets: [{ reps: 12, rir: 2, weightKg: 100 }],
          repsTarget: 12,
          setsTarget: 1,
        },
      ],
    });
    expect(r.status).toBe('watch');
  });

  it('C-07 bloque hausse > 10 % / 4 semaines', () => {
    const good = (date: string, w: number) => ({
      date,
      maxWeightKg: w,
      maxE1rm: null as number | null,
      workSets: [{ reps: 12, rir: 2, weightKg: w }],
      repsTarget: 12,
      setsTarget: 1,
    });
    const r = evaluateExerciseProgression({
      ...base,
      sessions: [good('2026-08-15', 90), good('2026-09-01', 100), good('2026-09-08', 100)],
    });
    expect(r.blocked || r.suggestedLoadKg == null || r.ruleId === 'C-07').toBe(true);
  });
});

describe('evaluateCoach (globales + compat)', () => {
  it('propose un incrément après deux bonnes séances', () => {
    const suggestion = evaluateCoach(context()).find((item) => item.ruleId === 'C-01');
    expect(suggestion?.action).toBe('increase');
    expect(suggestion?.suggestedWeightKg).toBe(105);
  });

  it('ne valide pas une séance avec des séries prescrites manquantes', () => {
    const ex = exercise({
      sessions: [
        {
          date: '2026-09-01',
          maxWeightKg: 100,
          maxE1rm: 130,
          workSetReps: [12],
          repsTarget: 12,
          setsTarget: 3,
          averageRir: 2,
        },
        {
          date: '2026-09-08',
          maxWeightKg: 100,
          maxE1rm: 132,
          workSetReps: [12],
          repsTarget: 12,
          setsTarget: 3,
          averageRir: 2,
        },
      ],
    });
    expect(evaluateCoach(context({ exercises: [ex] })).some((item) => item.ruleId === 'C-01')).toBe(
      false,
    );
  });

  it('C-04 propose un deload quand la douleur est élevée', () => {
    expect(evaluateCoach(context({ recentPainLevels: [6] })).some((item) => item.ruleId === 'C-04')).toBe(
      true,
    );
  });

  it('C-06 signale deux semaines sous 8 séries', () => {
    const suggestions = evaluateCoach(
      context({
        muscleVolumes: [
          { muscle: 'pectoraux', currentWeekSets: 6, previousWeekSets: 7, fourWeekAverageSets: 7 },
        ],
      }),
    );
    expect(suggestions.some((item) => item.ruleId === 'C-06')).toBe(true);
  });

  it('ignore une séance deload dans les règles de progression', () => {
    const ex = exercise({
      sessions: [
        {
          date: '2026-09-01',
          maxWeightKg: 100,
          maxE1rm: 130,
          workSetReps: [12, 12, 12],
          repsTarget: 12,
          setsTarget: 3,
          averageRir: 2,
        },
        {
          date: '2026-09-08',
          maxWeightKg: 60,
          maxE1rm: 80,
          workSetReps: [8, 8],
          repsTarget: 12,
          setsTarget: 3,
          averageRir: 4,
          isDeload: true,
        },
        {
          date: '2026-09-15',
          maxWeightKg: 100,
          maxE1rm: 132,
          workSetReps: [12, 12, 12],
          repsTarget: 12,
          setsTarget: 3,
          averageRir: 2,
        },
      ],
    });
    expect(evaluateCoach(context({ exercises: [ex] })).some((item) => item.ruleId === 'C-01')).toBe(
      true,
    );
  });
});
