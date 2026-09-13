import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/db/db';
import {
  completeWorkout,
  editSetLog,
  getOrCreateWorkoutExercise,
  logSet,
  startWorkout,
  removeSet,
  recomputePrForExerciseChronologically,
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

  it('le replay ne traite pas les séances futures comme antérieures', async () => {
    const firstId = await completedSession(50, 0);
    await completedSession(55, 1);
    await completedSession(60, 2);

    await recomputePrForExerciseChronologically('ex-pr');

    const firstWe = await db.workoutExercises.where('workoutId').equals(firstId).first();
    const firstSet = firstWe ? await db.setLogs.where('workoutExerciseId').equals(firstWe.id).first() : undefined;
    expect(firstSet?.isPR).toBe(false);
  });

  it('une séance abandonnée ne bloque pas un PR ultérieur', async () => {
    await completedSession(50, 0);
    await completedSession(55, 1);
    const abandoned = await startWorkout(template('tpl-abandoned'), []);
    await db.workouts.update(abandoned.id, { date: '2026-09-12' });
    const abandonedWe = await getOrCreateWorkoutExercise(abandoned.id, 'ex-pr', 1, null);
    await logSet({
      workoutExerciseId: abandonedWe.id,
      exerciseId: 'ex-pr',
      index: 1,
      weightKg: 100,
      reps: 8,
      durationSec: null,
      setKind: 'work',
      rir: 0,
    });
    await db.workouts.update(abandoned.id, { status: 'abandoned' });

    const current = await startWorkout(template('tpl-after-abandoned'), []);
    await db.workouts.update(current.id, { date: '2026-09-13' });
    const currentWe = await getOrCreateWorkoutExercise(current.id, 'ex-pr', 1, null);
    const set = await logSet({
      workoutExerciseId: currentWe.id,
      exerciseId: 'ex-pr',
      index: 1,
      weightKg: 60,
      reps: 8,
      durationSec: null,
      setKind: 'work',
      rir: 1,
    });
    expect(set.prKinds).toContain('weight');
  });

  it('supprimer un ancien record rejoue les PR suivants', async () => {
    await completedSession(50, 0);
    await completedSession(55, 1);
    const recordWorkoutId = await completedSession(60, 2);
    const laterWorkoutId = await completedSession(58, 3);
    await recomputePrForExerciseChronologically('ex-pr');

    const recordWe = await db.workoutExercises.where('workoutId').equals(recordWorkoutId).first();
    const recordSet = recordWe ? await db.setLogs.where('workoutExerciseId').equals(recordWe.id).first() : undefined;
    const laterWe = await db.workoutExercises.where('workoutId').equals(laterWorkoutId).first();
    const laterSet = laterWe ? await db.setLogs.where('workoutExerciseId').equals(laterWe.id).first() : undefined;
    expect(laterSet?.prKinds).not.toContain('weight');

    await removeSet(recordSet!.id);
    expect((await db.setLogs.get(laterSet!.id))?.prKinds).toContain('weight');
  });
});
