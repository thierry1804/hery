import type { MuscleGroup, PhaseCode } from '../db/schema';
import {
  isLoadHistoryComparable,
  nextLoadKg,
  type LoadSemantics,
} from './load-semantics';

export type CoachRuleId =
  | 'C-01'
  | 'C-02'
  | 'C-03'
  | 'C-04'
  | 'C-05'
  | 'C-06'
  | 'C-07'
  | 'C-08'
  | 'C-09'
  | 'C-10';

export type CoachAction =
  | 'increase'
  | 'hold'
  | 'decrease'
  | 'repeat'
  | 'watch'
  | 'deload'
  | 'vary'
  | 'inform';

export interface WorkSetSample {
  reps: number;
  rir: number | null;
  weightKg: number;
}

export interface ExerciseSessionSample {
  date: string;
  maxWeightKg: number;
  maxE1rm: number | null;
  workSets: WorkSetSample[];
  repsTarget: number | null;
  setsTarget: number | null;
  isDeload?: boolean;
}

/** Legacy session shape still accepted by evaluateCoach (adapted to workSets). */
export interface CoachSession {
  date: string;
  maxWeightKg: number;
  maxE1rm: number | null;
  workSetReps: number[];
  repsTarget: number | null;
  setsTarget: number | null;
  averageRir: number | null;
  workSets?: WorkSetSample[];
  isDeload?: boolean;
}

export interface CoachExercise {
  exerciseId: string;
  name: string;
  incrementKg: number;
  loadSemantics?: LoadSemantics;
  minReps?: number;
  maxReps?: number;
  targetRirMin?: number;
  targetRirMax?: number;
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
  confidence: 'high' | 'medium' | 'low';
}

export interface ExerciseProgressionInput {
  exerciseId: string;
  name: string;
  incrementKg: number;
  loadSemantics: LoadSemantics;
  minReps: number;
  maxReps: number;
  targetRirMin: number;
  targetRirMax: number;
  sessions: ExerciseSessionSample[];
  recentPainHigh: boolean;
  phase: PhaseCode | null;
}

export interface ExerciseProgressionResult {
  status: 'increase' | 'hold' | 'decrease' | 'repeat' | 'watch';
  currentLoadKg: number | null;
  suggestedLoadKg: number | null;
  targetReps: [number, number];
  targetRir: [number, number];
  confidence: 'high' | 'medium' | 'low';
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  lastReason: string;
  comparableHistory: boolean;
  ruleId: CoachRuleId;
  blocked: boolean;
}

function formatKg(kg: number): string {
  return Number.isInteger(kg) ? String(kg) : kg.toFixed(1).replace('.', ',');
}

function normalizeSession(session: CoachSession): ExerciseSessionSample {
  if (session.workSets && session.workSets.length > 0) {
    return {
      date: session.date,
      maxWeightKg: session.maxWeightKg,
      maxE1rm: session.maxE1rm,
      workSets: session.workSets,
      repsTarget: session.repsTarget,
      setsTarget: session.setsTarget,
      isDeload: session.isDeload,
    };
  }
  return {
    date: session.date,
    maxWeightKg: session.maxWeightKg,
    maxE1rm: session.maxE1rm,
    workSets: session.workSetReps.map((reps) => ({
      reps,
      rir: session.averageRir,
      weightKg: session.maxWeightKg,
    })),
    repsTarget: session.repsTarget,
    setsTarget: session.setsTarget,
    isDeload: session.isDeload,
  };
}

function isGoodSession(
  session: ExerciseSessionSample,
  maxReps: number,
  targetRirMin: number,
): boolean {
  const sets = session.workSets;
  if (sets.length === 0) return false;
  if (session.setsTarget != null && sets.length < session.setsTarget) return false;
  return sets.every(
    (set) =>
      set.reps >= maxReps &&
      set.rir != null &&
      set.rir >= targetRirMin &&
      set.rir !== 0,
  );
}

function countRirZero(session: ExerciseSessionSample): number {
  return session.workSets.filter((set) => set.rir === 0).length;
}

function e1rmStable(sessions: ExerciseSessionSample[]): boolean {
  const values = sessions
    .slice(-3)
    .map((s) => s.maxE1rm)
    .filter((v): v is number => v != null);
  if (values.length < 3) return false;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return mean > 0 && (Math.max(...values) - Math.min(...values)) / mean <= 0.04;
}

