import { db } from '../db/db';
import type { Exercise } from '../db/schema';

export async function getAllExercises(): Promise<Exercise[]> {
  return db.exercises.filter((e) => e.deletedAt == null).toArray();
}

export async function getExerciseById(id: string): Promise<Exercise | undefined> {
  return db.exercises.get(id);
}

export async function getExercisesByIds(ids: string[]): Promise<Exercise[]> {
  const all = await db.exercises.bulkGet(ids);
  return all.filter((e): e is Exercise => e != null);
}
