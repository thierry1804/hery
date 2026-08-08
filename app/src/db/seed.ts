import { db } from './db';
import { newId } from '../lib/id';
import { nowIso } from '../lib/date';
import { SETTINGS_KEYS } from './schema';
import type { Exercise, ItemKind, PrescribedItem, ProgramCycle, SessionTemplate } from './schema';
import exercicesSeed from '../data/exercices.seed.json';
import programmeSeed from '../data/programme-fullbody-3j.seed.json';

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

interface RawItem {
  order: number;
  kind: ItemKind;
  exerciseId?: string;
  label?: string;
  sets?: number;
  repsTarget?: number;
  durationSec?: number;
  restSec?: number;
  perSide?: boolean;
  notes?: string;
}

export async function seedIfNeeded(): Promise<void> {
  const setting = await db.settings.get(SETTINGS_KEYS.seedVersion);
  if (setting && (setting.value as number) >= CURRENT_SEED_VERSION) return;

  const ts = nowIso();
  const common = { createdAt: ts, updatedAt: ts, deletedAt: null };

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

  const cycleRaw = programmeSeed.cycle;
  const cycle: ProgramCycle = {
    id: cycleRaw.id,
    name: cycleRaw.name,
    startDate: cycleRaw.startDate,
    weeks: cycleRaw.weeks,
    phases: cycleRaw.phases as ProgramCycle['phases'],
    active: cycleRaw.active,
    ...common,
  };

  const templates: SessionTemplate[] = [];
  const prescribedItems: PrescribedItem[] = [];

  const warmupItems = programmeSeed.warmupItems as RawItem[];
  const stretchItem = programmeSeed.stretchItem as RawItem;

  for (const tpl of programmeSeed.sessionTemplates) {
    templates.push({
      id: tpl.id,
      cycleId: tpl.cycleId,
      code: tpl.code as SessionTemplate['code'],
      label: tpl.label,
      dayOfWeek: tpl.dayOfWeek,
      targetDurationMin: tpl.targetDurationMin,
      ...common,
    });

    for (const w of warmupItems) {
      prescribedItems.push(toPrescribedItem(tpl.id, w));
    }

    for (const item of tpl.items as RawItem[]) {
      prescribedItems.push(toPrescribedItem(tpl.id, item));
    }

    prescribedItems.push(
      toPrescribedItem(tpl.id, { ...stretchItem, order: 1000 }),
    );
  }

  function toPrescribedItem(sessionTemplateId: string, item: RawItem): PrescribedItem {
    return {
      id: newId(),
      sessionTemplateId,
      order: item.order,
      kind: item.kind,
      exerciseId: item.exerciseId ?? null,
      label: item.label ?? '',
      sets: item.sets ?? null,
      repsTarget: item.repsTarget ?? null,
      repsRangeMin: null,
      repsRangeMax: null,
      durationSec: item.durationSec ?? null,
      restSec: item.restSec ?? 60,
      perSide: item.perSide ?? false,
      notes: item.notes ?? '',
      ...common,
    };
  }

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