function confidenceFor(
  comparable: boolean,
  sessions: ExerciseSessionSample[],
): 'high' | 'medium' | 'low' {
  if (!comparable) return 'low';
  const withRir = sessions.filter((s) => s.workSets.some((w) => w.rir != null));
  if (sessions.length >= 2 && withRir.length >= 2) return 'high';
  if (sessions.length >= 1) return 'medium';
  return 'low';
}

export function evaluateExerciseProgression(
  input: ExerciseProgressionInput,
): ExerciseProgressionResult {
  const targetReps: [number, number] = [input.minReps, input.maxReps];
  const targetRir: [number, number] = [input.targetRirMin, input.targetRirMax];
  const sessions = input.sessions.filter((s) => !s.isDeload);
  const last = sessions.at(-1) ?? null;
  const currentLoadKg = last?.maxWeightKg ?? null;

  const empty = (
    status: ExerciseProgressionResult['status'],
    ruleId: CoachRuleId,
    reason: string,
    extra: Partial<ExerciseProgressionResult> = {},
  ): ExerciseProgressionResult => ({
    status,
    currentLoadKg,
    suggestedLoadKg: currentLoadKg,
    targetReps,
    targetRir,
    confidence: 'low',
    consecutiveSuccesses: 0,
    consecutiveFailures: 0,
    lastReason: reason,
    comparableHistory: true,
    ruleId,
    blocked: false,
    ...extra,
  });

  if (!last || last.workSets.length === 0) {
    return empty('hold', 'C-08', 'Pas assez de séries de travail pour décider.');
  }

  const weights = sessions.map((s) => s.maxWeightKg);
  const comparableHistory = isLoadHistoryComparable(weights);
  const confidence = confidenceFor(comparableHistory, sessions);

  if (!comparableHistory) {
    return empty('watch', 'C-10', 'Charge différente de l’historique récent : comparaison directe non fiable.', {
      confidence: 'low',
      suggestedLoadKg: null,
      comparableHistory: false,
    });
  }

  if (input.recentPainHigh) {
    return empty(
      'watch',
      'C-10',
      'Une douleur de 5/10 ou plus a été déclarée récemment. Surveille son évolution avant d’augmenter les charges.',
      { confidence, suggestedLoadKg: currentLoadKg, comparableHistory: true },
    );
  }

  const rirZeroCount = countRirZero(last);
  if (rirZeroCount >= 2) {
    const suggested = nextLoadKg(last.maxWeightKg, input.incrementKg, input.loadSemantics, 'down');
    return empty(
      'decrease',
      'C-02',
      `${rirZeroCount} séries à RIR 0 → réduis à ${formatKg(suggested)} kg et vise ${input.minReps}–${input.maxReps} reps à RIR ${input.targetRirMin}–${input.targetRirMax}.`,
      {
        confidence,
        suggestedLoadKg: suggested,
        consecutiveFailures: 1,
        comparableHistory: true,
      },
    );
  }

  const minRepsHit = last.workSets.every((s) => s.reps >= input.minReps);
  const underMinWithLowRir =
    last.workSets.some((s) => s.reps < input.minReps && s.rir != null && s.rir <= 1);

  if (underMinWithLowRir) {
    const suggested = nextLoadKg(last.maxWeightKg, input.incrementKg, input.loadSemantics, 'down');
    return empty(
      'decrease',
      'C-02',
      `Reps sous ${input.minReps} avec RIR bas → réduis à ${formatKg(suggested)} kg.`,
      { confidence, suggestedLoadKg: suggested, consecutiveFailures: 1, comparableHistory: true },
    );
  }

  if (rirZeroCount === 1) {
    return empty(
      'hold',
      'C-08',
      `${last.workSets.find((s) => s.rir === 0)?.reps ?? '?'} reps atteintes mais à RIR 0 → maintiens ${formatKg(last.maxWeightKg)} kg, vise ${input.minReps}–${input.maxReps} à RIR ${input.targetRirMin}–${input.targetRirMax}.`,
      { confidence, suggestedLoadKg: last.maxWeightKg, comparableHistory: true },
    );
  }

  let consecutiveSuccesses = 0;
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (isGoodSession(sessions[i]!, input.maxReps, input.targetRirMin)) consecutiveSuccesses += 1;
    else break;
  }

  if (consecutiveSuccesses >= 2) {
    const proposed = nextLoadKg(last.maxWeightKg, input.incrementKg, input.loadSemantics, 'up');
    const fourWeek = sessions.filter(
      (s) => new Date(last.date).getTime() - new Date(s.date).getTime() <= 28 * 86400000,
    );
    const baseline = fourWeek[0]?.maxWeightKg ?? last.maxWeightKg;
    const exceedsGuard = baseline > 0 && proposed > baseline * 1.1;
    const readaptation = input.phase === 'readaptation';

    if (readaptation || exceedsGuard) {
      return empty(
        'hold',
        exceedsGuard ? 'C-07' : 'C-01',
        readaptation
          ? 'Objectif atteint deux fois, mais les hausses sont suspendues pendant la réadaptation.'
          : 'Hausse bloquée : elle dépasserait +10 % sur 4 semaines.',
        {
          confidence,
          suggestedLoadKg: null,
          consecutiveSuccesses,
          blocked: true,
          comparableHistory: true,
        },
      );
    }

    return empty(
      'increase',
      'C-01',
      `Deux séances avec ≥ ${input.maxReps} reps et RIR ≥ ${input.targetRirMin} sans RIR 0 → +${formatKg(input.incrementKg)} kg proposé (${formatKg(proposed)} kg).`,
      {
        confidence,
        suggestedLoadKg: proposed,
        consecutiveSuccesses,
        comparableHistory: true,
      },
    );
  }

  if (consecutiveSuccesses === 1) {
    return empty(
      'repeat',
      'C-09',
      `Bonne séance à ${formatKg(last.maxWeightKg)} kg. Confirme une 2ᵉ fois (≥ ${input.maxReps} reps, RIR ${input.targetRirMin}–${input.targetRirMax}) avant d’augmenter.`,
      {
        confidence,
        suggestedLoadKg: last.maxWeightKg,
        consecutiveSuccesses: 1,
        comparableHistory: true,
      },
    );
  }

  const repsInRange = minRepsHit && last.workSets.every((s) => s.reps <= input.maxReps + 2);
  const rirInTarget = last.workSets.every(
    (s) => s.rir != null && s.rir >= input.targetRirMin && s.rir <= input.targetRirMax,
  );
  if (repsInRange || rirInTarget || last.workSets.some((s) => s.reps >= input.maxReps)) {
    return empty(
      'hold',
      'C-08',
      `Maintiens ${formatKg(last.maxWeightKg)} kg. Objectif : ${input.minReps}–${input.maxReps} reps à RIR ${input.targetRirMin}–${input.targetRirMax}.`,
      { confidence, suggestedLoadKg: last.maxWeightKg, comparableHistory: true },
    );
  }

  if (sessions.length >= 3 && e1rmStable(sessions)) {
    return empty(
      'hold',
      'C-03',
      'L’e1RM est resté stable sur 3 séances : consolide ou envisage une variation.',
      { confidence, suggestedLoadKg: last.maxWeightKg, comparableHistory: true },
    );
  }

  return empty(
    'hold',
    'C-08',
    `Maintiens ${formatKg(last.maxWeightKg)} kg et vise un meilleur contrôle (RIR ${input.targetRirMin}–${input.targetRirMax}).`,
    { confidence, suggestedLoadKg: last.maxWeightKg, comparableHistory: true },
  );
}

