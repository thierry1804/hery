import type { Exercise, ExerciseProgressionMemory } from '../../db/schema';

const STATUS_LINE: Record<ExerciseProgressionMemory['status'], (mem: ExerciseProgressionMemory) => string> = {
  hold: (mem) => {
    const load =
      mem.suggestedLoadKg != null
        ? `${mem.suggestedLoadKg.toLocaleString('fr-FR')} kg`
        : mem.currentLoadKg != null
          ? `${mem.currentLoadKg.toLocaleString('fr-FR')} kg`
          : null;
    return load
      ? `Maintiens ${load}, vise ${mem.targetReps[0]}–${mem.targetReps[1]} reps à RIR ${mem.targetRir[0]}–${mem.targetRir[1]}`
      : mem.lastReason;
  },
  increase: (mem) => mem.lastReason,
  decrease: (mem) => mem.lastReason,
  repeat: (mem) => mem.lastReason,
  watch: (mem) => mem.lastReason,
};

export const COACH_STATUS_LABEL: Record<ExerciseProgressionMemory['status'], string> = {
  hold: 'Consolider',
  increase: 'Augmenter',
  decrease: 'Réduire',
  repeat: 'Répéter',
  watch: 'Surveiller',
};

export function formatMemoryBriefText(mem: ExerciseProgressionMemory): string {
  return STATUS_LINE[mem.status](mem);
}

export function buildBriefLines(
  exerciseIds: string[],
  exercisesById: Map<string, Exercise>,
  memories: Map<string, ExerciseProgressionMemory>,
): { name: string; text: string }[] {
  const lines: { name: string; text: string }[] = [];
  const seen = new Set<string>();
  for (const id of exerciseIds) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const mem = memories.get(id);
    const name = exercisesById.get(id)?.name;
    if (!mem || !name) continue;
    lines.push({ name, text: formatMemoryBriefText(mem) });
  }
  return lines;
}
