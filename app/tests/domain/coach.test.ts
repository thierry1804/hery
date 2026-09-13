import { describe, expect, it } from 'vitest';
import { evaluateCoach, type CoachContext, type CoachExercise } from '../../src/domain/coach';

function exercise(overrides: Partial<CoachExercise> = {}): CoachExercise {
  return {
    exerciseId: 'press',
    name: 'Presse',
    incrementKg: 5,
    sessions: [
      { date: '2026-09-01', maxWeightKg: 100, maxE1rm: 130, workSetReps: [12, 12, 12], repsTarget: 12, setsTarget: 3, averageRir: 2 },
      { date: '2026-09-08', maxWeightKg: 100, maxE1rm: 132, workSetReps: [12, 12, 12], repsTarget: 12, setsTarget: 3, averageRir: 2 },
    ],
    ...overrides,
  };
}

function context(overrides: Partial<CoachContext> = {}): CoachContext {
  return { phase: 'progression', phaseChanged: false, exercises: [exercise()], muscleVolumes: [], recentFatigueLevels: [], recentPainLevels: [], ...overrides };
}

describe('coach déterministe', () => {
  it('C-01 propose un incrément après deux objectifs atteints', () => {
    const suggestion = evaluateCoach(context()).find((item) => item.ruleId === 'C-01');
    expect(suggestion?.suggestedWeightKg).toBe(105);
  });

  it('C-01 ne valide pas une séance avec des séries prescrites manquantes', () => {
    const ex = exercise({ sessions: [
      { date: '2026-09-01', maxWeightKg: 100, maxE1rm: 130, workSetReps: [12], repsTarget: 12, setsTarget: 3, averageRir: 2 },
      { date: '2026-09-08', maxWeightKg: 100, maxE1rm: 132, workSetReps: [12], repsTarget: 12, setsTarget: 3, averageRir: 2 },
    ] });
    expect(evaluateCoach(context({ exercises: [ex] })).some((item) => item.ruleId === 'C-01')).toBe(false);
  });

  it('C-07 bloque une hausse cumulée supérieure à 10 %', () => {
    const ex = exercise({ sessions: [
      { date: '2026-08-15', maxWeightKg: 90, maxE1rm: 120, workSetReps: [12], repsTarget: 12, setsTarget: 1, averageRir: 2 },
      { date: '2026-09-01', maxWeightKg: 100, maxE1rm: 130, workSetReps: [12], repsTarget: 12, setsTarget: 1, averageRir: 2 },
      { date: '2026-09-08', maxWeightKg: 100, maxE1rm: 132, workSetReps: [12], repsTarget: 12, setsTarget: 1, averageRir: 2 },
    ] });
    const suggestion = evaluateCoach(context({ exercises: [ex] })).find((item) => item.exerciseId === 'press');
    expect(suggestion).toMatchObject({ ruleId: 'C-07', blocked: true, suggestedWeightKg: null });
  });

  it('interdit les hausses pendant la réadaptation', () => {
    const suggestion = evaluateCoach(context({ phase: 'readaptation' })).find((item) => item.exerciseId === 'press');
    expect(suggestion?.blocked).toBe(true);
  });

  it('C-02 réduit la charge après deux échecs nets', () => {
    const ex = exercise({ sessions: [
      { date: '2026-09-01', maxWeightKg: 100, maxE1rm: 120, workSetReps: [8, 8], repsTarget: 12, setsTarget: 2, averageRir: 0 },
      { date: '2026-09-08', maxWeightKg: 100, maxE1rm: 119, workSetReps: [9, 8], repsTarget: 12, setsTarget: 2, averageRir: 0 },
    ] });
    expect(evaluateCoach(context({ exercises: [ex] })).find((item) => item.ruleId === 'C-02')?.suggestedWeightKg).toBe(95);
  });

  it('C-03 détecte trois e1RM stables', () => {
    const ex = exercise({ sessions: [
      { date: '2026-08-25', maxWeightKg: 100, maxE1rm: 130, workSetReps: [10], repsTarget: 12, setsTarget: 1, averageRir: 2 },
      { date: '2026-09-01', maxWeightKg: 100, maxE1rm: 131, workSetReps: [10], repsTarget: 12, setsTarget: 1, averageRir: 2 },
      { date: '2026-09-08', maxWeightKg: 100, maxE1rm: 130, workSetReps: [10], repsTarget: 12, setsTarget: 1, averageRir: 2 },
    ] });
    expect(evaluateCoach(context({ exercises: [ex] })).some((item) => item.ruleId === 'C-03')).toBe(true);
  });

  it('C-04 propose un deload quand la douleur est élevée', () => {
    expect(evaluateCoach(context({ recentPainLevels: [6] })).some((item) => item.ruleId === 'C-04')).toBe(true);
  });

  it('ignore une séance deload dans les règles de progression', () => {
    const ex = exercise({ sessions: [
      { date: '2026-09-01', maxWeightKg: 100, maxE1rm: 130, workSetReps: [12, 12, 12], repsTarget: 12, setsTarget: 3, averageRir: 2 },
      { date: '2026-09-08', maxWeightKg: 60, maxE1rm: 80, workSetReps: [8, 8], repsTarget: 12, setsTarget: 3, averageRir: 4, isDeload: true },
      { date: '2026-09-15', maxWeightKg: 100, maxE1rm: 132, workSetReps: [12, 12, 12], repsTarget: 12, setsTarget: 3, averageRir: 2 },
    ] });
    expect(evaluateCoach(context({ exercises: [ex] })).some((item) => item.ruleId === 'C-01')).toBe(true);
  });

  it('C-06 signale deux semaines sous 8 séries', () => {
    const suggestions = evaluateCoach(context({ muscleVolumes: [{ muscle: 'pectoraux', currentWeekSets: 6, previousWeekSets: 7, fourWeekAverageSets: 7 }] }));
    expect(suggestions.some((item) => item.ruleId === 'C-06')).toBe(true);
  });
});
