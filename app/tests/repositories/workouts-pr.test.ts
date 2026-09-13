import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/db/db';
import {
  completeWorkout,
  editSetLog,
  getOrCreateWorkoutExercise,
  logSet,
  startWorkout,
} from '../../src/repositories/workouts.repo';
import type { Exercise, SessionTemplate } from '../../src/db/schema';

const ts = '2026-09-13T10:00:00.000Z';

async function seedExercise() {
  const exercise: Exercise = {
    id: 'ex-pr',
    name: 'PR test',
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

function template(id: string): SessionTemplate {
  return {
    id,
    cycleId: 'cycle-pr',
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
  await seedExercise();
});

async function completedSession(weight: number, dateOffsetHours: number) {
  const workout = await startWorkout(template(`tpl-${dateOffsetHours}`), []);
  await db.workouts.update(workout.id, {
    date: `2026-09-${String(10 + dateOffsetHours).padStart(2, '0')}`,
    startedAt: `2026-09-${String(10 + dateOffsetHours).padStart(2, '0')}T10:00:00.000Z`,
  });
  const we = await getOrCreateWorkoutExercise(workout.id, 'ex-pr', 1, null);
  await logSet({
    workoutExerciseId: we.id,
    exerciseId: 'ex-pr',
    index: 1,
    weightKg: weight,
    reps: 8,
    durationSec: null,
    setKind: 'work',
    rir: 2,
  });
  await completeWorkout(workout.id);
  return workout.id;
}

describe('PR v2 repository', () => {
  it('pas de PR avant 2 séances completed antérieures', async () => {
    await completedSession(50, 0);
    const workout = await startWorkout(template('tpl-current'), []);
    const we = await getOrCreateWorkoutExercise(workout.id, 'ex-pr', 1, null);
    const set = await logSet({
      workoutExerciseId: we.id,
      exerciseId: 'ex-pr',
      index: 1,
      weightKg: 100,
      reps: 8,
      durationSec: null,
      setKind: 'work',
      rir: 1,
    });
    expect(set.isPR).toBe(false);
  });

  it('PR weight après 2 séances completed', async () => {
    await completedSession(50, 0);
    await completedSession(55, 1);
    const workout = await startWorkout(template('tpl-current-2'), []);
    const we = await getOrCreateWorkoutExercise(workout.id, 'ex-pr', 1, null);
    const set = await logSet({
      workoutExerciseId: we.id,
      exerciseId: 'ex-pr',
      index: 1,
      weightKg: 60,
      reps: 8,
      durationSec: null,
      setKind: 'work',
      rir: 1,
    });
    expect(set.isPR).toBe(true);
    expect(set.prKinds).toContain('weight');
  });

  it('edit qui baisse la charge retire le PR après replay', async () => {
    await completedSession(50, 0);
    await completedSession(55, 1);
    const workout = await startWorkout(template('tpl-edit'), []);
    const we = await getOrCreateWorkoutExercise(workout.id, 'ex-pr', 1, null);
    const set = await logSet({
      workoutExerciseId: we.id,
      exerciseId: 'ex-pr',
      index: 1,
      weightKg: 60,
      reps: 8,
      durationSec: null,
      setKind: 'work',
      rir: 1,
    });
    expect(set.isPR).toBe(true);
    await editSetLog(set.id, { weightKg: 40 });
    const updated = await db.setLogs.get(set.id);
    expect(updated?.isPR).toBe(false);
  });
});
