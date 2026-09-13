import { db } from '../db/db';
import { nowIso } from '../lib/date';

interface AcceptedCoachTarget {
  exerciseId: string;
  weightKg: number;
  acceptedAt: string;
}

function key(exerciseId: string): string {
  return `coachTarget:${exerciseId}`;
}

export async function acceptCoachTarget(exerciseId: string, weightKg: number): Promise<void> {
  const value: AcceptedCoachTarget = { exerciseId, weightKg, acceptedAt: nowIso() };
  await db.settings.put({ key: key(exerciseId), value });
}

export async function getAcceptedCoachTarget(exerciseId: string): Promise<number | null> {
  const setting = await db.settings.get(key(exerciseId));
  const target = setting?.value as AcceptedCoachTarget | undefined;
  if (!target || target.exerciseId !== exerciseId || !Number.isFinite(target.weightKg)) return null;

  const workoutExercises = await db.workoutExercises.where('exerciseId').equals(exerciseId).toArray();
  for (const workoutExercise of workoutExercises) {
    if (workoutExercise.deletedAt != null) continue;
    const workout = await db.workouts.get(workoutExercise.workoutId);
    if (workout?.status === 'completed' && workout.deletedAt == null && (workout.endedAt ?? workout.updatedAt) > target.acceptedAt) {
      return null;
    }
  }
  return target.weightKg;
}
