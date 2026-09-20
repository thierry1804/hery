import { db } from '../db/db';
import type { ExerciseProgressionMemory, SetLog, Workout } from '../db/schema';
import {
  evaluateExerciseProgression,
  type ExerciseSessionSample,
} from '../domain/coach';
import type { LoadSemantics } from '../domain/load-semantics';
import { nowIso } from '../lib/date';

function isWorkSet(setLog: SetLog): boolean {
  const kind = setLog.setKind ?? (setLog.isWarmup ? 'warmup' : 'work');
  return kind === 'work' && setLog.weightKg != null && setLog.reps != null;
}

function compareWorkouts(a: Workout, b: Workout): number {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  const aTimestamp = a.endedAt ?? a.startedAt ?? a.updatedAt;
  const bTimestamp = b.endedAt ?? b.startedAt ?? b.updatedAt;
  if (aTimestamp !== bTimestamp) return aTimestamp.localeCompare(bTimestamp);
  return a.id.localeCompare(b.id);
}

function resolveSemantics(exerciseId: string, equipment: string, stored?: LoadSemantics): LoadSemantics {
  if (stored) return stored;
  if (exerciseId === 'ex-dips-assistes') return 'assistance';
  if (equipment === 'machine') return 'machine_resistance';
  if (equipment === 'bodyweight') return 'bodyweight';
  return 'external_weight';
}

export async function recomputeAllExerciseMemories(): Promise<void> {
  const [allWorkouts, allWorkoutExercises, allSetLogs, allExercises] = await Promise.all([
    db.workouts.toArray(),
    db.workoutExercises.toArray(),
    db.setLogs.toArray(),
    db.exercises.toArray(),
  ]);

  const completedWorkouts = allWorkouts
    .filter((w) => w.deletedAt == null && w.status === 'completed')
    .sort(compareWorkouts);
  const completedById = new Map(completedWorkouts.map((w) => [w.id, w]));
  const exerciseById = new Map(
    allExercises.filter((e) => e.deletedAt == null).map((e) => [e.id, e]),
  );

  const weById = new Map(
    allWorkoutExercises
      .filter((we) => we.deletedAt == null && completedById.has(we.workoutId))
      .map((we) => [we.id, we]),
  );

  const setsByExercise = new Map<string, Map<string, SetLog[]>>();
  for (const setLog of allSetLogs) {
    if (setLog.deletedAt != null || !isWorkSet(setLog)) continue;
    const we = weById.get(setLog.workoutExerciseId);
    if (!we) continue;
    let byWorkout = setsByExercise.get(we.exerciseId);
    if (!byWorkout) {
      byWorkout = new Map();
      setsByExercise.set(we.exerciseId, byWorkout);
    }
    const list = byWorkout.get(we.workoutId) ?? [];
    list.push(setLog);
    byWorkout.set(we.workoutId, list);
  }

  const latestWorkout = completedWorkouts.at(-1) ?? null;
  const recentPainHigh = (latestWorkout?.painLevel ?? 0) >= 5;

  let phase: import('../db/schema').PhaseCode | null = null;
  const activeCycle = (await db.cycles.toArray()).find((c) => c.active && c.deletedAt == null);
  if (activeCycle && latestWorkout) {
    const elapsedWeeks = Math.max(
      1,
      Math.floor(
        (new Date(`${latestWorkout.date}T12:00:00`).getTime() -
          new Date(`${activeCycle.startDate}T12:00:00`).getTime()) /
          (7 * 86400000),
      ) + 1,
    );
    phase =
      activeCycle.phases.find((p) => elapsedWeeks >= p.fromWeek && elapsedWeeks <= p.toWeek)?.code ??
      null;
  }

  const ts = nowIso();
  const writes: ExerciseProgressionMemory[] = [];

  for (const [exerciseId, byWorkout] of setsByExercise) {
    const exercise = exerciseById.get(exerciseId);
    if (!exercise || exercise.loadType !== 'weight') continue;

    const orderedWorkouts = [...byWorkout.keys()]
      .map((id) => completedById.get(id)!)
      .sort(compareWorkouts);

    const sessions: ExerciseSessionSample[] = [];
    for (const workout of orderedWorkouts) {
      const sets = byWorkout.get(workout.id)!;
      const workSets = sets.map((s) => ({
        reps: s.reps!,
        rir: s.rir,
        weightKg: s.weightKg!,
      }));
      const maxWeightKg = Math.max(...workSets.map((s) => s.weightKg));
      const e1rms = sets.map((s) => s.e1rm).filter((v): v is number => v != null);
      const prescribed = workout.templateSnapshot.find((item) => item.exerciseId === exerciseId);
      sessions.push({
        date: workout.date,
        maxWeightKg,
        maxE1rm: e1rms.length > 0 ? Math.max(...e1rms) : null,
        workSets,
        repsTarget: prescribed?.repsTarget ?? null,
        setsTarget: prescribed?.sets ?? null,
        isDeload: workout.isDeload ?? false,
      });
    }

    if (sessions.length === 0) continue;

    const last = sessions.filter((s) => !s.isDeload).at(-1);
    const maxReps =
      exercise.maxReps ?? last?.repsTarget ?? Math.max(...(last?.workSets.map((s) => s.reps) ?? [12]), 12);
    const minReps = exercise.minReps ?? Math.max(1, maxReps - 2);

    const result = evaluateExerciseProgression({
      exerciseId,
      name: exercise.name,
      incrementKg: exercise.defaultIncrementKg > 0 ? exercise.defaultIncrementKg : 2.5,
      loadSemantics: resolveSemantics(exerciseId, exercise.equipment, exercise.loadSemantics),
      minReps,
      maxReps,
      targetRirMin: exercise.targetRirMin ?? 1,
      targetRirMax: exercise.targetRirMax ?? 2,
      sessions,
      recentPainHigh,
      phase,
    });

    writes.push({
      exerciseId,
      status: result.status,
      currentLoadKg: result.currentLoadKg,
      suggestedLoadKg: result.suggestedLoadKg,
      targetReps: result.targetReps,
      targetRir: result.targetRir,
      confidence: result.confidence,
      consecutiveSuccesses: result.consecutiveSuccesses,
      consecutiveFailures: result.consecutiveFailures,
      lastReason: result.lastReason,
      lastEvaluatedAt: ts,
      comparableHistory: result.comparableHistory,
      updatedAt: ts,
    });
  }

  await db.transaction('rw', db.exerciseProgressionMemory, async () => {
    await db.exerciseProgressionMemory.clear();
    if (writes.length > 0) await db.exerciseProgressionMemory.bulkPut(writes);
  });
}

export async function getMemoriesByExerciseIds(
  ids: string[],
): Promise<Map<string, ExerciseProgressionMemory>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const rows = await db.exerciseProgressionMemory.bulkGet(unique);
  const map = new Map<string, ExerciseProgressionMemory>();
  for (const row of rows) {
    if (row) map.set(row.exerciseId, row);
  }
  return map;
}
