import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/db/db';
import {
  editSetLog,
  getLastWorkRir,
  getOrCreateWorkoutExercise,
  logSet,
  startWorkout,
} from '../../src/repositories/workouts.repo';
import type { Exercise, SessionTemplate } from '../../src/db/schema';

const ts = '2026-09-13T10:00:00.000Z';

async function seedMinimal() {
  const exercise: Exercise = {
    id: 'ex-effort',
    name: 'Effort test',
    equipment: 'machine',
    loadType: 'weight',
    unilateral: false,
    primaryMuscles: ['pectoraux'],
    secondaryMuscles: [],
    defaultIncrementKg: 2.5,
    alternativeIds: [],
    cues: [],
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
  };
  await db.exercises.put(exercise);
}

function template(): SessionTemplate {
  return {
    id: 'tpl-effort',
    cycleId: 'cycle-effort',
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

describe('workouts effort capture', () => {
  it('approche → isWarmup, rir null, tonnage 0', async () => {
    const workout = await startWorkout(template(), []);
    const we = await getOrCreateWorkoutExercise(workout.id, 'ex-effort', 1, null);
    const set = await logSet({
      workoutExerciseId: we.id,
      exerciseId: 'ex-effort',
      index: 1,
      weightKg: 40,
      reps: 8,
      durationSec: null,
      setKind: 'approach',
      rir: 2,
    });
    expect(set.isWarmup).toBe(true);
    expect(set.setKind).toBe('approach');
    expect(set.rir).toBeNull();
    expect((await db.workouts.get(workout.id))?.totalTonnageKg).toBe(0);
  });

  it('work + rir 2 persistés', async () => {
    const workout = await startWorkout(template(), []);
    const we = await getOrCreateWorkoutExercise(workout.id, 'ex-effort', 1, null);
    const set = await logSet({
      workoutExerciseId: we.id,
      exerciseId: 'ex-effort',
      index: 1,
      weightKg: 60,
      reps: 8,
      durationSec: null,
      setKind: 'work',
      rir: 2,
    });
    expect(set.isWarmup).toBe(false);
    expect(set.rir).toBe(2);
    expect((await db.workouts.get(workout.id))?.totalTonnageKg).toBe(480);
  });

  it('edit work → approach recalcule tonnage à 0', async () => {
    const workout = await startWorkout(template(), []);
    const we = await getOrCreateWorkoutExercise(workout.id, 'ex-effort', 1, null);
    const set = await logSet({
      workoutExerciseId: we.id,
      exerciseId: 'ex-effort',
      index: 1,
      weightKg: 60,
      reps: 8,
      durationSec: null,
      setKind: 'work',
      rir: 1,
    });
    await editSetLog(set.id, { setKind: 'approach' });
    const updated = await db.setLogs.get(set.id);
    expect(updated?.isWarmup).toBe(true);
    expect(updated?.rir).toBeNull();
    expect((await db.workouts.get(workout.id))?.totalTonnageKg).toBe(0);
  });

  it('getLastWorkRir retourne le dernier rir work', async () => {
    const workout = await startWorkout(template(), []);
    const we = await getOrCreateWorkoutExercise(workout.id, 'ex-effort', 1, null);
    await logSet({
      workoutExerciseId: we.id,
      exerciseId: 'ex-effort',
      index: 1,
      weightKg: 50,
      reps: 8,
      durationSec: null,
      setKind: 'work',
      rir: 3,
    });
    await logSet({
      workoutExerciseId: we.id,
      exerciseId: 'ex-effort',
      index: 2,
      weightKg: 55,
      reps: 8,
      durationSec: null,
      setKind: 'work',
      rir: 1,
    });
    expect(await getLastWorkRir('ex-effort')).toBe(1);
  });
});
