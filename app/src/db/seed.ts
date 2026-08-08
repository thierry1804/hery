import { db } from './db';
import { nowIso } from '../lib/date';
import { SETTINGS_KEYS } from './schema';
import type { Exercise } from './schema';
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
