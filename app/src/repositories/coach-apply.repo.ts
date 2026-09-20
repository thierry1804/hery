import { db } from '../db/db';
import type { ExerciseProgressionMemory } from '../db/schema';
import { nowIso } from '../lib/date';
import { acceptCoachTarget } from './coach-target.repo';
import { getMemoriesByExerciseIds } from './exercise-memory.repo';
import { updatePrescribedItem } from './program.repo';
import { getWorkoutExercises } from './workouts.repo';

const ACTIONABLE: ReadonlySet<ExerciseProgressionMemory['status']> = new Set([
  'increase',
  'decrease',
  'hold',
  'repeat',
]);

export interface CoachProposalLine {
  exerciseId: string;
  name: string;
  status: ExerciseProgressionMemory['status'];
  text: string;
  suggestedLoadKg: number | null;
  targetReps: [number, number];
  targetRir: [number, number];
  appliedLoad: boolean;
  appliedProgram: boolean;
}

async function exerciseIdsForWorkout(workoutId: string): Promise<string[]> {
  const wes = await getWorkoutExercises(workoutId);
  return [...new Set(wes.map((we) => we.exerciseId).filter(Boolean))];
}

/** Brief post-séance : mémoires des exercices réalisés. */
export async function getWorkoutCoachBrief(workoutId: string): Promise<CoachProposalLine[]> {
  const ids = await exerciseIdsForWorkout(workoutId);
  if (ids.length === 0) return [];

  const memories = await getMemoriesByExerciseIds(ids);
  const exercises = await db.exercises.bulkGet(ids);
  const byId = new Map(exercises.filter(Boolean).map((e) => [e!.id, e!]));

  const lines: CoachProposalLine[] = [];
  for (const id of ids) {
    const mem = memories.get(id);
    const name = byId.get(id)?.name;
    if (!mem || !name) continue;
    lines.push({
      exerciseId: id,
      name,
      status: mem.status,
      text: mem.lastReason,
      suggestedLoadKg: mem.suggestedLoadKg,
      targetReps: mem.targetReps,
      targetRir: mem.targetRir,
      appliedLoad: false,
      appliedProgram: false,
    });
  }
  return lines;
}

/**
 * Acte les propositions coach :
 * - charge retenue pour la prochaine séance (progression)
 * - plage reps / RIR sur les items de programme + fiche exercice
 */
export async function applyCoachProposalsForWorkout(workoutId: string): Promise<CoachProposalLine[]> {
  const ids = await exerciseIdsForWorkout(workoutId);
  if (ids.length === 0) return [];

  const memories = await getMemoriesByExerciseIds(ids);
  const exercises = await db.exercises.bulkGet(ids);
  const byId = new Map(exercises.filter(Boolean).map((e) => [e!.id, e!]));
  const allItems = (await db.prescribedItems.toArray()).filter((i) => i.deletedAt == null);
  const ts = nowIso();
  const lines: CoachProposalLine[] = [];

  for (const id of ids) {
    const mem = memories.get(id);
    const exercise = byId.get(id);
    if (!mem || !exercise) continue;

    let appliedLoad = false;
    let appliedProgram = false;

    if (ACTIONABLE.has(mem.status) && mem.suggestedLoadKg != null) {
      await acceptCoachTarget(id, mem.suggestedLoadKg);
      appliedLoad = true;
    }

    const related = allItems.filter((item) => item.exerciseId === id && (item.kind === 'strength' || item.kind === 'core'));
    for (const item of related) {
      try {
        await updatePrescribedItem(item.id, {
          repsTarget: null,
          repsRangeMin: mem.targetReps[0],
          repsRangeMax: mem.targetReps[1],
        });
        appliedProgram = true;
      } catch {
        // Item invalide (ex. sans sets) : on ignore sans bloquer la fin de séance.
      }
    }

    await db.exercises.update(id, {
      minReps: mem.targetReps[0],
      maxReps: mem.targetReps[1],
      targetRirMin: mem.targetRir[0],
      targetRirMax: mem.targetRir[1],
      updatedAt: ts,
    });

    lines.push({
      exerciseId: id,
      name: exercise.name,
      status: mem.status,
      text: mem.lastReason,
      suggestedLoadKg: mem.suggestedLoadKg,
      targetReps: mem.targetReps,
      targetRir: mem.targetRir,
      appliedLoad,
      appliedProgram,
    });
  }

  return lines;
}
