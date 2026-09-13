import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/db/db';
import { migratePrV2 } from '../../src/db/migrate-pr-v2';
import { SETTINGS_KEYS } from '../../src/db/schema';
import type { Exercise, SetLog, Workout, WorkoutExercise } from '../../src/db/schema';

const ts = '2026-09-13T10:00:00.000Z';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('migratePrV2', () => {
  it('retire les faux PR de la première séance et est idempotente', async () => {
    await db.exercises.put({
      id: 'ex-m',
      name: 'M',
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
    } satisfies Exercise);

    const workout: Workout = {
      id: 'w1',
      sessionTemplateId: null,
      templateSnapshot: [],
      date: '2026-09-10',
      startedAt: ts,
      endedAt: '2026-09-10T11:00:00.000Z',
      status: 'completed',
      bodyweightKg: null,
      totalTonnageKg: 400,
      notes: '',
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null,
    };
    await db.workouts.put(workout);

    const we: WorkoutExercise = {
      id: 'we1',
      workoutId: 'w1',
      exerciseId: 'ex-m',
      substitutedFromId: null,
      order: 1,
      machineSettings: '',
      sessionRpe: null,
      note: '',
      completionStatus: 'completed',
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null,
    };
    await db.workoutExercises.put(we);

    const set: SetLog = {
      id: 's1',
      workoutExerciseId: 'we1',
      index: 1,
      weightKg: 50,
      reps: 8,
      durationSec: null,
      rir: null,
      tempo: null,
      restActualSec: null,
      setKind: 'work',
      isWarmup: false,
      e1rm: 63,
      isPR: true,
      prKinds: ['weight'],
      completedAt: ts,
      editedAt: null,
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null,
    };
    await db.setLogs.put(set);

    await migratePrV2();
    expect((await db.setLogs.get('s1'))?.isPR).toBe(false);
    expect((await db.settings.get(SETTINGS_KEYS.prRulesMigratedV2))?.value).toBe(true);

    await db.setLogs.update('s1', { isPR: true, prKinds: ['weight'] });
    await migratePrV2();
    expect((await db.setLogs.get('s1'))?.isPR).toBe(true);
  });
});
