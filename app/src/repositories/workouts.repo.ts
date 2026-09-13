import { db } from '../db/db';
import { newId } from '../lib/id';
import { nowIso, todayDateStr } from '../lib/date';
import { calculateE1rm } from '../domain/e1rm';
import { detectPrKinds } from '../domain/records';
import { shouldAutoAbandon, canResume } from '../domain/session-machine';
import { computeWorkoutTonnage } from '../domain/tonnage';
import {
  statusAfterLeaveWithSets,
  statusAfterLogSet,
  statusAfterSkip,
} from '../domain/workout-exercise-status';
import type {
  CardioLog,
  PrescribedItem,
  SessionTemplate,
  SetLog,
  Workout,
  WorkoutExercise,
} from '../db/schema';

async function autoAbandonStaleWorkouts(): Promise<void> {
  const inProgress = await db.workouts.where('status').equals('in_progress').toArray();
  for (const w of inProgress) {
    if (shouldAutoAbandon(w)) {
      await db.workouts.update(w.id, { status: 'abandoned', updatedAt: nowIso() });
    }
  }
}

export async function getResumableWorkout(): Promise<Workout | undefined> {
  await autoAbandonStaleWorkouts();
  const candidates = await db.workouts
    .filter((w) => w.deletedAt == null && (w.status === 'in_progress' || w.status === 'abandoned'))
    .toArray();
  return candidates.filter((w) => canResume(w)).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0];
}

export async function startWorkout(
  template: SessionTemplate,
  items: PrescribedItem[],
): Promise<Workout> {
  const ts = nowIso();
  const workout: Workout = {
    id: newId(),
    sessionTemplateId: template.id,
    templateSnapshot: items,
    date: todayDateStr(),
    startedAt: ts,
    endedAt: null,
    status: 'in_progress',
    bodyweightKg: null,
    totalTonnageKg: 0,
    notes: '',
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
  };
  await db.workouts.put(workout);
  return workout;
}

export async function getWorkout(workoutId: string): Promise<Workout | undefined> {
  return db.workouts.get(workoutId);
}

export async function touchWorkout(workoutId: string): Promise<void> {
  await db.workouts.update(workoutId, { updatedAt: nowIso() });
}

// Reglage en direct (duree d'un bloc au temps, repos) : n'affecte que cette seance,
// jamais le programme (templateSnapshot est une copie figee au demarrage de la seance).
export async function updateWorkoutItemPrescription(
  workoutId: string,
  itemId: string,
  patch: Partial<Pick<PrescribedItem, 'durationSec' | 'restSec'>>,
): Promise<PrescribedItem[] | undefined> {
  const workout = await db.workouts.get(workoutId);
  if (!workout) return undefined;
  const templateSnapshot = workout.templateSnapshot.map((item) =>
    item.id === itemId ? { ...item, ...patch } : item,
  );
  await db.workouts.update(workoutId, { templateSnapshot, updatedAt: nowIso() });
  return templateSnapshot;
}

export async function getWorkoutExercises(workoutId: string): Promise<WorkoutExercise[]> {
  const list = await db.workoutExercises.where('workoutId').equals(workoutId).toArray();
  return list.filter((e) => e.deletedAt == null).sort((a, b) => a.order - b.order);
}

const pendingWorkoutExerciseCreations = new Map<string, Promise<WorkoutExercise>>();

// Deux appels concurrents (ex: double-render) pour le meme (workoutId, exerciseId, order)
// pouvaient tous deux ne pas trouver de ligne existante et creer deux WorkoutExercise
// distincts, ce qui eparpillait les series entre deux enregistrements et faisait croire
// que la premiere seance de l'exercice n'avait pas ete enregistree.
export async function getOrCreateWorkoutExercise(
  workoutId: string,
  exerciseId: string,
  order: number,
  substitutedFromId: string | null,
): Promise<WorkoutExercise> {
  const existing = (await getWorkoutExercises(workoutId)).find(
    (e) => e.exerciseId === exerciseId && e.order === order,
  );
  if (existing) return existing;

  const dedupeKey = `${workoutId}:${exerciseId}:${order}`;
  const inFlight = pendingWorkoutExerciseCreations.get(dedupeKey);
  if (inFlight) return inFlight;

  const creation = (async () => {
    const lastSettings = await getLastMachineSettings(exerciseId);
    const ts = nowIso();
    const we: WorkoutExercise = {
      id: newId(),
      workoutId,
      exerciseId,
      substitutedFromId,
      order,
      machineSettings: lastSettings ?? '',
      sessionRpe: null,
      note: '',
      completionStatus: 'planned',
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null,
    };
    await db.workoutExercises.put(we);
    return we;
  })();

  pendingWorkoutExerciseCreations.set(dedupeKey, creation);
  try {
    return await creation;
  } finally {
    pendingWorkoutExerciseCreations.delete(dedupeKey);
  }
}

