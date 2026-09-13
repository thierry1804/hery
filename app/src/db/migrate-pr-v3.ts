import { db } from './db';
import { SETTINGS_KEYS } from './schema';
import { recomputePrForExerciseChronologically } from '../repositories/workouts.repo';

export async function migratePrV3(): Promise<void> {
  const flag = await db.settings.get(SETTINGS_KEYS.prRulesMigratedV3);
  if (flag?.value === true) return;

  const workoutExercises = await db.workoutExercises.filter((we) => we.deletedAt == null).toArray();
  const exerciseIds = [...new Set(workoutExercises.map((we) => we.exerciseId))];
  for (const exerciseId of exerciseIds) {
    await recomputePrForExerciseChronologically(exerciseId);
  }

  await db.settings.put({ key: SETTINGS_KEYS.prRulesMigratedV3, value: true });
}
