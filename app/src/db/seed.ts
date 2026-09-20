import { db } from './db';
import { nowIso } from '../lib/date';
import { SETTINGS_KEYS } from './schema';
import type { Exercise, LoadSemantics } from './schema';
import { buildProgramFromSeed } from './seed-program';
import exercicesSeed from '../data/exercices.seed.json';

const CURRENT_SEED_VERSION = 1;

interface RawExercise {
  id: string;
  name: string;
  equipment: Exercise['equipment'];
  loadType: Exercise['loadType'];
  unilateral: boolean;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  defaultIncrementKg: number;
  alternativeIds: string[];
  cues: string[];
  loadSemantics?: LoadSemantics;
  minReps?: number | null;
  maxReps?: number | null;
  targetRirMin?: number | null;
  targetRirMax?: number | null;
}

function defaultSemantics(e: Pick<RawExercise, 'id' | 'equipment' | 'loadSemantics'>): LoadSemantics {
  if (e.loadSemantics) return e.loadSemantics;
  if (e.id === 'ex-dips-assistes') return 'assistance';
  if (e.equipment === 'machine') return 'machine_resistance';
  if (e.equipment === 'bodyweight') return 'bodyweight';
  return 'external_weight';
}

export async function seedIfNeeded(): Promise<void> {
  const setting = await db.settings.get(SETTINGS_KEYS.seedVersion);
  if (setting && (setting.value as number) >= CURRENT_SEED_VERSION) return;

  const ts = nowIso();
  const common = { createdAt: ts, updatedAt: ts, deletedAt: null };
  const { cycle, templates, prescribedItems } = buildProgramFromSeed(ts);

  const exercises: Exercise[] = (exercicesSeed.exercises as RawExercise[]).map((e) => ({
    id: e.id,
    name: e.name,
    equipment: e.equipment,
    loadType: e.loadType,
    unilateral: e.unilateral,
    primaryMuscles: e.primaryMuscles as Exercise['primaryMuscles'],
    secondaryMuscles: e.secondaryMuscles as Exercise['secondaryMuscles'],
    defaultIncrementKg: e.defaultIncrementKg,
    alternativeIds: e.alternativeIds,
    cues: e.cues,
    loadSemantics: defaultSemantics(e),
    minReps: e.minReps ?? null,
    maxReps: e.maxReps ?? null,
    targetRirMin: e.targetRirMin ?? null,
    targetRirMax: e.targetRirMax ?? null,
    ...common,
  }));

  await db.transaction(
    'rw',
    [db.exercises, db.cycles, db.sessionTemplates, db.prescribedItems, db.settings],
    async () => {
      await db.exercises.bulkPut(exercises);
      await db.cycles.put(cycle);
      await db.sessionTemplates.bulkPut(templates);
      await db.prescribedItems.bulkPut(prescribedItems);
      await db.settings.put({ key: SETTINGS_KEYS.seedVersion, value: CURRENT_SEED_VERSION });
    },
  );
}

/** Patch existing installs without wiping history. */
export async function ensureExerciseLoadSemantics(): Promise<void> {
  const all = await db.exercises.toArray();
  const ts = nowIso();
  for (const ex of all) {
    if (ex.loadSemantics) continue;
    const loadSemantics = defaultSemantics(ex);
    const patch: Partial<Exercise> = { loadSemantics, updatedAt: ts };
    if (ex.id === 'ex-dips-assistes') {
      patch.minReps = ex.minReps ?? 8;
      patch.maxReps = ex.maxReps ?? 15;
      patch.targetRirMin = ex.targetRirMin ?? 1;
      patch.targetRirMax = ex.targetRirMax ?? 2;
    }
    await db.exercises.update(ex.id, patch);
  }
}