export async function updateWorkoutExercise(
  id: string,
  patch: Partial<Pick<WorkoutExercise, 'machineSettings' | 'note' | 'sessionRpe'>>,
): Promise<void> {
  await db.workoutExercises.update(id, { ...patch, updatedAt: nowIso() });
}

export async function getLastMachineSettings(exerciseId: string): Promise<string | undefined> {
  const all = await db.workoutExercises
    .where('exerciseId')
    .equals(exerciseId)
    .toArray();
  const withSettings = all
    .filter((e) => e.deletedAt == null && e.machineSettings)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return withSettings[0]?.machineSettings;
}

export async function getSetLogs(workoutExerciseId: string): Promise<SetLog[]> {
  const list = await db.setLogs.where('workoutExerciseId').equals(workoutExerciseId).toArray();
  return list.filter((s) => s.deletedAt == null).sort((a, b) => a.index - b.index);
}

// RG-06: pre-remplissage = derniere execution reussie du meme exercice, tous templates confondus.
export async function getLastCompletedSets(exerciseId: string, excludeWorkoutId?: string): Promise<SetLog[]> {
  const workoutExercises = await db.workoutExercises.where('exerciseId').equals(exerciseId).toArray();
  const candidates = workoutExercises.filter(
    (we) => we.deletedAt == null && we.workoutId !== excludeWorkoutId,
  );
  if (candidates.length === 0) return [];

  const withWorkouts = await Promise.all(
    candidates.map(async (we) => ({ we, workout: await db.workouts.get(we.workoutId) })),
  );
  const completed = withWorkouts
    .filter((x) => x.workout && x.workout.status === 'completed' && x.workout.deletedAt == null)
    .sort((a, b) => (a.workout!.date < b.workout!.date ? 1 : -1));

  if (completed.length === 0) return [];
  return getSetLogs(completed[0]!.we.id);
}

interface LogSetInput {
  workoutExerciseId: string;
  exerciseId: string;
  index: number;
  weightKg: number | null;
  reps: number | null;
  durationSec: number | null;
  isWarmup: boolean;
}

export async function logSet(input: LogSetInput): Promise<SetLog> {
  const priorSets = await getPriorSetsForExercise(input.exerciseId, input.workoutExerciseId);
  const e1rm = input.isWarmup ? null : calculateE1rm(input.weightKg, input.reps);
  const prKinds = detectPrKinds(
    { weightKg: input.weightKg, reps: input.reps, e1rm, isWarmup: input.isWarmup },
    priorSets,
  );

  const ts = nowIso();
  const set: SetLog = {
    id: newId(),
    workoutExerciseId: input.workoutExerciseId,
    index: input.index,
    weightKg: input.weightKg,
    reps: input.reps,
    durationSec: input.durationSec,
    rir: null,
    tempo: null,
    restActualSec: null,
    isWarmup: input.isWarmup,
    e1rm,
    isPR: prKinds.length > 0,
    prKinds,
    completedAt: ts,
    editedAt: null,
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
  };
  await db.setLogs.put(set);
  const we = await db.workoutExercises.get(input.workoutExerciseId);
  if (we) {
    const next = statusAfterLogSet(we.completionStatus ?? 'planned');
    if (next !== we.completionStatus) {
      await db.workoutExercises.update(we.id, { completionStatus: next, updatedAt: ts });
    }
    await recomputeWorkoutTonnage(we.workoutId);
  }
  return set;
}

async function getPriorSetsForExercise(exerciseId: string, _currentWorkoutExerciseId: string) {
  const workoutExercises = (await db.workoutExercises.where('exerciseId').equals(exerciseId).toArray()).filter(
    (we) => we.deletedAt == null,
  );
  const allSets: SetLog[] = [];
  for (const we of workoutExercises) {
    const sets = await getSetLogs(we.id);
    allSets.push(...sets);
  }
  return allSets;
}

export async function recomputeWorkoutTonnage(workoutId: string): Promise<number> {
  const exercises = await getWorkoutExercises(workoutId);
  const unilateral = new Map<string, boolean>();
  const flat: Array<{
    weightKg: number | null;
    reps: number | null;
    isWarmup: boolean;
    deletedAt?: string | null;
    exerciseId: string;
  }> = [];

  for (const we of exercises) {
    const ex = await db.exercises.get(we.exerciseId);
    unilateral.set(we.exerciseId, ex?.unilateral ?? false);
    const sets = await db.setLogs.where('workoutExerciseId').equals(we.id).toArray();
    for (const s of sets) {
      flat.push({
        weightKg: s.weightKg,
        reps: s.reps,
        isWarmup: s.isWarmup,
        deletedAt: s.deletedAt,
        exerciseId: we.exerciseId,
      });
    }
  }

  const tonnage = computeWorkoutTonnage(flat, unilateral);
  await db.workouts.update(workoutId, { totalTonnageKg: tonnage, updatedAt: nowIso() });
  return tonnage;
}

