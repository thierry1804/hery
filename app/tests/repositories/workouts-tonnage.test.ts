import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/db/db';
import {
  editSetLog,
  getOrCreateWorkoutExercise,
  logSet,
  markExerciseCompleted,
  removeSet,
  skipWorkoutExercise,
  startWorkout,
  updateWorkoutTimes,
} from '../../src/repositories/workouts.repo';
import type { Exercise, SessionTemplate } from '../../src/db/schema';

const ts = '2026-09-13T10:00:00.000Z';

async function seedMinimal() {
  const exercise: Exercise = {
    id: 'ex-test-press',
    name: 'Presse test',
    equipment: 'machine',
    loadType: 'weight',
    unilateral: false,
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: [],
    defaultIncrementKg: 5,
    alternativeIds: [],
    cues: [],
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
  };
  const uni: Exercise = {
    ...exercise,
    id: 'ex-test-uni',
    name: 'Fente test',
    unilateral: true,
  };
  await db.exercises.bulkPut([exercise, uni]);
}

function template(): SessionTemplate {
  return {
    id: 'tpl-test',
    cycleId: 'cycle-test',
    code: 'A',
    label: 'Test',
    dayOfWeek: 1,
    targetDurationMin: 60,
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
  };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
  await seedMinimal();
});

describe('workouts tonnage recompute', () => {
  it('met à jour le tonnage après log, edit et remove', async () => {
    const workout = await startWorkout(template(), []);
    const we = await getOrCreateWorkoutExercise(workout.id, 'ex-test-press', 1, null);

    const set = await logSet({
      workoutExerciseId: we.id,
      exerciseId: 'ex-test-press',
      index: 1,
      weightKg: 100,
      reps: 10,
      durationSec: null,
      setKind: 'work',
      rir: null,
    });
    expect((await db.workouts.get(workout.id))?.totalTonnageKg).toBe(1000);
    expect((await db.workoutExercises.get(we.id))?.completionStatus).toBe('started');

    await editSetLog(set.id, { reps: 8 });
    expect((await db.workouts.get(workout.id))?.totalTonnageKg).toBe(800);

    await removeSet(set.id);
    expect((await db.workouts.get(workout.id))?.totalTonnageKg).toBe(0);
  });

  it('exclut les warmups du tonnage', async () => {
    const workout = await startWorkout(template(), []);
    const we = await getOrCreateWorkoutExercise(workout.id, 'ex-test-press', 1, null);
    await logSet({
      workoutExerciseId: we.id,
      exerciseId: 'ex-test-press',
      index: 1,
      weightKg: 50,
      reps: 10,
      durationSec: null,
      setKind: 'warmup',
      rir: null,
    });
    expect((await db.workouts.get(workout.id))?.totalTonnageKg).toBe(0);
  });

  it('double le tonnage pour un exercice unilatéral', async () => {
    const workout = await startWorkout(template(), []);
    const we = await getOrCreateWorkoutExercise(workout.id, 'ex-test-uni', 1, null);
    await logSet({
      workoutExerciseId: we.id,
      exerciseId: 'ex-test-uni',
      index: 1,
      weightKg: 20,
      reps: 8,
      durationSec: null,
      setKind: 'work',
      rir: null,
    });
    expect((await db.workouts.get(workout.id))?.totalTonnageKg).toBe(320);
  });
});

describe('workouts status and times', () => {
  it('skip marque skipped', async () => {
    const workout = await startWorkout(template(), []);
    const we = await getOrCreateWorkoutExercise(workout.id, 'ex-test-press', 1, null);
    await skipWorkoutExercise(we.id);
    expect((await db.workoutExercises.get(we.id))?.completionStatus).toBe('skipped');
  });

  it('markExerciseCompleted après séries', async () => {
    const workout = await startWorkout(template(), []);
    const we = await getOrCreateWorkoutExercise(workout.id, 'ex-test-press', 1, null);
    await logSet({
      workoutExerciseId: we.id,
      exerciseId: 'ex-test-press',
      index: 1,
      weightKg: 60,
      reps: 8,
      durationSec: null,
      setKind: 'work',
      rir: null,
    });
    await markExerciseCompleted(we.id);
    expect((await db.workoutExercises.get(we.id))?.completionStatus).toBe('completed');
  });

  it('updateWorkoutTimes refuse endedAt < startedAt', async () => {
    const workout = await startWorkout(template(), []);
    await expect(
      updateWorkoutTimes(workout.id, '2026-09-13T12:00:00.000Z', '2026-09-13T11:00:00.000Z'),
    ).rejects.toThrow('endedAt must be >= startedAt');
  });

  it('updateWorkoutTimes persiste des horaires valides', async () => {
    const workout = await startWorkout(template(), []);
    await updateWorkoutTimes(workout.id, '2026-09-13T10:00:00.000Z', '2026-09-13T11:00:00.000Z');
    const w = await db.workouts.get(workout.id);
    expect(w?.startedAt).toBe('2026-09-13T10:00:00.000Z');
    expect(w?.endedAt).toBe('2026-09-13T11:00:00.000Z');
  });
});
