import { db } from '../db/db';
import { getExercisesByIds } from './exercises.repo';
import { getMemoriesByExerciseIds, recomputeAllExerciseMemories } from './exercise-memory.repo';
import { buildBriefLines } from '../features/today/brief-lines';

export interface SessionBriefResult {
  lines: { name: string; text: string }[];
  painWatch: boolean;
}

/** Brief pre-seance : objectifs par exercice + alerte douleur recente, a partir des ids prescrits. */
export async function loadSessionBrief(exerciseIds: string[]): Promise<SessionBriefResult> {
  const unique = [...new Set(exerciseIds.filter(Boolean))];
  if (unique.length === 0) return { lines: [], painWatch: false };

  let memories = await getMemoriesByExerciseIds(unique);
  const missing = unique.some((id) => !memories.has(id));
  if (missing) {
    await recomputeAllExerciseMemories();
    memories = await getMemoriesByExerciseIds(unique);
  }

  const exs = await getExercisesByIds(unique);
  const exercisesById = new Map(exs.map((e) => [e.id, e]));
  const lines = buildBriefLines(unique, exercisesById, memories);

  const recent = await db.workouts
    .filter((w) => w.deletedAt == null && w.status === 'completed')
    .toArray();
  recent.sort((a, b) => (a.date < b.date ? 1 : -1));
  const painWatch = (recent[0]?.painLevel ?? 0) >= 5;
  return { lines, painWatch };
}
