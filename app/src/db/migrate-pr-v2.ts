import { db } from './db';
import { SETTINGS_KEYS } from './schema';
import { recomputePrForExerciseChronologically } from '../repositories/workouts.repo';

export async function migratePrV2(): Promise<void> {
  const flag = await db.settings.get(SETTINGS_KEYS.prRulesMigratedV2);
  if (flag?.value === true) return;

  const wes = await db.workoutExercises.filter((we) => we.deletedAt == null).toArray();
  const exerciseIds = [...new Set(wes.map((we) => we.exerciseId))];
  for (const exerciseId of exerciseIds) {
    await recomputePrForExerciseChronologically(exerciseId);
  }

  await db.settings.put({ key: SETTINGS_KEYS.prRulesMigratedV2, value: true });
}