function titleFor(name: string, status: ExerciseProgressionResult['status']): string {
  switch (status) {
    case 'increase':
      return `${name} : augmenter`;
    case 'decrease':
      return `${name} : réduire`;
    case 'repeat':
      return `${name} : confirmer`;
    case 'watch':
      return `${name} : surveiller`;
    default:
      return `${name} : consolider`;
  }
}

export function evaluateCoach(context: CoachContext): CoachSuggestion[] {
  const suggestions: CoachSuggestion[] = [];
  const recentPainHigh = context.recentPainLevels.some((v) => v >= 5);

  if (context.phaseChanged) {
    suggestions.push({
      id: 'phase',
      ruleId: 'C-05',
      action: 'inform',
      exerciseId: null,
      title: 'Nouvelle phase',
      explanation:
        'Le cycle entre dans une nouvelle phase : vérifiez les règles de charge, séries et repos.',
      suggestedWeightKg: null,
      blocked: false,
      confidence: 'high',
    });
  }

  const recoveryAlert =
    context.recentFatigueLevels.filter((v) => v >= 4).length >= 2 || recentPainHigh;
  const comparableExercises = context.exercises
    .map((exercise) => ({
      ...exercise,
      sessions: exercise.sessions.filter((session) => !session.isDeload).map(normalizeSession),
    }))
    .filter((exercise) => exercise.sessions.length >= 2);
  const stalledExercises = comparableExercises.filter((exercise) => {
    const previous = exercise.sessions.at(-2);
    const current = exercise.sessions.at(-1);
    if (!previous || !current || previous.maxE1rm == null || current.maxE1rm == null) return false;
    return current.maxE1rm <= previous.maxE1rm * 1.02;
  });
  const latestEfforts = context.exercises
    .map((exercise) => {
      const last = exercise.sessions.filter((session) => !session.isDeload).at(-1);
      if (!last) return null;
      const sample = normalizeSession(last);
      const rirs = sample.workSets.map((s) => s.rir).filter((v): v is number => v != null);
      if (rirs.length === 0) return last.averageRir;
      return rirs.reduce((a, b) => a + b, 0) / rirs.length;
    })
    .filter((value): value is number => value != null);
  const highEffortMajority =
    latestEfforts.length > 0 &&
    latestEfforts.filter((rir) => rir <= 1).length > latestEfforts.length / 2;
  const widespreadStall =
    comparableExercises.length >= 2 && stalledExercises.length > comparableExercises.length / 2;

  if (recoveryAlert || highEffortMajority || widespreadStall) {
    const reason = recoveryAlert
      ? 'La fatigue ou la douleur récente est élevée'
      : highEffortMajority
        ? 'Plus de la moitié des exercices ont été réalisés à RIR 0–1'
        : 'La majorité des mouvements ne progresse plus sur les 2 dernières séances';
    suggestions.push({
      id: 'recovery-deload',
      ruleId: 'C-04',
      action: 'deload',
      exerciseId: null,
      title: 'Semaine allégée à envisager',
      explanation: `${reason} : réduisez le nombre de séries d’environ 40 % et conservez des charges confortables.`,
      suggestedWeightKg: null,
      blocked: false,
      confidence: 'medium',
    });
  }

  for (const exercise of context.exercises) {
    const sessions = exercise.sessions.map(normalizeSession);
    const last = sessions.filter((s) => !s.isDeload).at(-1);
    const maxReps =
      exercise.maxReps ??
      last?.repsTarget ??
      (last?.workSets.reduce((m, s) => Math.max(m, s.reps), 0) || 12);
    const minReps = exercise.minReps ?? Math.max(1, maxReps - 2);
    const result = evaluateExerciseProgression({
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      incrementKg: exercise.incrementKg,
      loadSemantics: exercise.loadSemantics ?? 'external_weight',
      minReps,
      maxReps,
      targetRirMin: exercise.targetRirMin ?? 1,
      targetRirMax: exercise.targetRirMax ?? 2,
      sessions,
      recentPainHigh,
      phase: context.phase,
    });

    if (result.ruleId === 'C-03') {
      suggestions.push({
        id: `plateau-${exercise.exerciseId}`,
        ruleId: 'C-03',
        action: 'vary',
        exerciseId: exercise.exerciseId,
        title: `${exercise.name} : plateau probable`,
        explanation: result.lastReason,
        suggestedWeightKg: null,
        blocked: false,
        confidence: result.confidence,
      });
      continue;
    }

    suggestions.push({
      id: `${result.status}-${exercise.exerciseId}`,
      ruleId: result.ruleId,
      action: result.status,
      exerciseId: exercise.exerciseId,
      title: titleFor(exercise.name, result.status),
      explanation: result.lastReason,
      suggestedWeightKg: result.suggestedLoadKg,
      blocked: result.blocked,
      confidence: result.confidence,
    });
  }

  for (const volume of context.muscleVolumes) {
    if (volume.currentWeekSets < 8 && volume.previousWeekSets < 8) {
      suggestions.push({
        id: `volume-${volume.muscle}`,
        ruleId: 'C-06',
        action: 'inform',
        exerciseId: null,
        title: `${volume.muscle} : volume faible`,
        explanation: `Moins de 8 séries pondérées par semaine sur 2 semaines (${volume.previousWeekSets.toFixed(1)} puis ${volume.currentWeekSets.toFixed(1)}).`,
        suggestedWeightKg: null,
        blocked: false,
        confidence: 'medium',
      });
    }
  }

  return suggestions;
}