export async function removeSet(setLogId: string): Promise<void> {
  const set = await db.setLogs.get(setLogId);
  await db.setLogs.update(setLogId, { deletedAt: nowIso(), updatedAt: nowIso() });
  if (!set) return;
  const we = await db.workoutExercises.get(set.workoutExerciseId);
  if (we) await recomputeWorkoutTonnage(we.workoutId);
}

// RG-12: correction a posteriori journalisee.
export async function editSetLog(
  setLogId: string,
  patch: Partial<Pick<SetLog, 'weightKg' | 'reps' | 'durationSec'>>,
): Promise<void> {
  const set = await db.setLogs.get(setLogId);
  if (!set) return;
  const weightKg = patch.weightKg ?? set.weightKg;
  const reps = patch.reps ?? set.reps;
  const e1rm = set.isWarmup ? null : calculateE1rm(weightKg, reps);
  await db.setLogs.update(setLogId, {
    ...patch,
    e1rm,
    editedAt: nowIso(),
    updatedAt: nowIso(),
  });
  const we = await db.workoutExercises.get(set.workoutExerciseId);
  if (we) await recomputeWorkoutTonnage(we.workoutId);
}

export async function skipWorkoutExercise(workoutExerciseId: string): Promise<void> {
  const we = await db.workoutExercises.get(workoutExerciseId);
  if (!we || we.deletedAt != null) return;
  await db.workoutExercises.update(workoutExerciseId, {
    completionStatus: statusAfterSkip(we.completionStatus ?? 'planned'),
    updatedAt: nowIso(),
  });
  await touchWorkout(we.workoutId);
}

export async function markExerciseCompleted(workoutExerciseId: string): Promise<void> {
  const we = await db.workoutExercises.get(workoutExerciseId);
  if (!we || we.deletedAt != null) return;
  const sets = await getSetLogs(workoutExerciseId);
  const next = statusAfterLeaveWithSets(we.completionStatus ?? 'planned', sets.length > 0);
  await db.workoutExercises.update(workoutExerciseId, {
    completionStatus: next,
    updatedAt: nowIso(),
  });
}

export async function updateWorkoutTimes(
  workoutId: string,
  startedAt: string,
  endedAt: string,
): Promise<void> {
  if (new Date(endedAt).getTime() < new Date(startedAt).getTime()) {
    throw new Error('endedAt must be >= startedAt');
  }
  await db.workouts.update(workoutId, { startedAt, endedAt, updatedAt: nowIso() });
}

export async function markRemainingExercisesSkipped(workoutId: string): Promise<void> {
  const list = await getWorkoutExercises(workoutId);
  for (const we of list) {
    if (we.completionStatus === 'planned') {
      await skipWorkoutExercise(we.id);
    }
  }
}

export async function addCardioLog(
  workoutId: string,
  data: Omit<CardioLog, keyof { id: string; createdAt: string; updatedAt: string; deletedAt: null } | 'workoutId'>,
): Promise<CardioLog> {
  const ts = nowIso();
  const log: CardioLog = {
    id: newId(),
    workoutId,
    ...data,
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
  };
  await db.cardioLogs.put(log);
  await touchWorkout(workoutId);
  return log;
}

export async function completeWorkout(workoutId: string): Promise<void> {
  const tonnage = await recomputeWorkoutTonnage(workoutId);
  const ts = nowIso();
  await db.workouts.update(workoutId, {
    status: 'completed',
    endedAt: ts,
    totalTonnageKg: tonnage,
    updatedAt: ts,
  });
  void import('../sync/runSync').then((m) => m.runSync());
}

export async function abandonWorkout(workoutId: string): Promise<void> {
  await db.workouts.update(workoutId, { status: 'abandoned', updatedAt: nowIso() });
  void import('../sync/runSync').then((m) => m.runSync());
}

export async function listWorkouts(): Promise<Workout[]> {
  const all = await db.workouts.filter((w) => w.deletedAt == null && w.status !== 'in_progress').toArray();
  return all.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export interface WorkoutDetail {
  workout: Workout;
  exercises: { workoutExercise: WorkoutExercise; sets: SetLog[] }[];
  cardioLogs: CardioLog[];
}

export async function getWorkoutDetail(workoutId: string): Promise<WorkoutDetail | undefined> {
  const workout = await db.workouts.get(workoutId);
  if (!workout) return undefined;
  const workoutExercises = await getWorkoutExercises(workoutId);
  const exercises = await Promise.all(
    workoutExercises.map(async (workoutExercise) => ({
      workoutExercise,
      sets: await getSetLogs(workoutExercise.id),
    })),
  );
  const cardioLogs = (await db.cardioLogs.where('workoutId').equals(workoutId).toArray()).filter(
    (c) => c.deletedAt == null,
  );
  return { workout, exercises, cardioLogs };
}
