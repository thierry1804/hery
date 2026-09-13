import type { MuscleGroup, PhaseCode } from '../db/schema';

export type CoachRuleId = 'C-01' | 'C-02' | 'C-03' | 'C-04' | 'C-05' | 'C-06' | 'C-07';
export type CoachAction = 'increase' | 'decrease' | 'deload' | 'vary' | 'inform';

export interface CoachSession {
  date: string;
  maxWeightKg: number;
  maxE1rm: number | null;
  workSetReps: number[];
  repsTarget: number | null;
  setsTarget: number | null;
  averageRir: number | null;
  isDeload?: boolean;
}

export interface CoachExercise {
  exerciseId: string;
  name: string;
  incrementKg: number;
  sessions: CoachSession[];
}

export interface MuscleWeekVolume {
  muscle: MuscleGroup;
  currentWeekSets: number;
  previousWeekSets: number;
  fourWeekAverageSets: number;
}

export interface CoachContext {
  phase: PhaseCode | null;
  phaseChanged: boolean;
  exercises: CoachExercise[];
  muscleVolumes: MuscleWeekVolume[];
  recentFatigueLevels: number[];
  recentPainLevels: number[];
}

export interface CoachSuggestion {
  id: string;
  ruleId: CoachRuleId;
  action: CoachAction;
  exerciseId: string | null;
  title: string;
  explanation: string;
  suggestedWeightKg: number | null;
  blocked: boolean;
}

function allTargetsReached(session: CoachSession): boolean {
  return session.repsTarget != null && session.setsTarget != null && session.workSetReps.length >= session.setsTarget && session.workSetReps.every((r) => r >= session.repsTarget!);
}

function missedByMoreThanTwo(session: CoachSession): boolean {
  return session.repsTarget != null && session.workSetReps.length > 0 && session.workSetReps.some((r) => r < session.repsTarget! - 2);
}

function e1rmStable(sessions: CoachSession[]): boolean {
  const values = sessions.slice(-3).map((s) => s.maxE1rm).filter((v): v is number => v != null);
  if (values.length < 3) return false;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return mean > 0 && (Math.max(...values) - Math.min(...values)) / mean <= 0.04;
}

export function evaluateCoach(context: CoachContext): CoachSuggestion[] {
  const suggestions: CoachSuggestion[] = [];

  if (context.phaseChanged) {
    suggestions.push({ id: 'phase', ruleId: 'C-05', action: 'inform', exerciseId: null, title: 'Nouvelle phase', explanation: 'Le cycle entre dans une nouvelle phase : vérifiez les règles de charge, séries et repos.', suggestedWeightKg: null, blocked: false });
  }

  const recoveryAlert = context.recentFatigueLevels.filter((v) => v >= 4).length >= 2 || context.recentPainLevels.some((v) => v >= 5);
  const comparableExercises = context.exercises
    .map((exercise) => ({ ...exercise, sessions: exercise.sessions.filter((session) => !session.isDeload) }))
    .filter((exercise) => exercise.sessions.length >= 2);
  const stalledExercises = comparableExercises.filter((exercise) => {
    const [previous, current] = exercise.sessions.slice(-2);
    if (!previous || !current || previous.maxE1rm == null || current.maxE1rm == null) return false;
    return current.maxE1rm <= previous.maxE1rm * 1.02;
  });
  const latestEfforts = context.exercises.map((exercise) => exercise.sessions.filter((session) => !session.isDeload).at(-1)?.averageRir).filter((value): value is number => value != null);
  const highEffortMajority = latestEfforts.length > 0 && latestEfforts.filter((rir) => rir <= 1).length > latestEfforts.length / 2;
  const widespreadStall = comparableExercises.length >= 2 && stalledExercises.length > comparableExercises.length / 2;
  if (recoveryAlert || highEffortMajority || widespreadStall) {
    const reason = recoveryAlert
      ? 'La fatigue ou la douleur récente est élevée'
      : highEffortMajority
        ? 'Plus de la moitié des exercices ont été réalisés à RIR 0–1'
        : 'La majorité des mouvements ne progresse plus sur les 2 dernières séances';
    suggestions.push({ id: 'recovery-deload', ruleId: 'C-04', action: 'deload', exerciseId: null, title: 'Semaine allégée à envisager', explanation: `${reason} : réduisez le nombre de séries d’environ 40 % et conservez des charges confortables.`, suggestedWeightKg: null, blocked: false });
  }

  for (const exercise of context.exercises) {
    const progressionSessions = exercise.sessions.filter((session) => !session.isDeload);
    const lastTwo = progressionSessions.slice(-2);
    const lastThree = progressionSessions.slice(-3);
    const last = progressionSessions.at(-1);
    if (!last) continue;

    if (lastTwo.length === 2 && lastTwo.every(missedByMoreThanTwo)) {
      suggestions.push({ id: `decrease-${exercise.exerciseId}`, ruleId: 'C-02', action: 'decrease', exerciseId: exercise.exerciseId, title: `${exercise.name} : réduire la charge`, explanation: `La cible a été manquée de plus de 2 répétitions lors des 2 dernières séances.`, suggestedWeightKg: Math.max(0, last.maxWeightKg - exercise.incrementKg), blocked: false });
      continue;
    }

    if (lastTwo.length === 2 && lastTwo.every(allTargetsReached)) {
      const proposed = last.maxWeightKg + exercise.incrementKg;
      const fourWeekSessions = exercise.sessions.filter((s) => new Date(last.date).getTime() - new Date(s.date).getTime() <= 28 * 86400000);
      const baseline = fourWeekSessions[0]?.maxWeightKg ?? last.maxWeightKg;
      const exceedsGuard = baseline > 0 && proposed > baseline * 1.1;
      const readaptation = context.phase === 'readaptation';
      suggestions.push({
        id: `increase-${exercise.exerciseId}`,
        ruleId: exceedsGuard ? 'C-07' : 'C-01',
        action: 'increase',
        exerciseId: exercise.exerciseId,
        title: `${exercise.name} : prochaine charge`,
        explanation: readaptation
          ? 'Objectif atteint deux fois, mais les hausses sont suspendues pendant la réadaptation.'
          : exceedsGuard
            ? 'Hausse bloquée : elle dépasserait +10 % sur 4 semaines.'
            : `Toutes les séries ont atteint la cible lors des 2 dernières séances : +${exercise.incrementKg} kg proposé.`,
        suggestedWeightKg: readaptation || exceedsGuard ? null : proposed,
        blocked: readaptation || exceedsGuard,
      });
      continue;
    }

    if (lastThree.length === 3 && e1rmStable(lastThree)) {
      suggestions.push({ id: `plateau-${exercise.exerciseId}`, ruleId: 'C-03', action: 'vary', exerciseId: exercise.exerciseId, title: `${exercise.name} : plateau probable`, explanation: 'L’e1RM est resté dans une zone de ±2 % pendant 3 séances : envisagez une variation ou une semaine allégée.', suggestedWeightKg: null, blocked: false });
    }
  }

  for (const volume of context.muscleVolumes) {
    if (volume.currentWeekSets < 8 && volume.previousWeekSets < 8) {
      suggestions.push({ id: `volume-${volume.muscle}`, ruleId: 'C-06', action: 'inform', exerciseId: null, title: `${volume.muscle} : volume faible`, explanation: `Moins de 8 séries pondérées par semaine sur 2 semaines (${volume.previousWeekSets.toFixed(1)} puis ${volume.currentWeekSets.toFixed(1)}).`, suggestedWeightKg: null, blocked: false });
    }
  }

  return suggestions;
}
