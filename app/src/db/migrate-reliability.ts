import { db } from './db';
import { SETTINGS_KEYS } from './schema';
import { deriveHistoricalStatus } from '../domain/workout-exercise-status';
import { setCountsTowardTonnage } from '../domain/tonnage';
import { recomputeWorkoutTonnage } from '../repositories/workouts.repo';

export async function migrateDataReliabilityV1(): Promise<void> {
  const flag = await db.settings.get(SETTINGS_KEYS.dataReliabilityMigratedV1);
  if (flag?.value === true) return;

  const workouts = await db.workouts
    .filter((w) => w.deletedAt == null && w.status === 'completed')
    .toArray();

  for (const w of workouts) {
    await recomputeWorkoutTonnage(w.id);
  }

  const wes = await db.workoutExercises.filter((we) => we.deletedAt == null).toArray();
  for (const we of wes) {
    const sets = await db.setLogs.where('workoutExerciseId').equals(we.id).toArray();
    const hasWorking = sets.some((s) => setCountsTowardTonnage(s));
    const status = deriveHistoricalStatus(hasWorking);
    if (we.completionStatus !== status) {
      await db.workoutExercises.update(we.id, { completionStatus: status });
    }
  }

  await db.settings.put({ key: SETTINGS_KEYS.dataReliabilityMigratedV1, value: true });
}
