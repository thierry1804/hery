import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/db/db';
import { migrateDataReliabilityV1 } from '../../src/db/migrate-reliability';
import { SETTINGS_KEYS } from '../../src/db/schema';
import type { Exercise, SetLog, Workout, WorkoutExercise } from '../../src/db/schema';

const ts = '2026-09-13T10:00:00.000Z';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('migrateDataReliabilityV1', () => {
  it('recalcule le tonnage et dérive les statuts, idempotente', async () => {
    const exercise: Exercise = {
      id: 'ex-mig',
      name: 'Mig',
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

    const workout: Workout = {
      id: 'w-mig',
      sessionTemplateId: null,
      templateSnapshot: [],
      date: '2026-09-13',
      startedAt: ts,
      endedAt: '2026-09-13T11:00:00.000Z',
      status: 'completed',
      bodyweightKg: null,
      totalTonnageKg: 0,
      notes: '',
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null,
    };
    await db.workouts.put(workout);

    const weWithSets: WorkoutExercise = {
      id: 'we-sets',
      workoutId: 'w-mig',
      exerciseId: 'ex-mig',
      substitutedFromId: null,
      order: 1,
      machineSettings: '',
      sessionRpe: null,
      note: '',
      completionStatus: 'planned',
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null,
    };
    const weEmpty: WorkoutExercise = {
      ...weWithSets,
      id: 'we-empty',
      order: 2,
    };
    await db.workoutExercises.bulkPut([weWithSets, weEmpty]);

    const set: SetLog = {
      id: 'set-1',
      workoutExerciseId: 'we-sets',
      index: 1,
      weightKg: 100,
      reps: 10,
      durationSec: null,
      rir: null,
      tempo: null,
      restActualSec: null,
      setKind: 'work',
      isWarmup: false,
      e1rm: null,
      isPR: false,
      prKinds: [],
      completedAt: ts,
      editedAt: null,
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null,
    };
    await db.setLogs.put(set);

    await migrateDataReliabilityV1();
    expect((await db.workouts.get('w-mig'))?.totalTonnageKg).toBe(1000);
    expect((await db.workoutExercises.get('we-sets'))?.completionStatus).toBe('completed');
    expect((await db.workoutExercises.get('we-empty'))?.completionStatus).toBe('planned');
    expect((await db.settings.get(SETTINGS_KEYS.dataReliabilityMigratedV1))?.value).toBe(true);

    await db.workouts.update('w-mig', { totalTonnageKg: 999 });
    await migrateDataReliabilityV1();
    expect((await db.workouts.get('w-mig'))?.totalTonnageKg).toBe(999);
  });
});
