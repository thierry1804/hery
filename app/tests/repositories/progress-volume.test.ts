import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/db/db';
import { getProgressSnapshot } from '../../src/repositories/progress.repo';
import type { Exercise, SetLog, Workout, WorkoutExercise } from '../../src/db/schema';

const createdAt = '2026-08-01T10:00:00.000Z';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('volumes musculaires glissants', () => {
  it('compte les semaines antérieures sur 28 jours et les séries sans charge', async () => {
    const exercise: Exercise = {
      id: 'plank', name: 'Gainage', equipment: 'bodyweight', loadType: 'time', unilateral: false,
      primaryMuscles: ['abdominaux'], secondaryMuscles: ['obliques'], defaultIncrementKg: 0,
      alternativeIds: [], cues: [], createdAt, updatedAt: createdAt, deletedAt: null,
    };
    await db.exercises.put(exercise);

    for (const [index, date] of ['2026-08-20', '2026-09-10'].entries()) {
      const workout: Workout = {
        id: `w${index}`, sessionTemplateId: null, templateSnapshot: [], date,
        startedAt: `${date}T10:00:00.000Z`, endedAt: `${date}T11:00:00.000Z`, status: 'completed',
        bodyweightKg: null, fatigueLevel: null, painLevel: null, painArea: '', isDeload: false,
        totalTonnageKg: 0, notes: '', createdAt, updatedAt: `${date}T11:00:00.000Z`, deletedAt: null,
      };
      const workoutExercise: WorkoutExercise = {
        id: `we${index}`, workoutId: workout.id, exerciseId: exercise.id, substitutedFromId: null,
        order: 1, machineSettings: '', sessionRpe: null, note: '', completionStatus: 'completed',
        createdAt, updatedAt: createdAt, deletedAt: null,
      };
      const set: SetLog = {
        id: `set${index}`, workoutExerciseId: workoutExercise.id, index: 1, weightKg: null, reps: null,
        durationSec: 40, rir: null, tempo: null, restActualSec: null, setKind: 'work', isWarmup: false,
        e1rm: null, isPR: false, prKinds: [], completedAt: `${date}T10:30:00.000Z`, editedAt: null,
        createdAt, updatedAt: createdAt, deletedAt: null,
      };
      await db.workouts.put(workout);
      await db.workoutExercises.put(workoutExercise);
      await db.setLogs.put(set);
    }

    const snapshot = await getProgressSnapshot(new Date('2026-09-13T12:00:00.000Z'));
    const abs = snapshot.muscleVolumeWindows.find((volume) => volume.muscle === 'abdominaux');
    const obliques = snapshot.muscleVolumeWindows.find((volume) => volume.muscle === 'obliques');
    expect(abs).toMatchObject({ sets7d: 1, sets28d: 2 });
    expect(obliques).toMatchObject({ sets7d: 0.5, sets28d: 1 });
  });
});
