import programmeSeed from '../data/programme-fullbody-3j.seed.json';
import type { ItemKind, PrescribedItem, ProgramCycle, SessionTemplate } from './schema';

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

export function buildProgramFromSeed(ts: string): {
  cycle: ProgramCycle;
  templates: SessionTemplate[];
  prescribedItems: PrescribedItem[];
} {
  const common = { createdAt: ts, updatedAt: ts, deletedAt: null };
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

  for (const templateSeed of programmeSeed.sessionTemplates) {
    const template: SessionTemplate = {
      id: templateSeed.id,
      cycleId: templateSeed.cycleId,
      code: templateSeed.code as SessionTemplate['code'],
      label: templateSeed.label,
      dayOfWeek: templateSeed.dayOfWeek,
      targetDurationMin: templateSeed.targetDurationMin,
      ...common,
    };
    templates.push(template);

    for (const item of warmupItems) {
      prescribedItems.push(toPrescribedItem(template.id, item, common));
    }
    for (const item of templateSeed.items as RawItem[]) {
      prescribedItems.push(toPrescribedItem(template.id, item, common));
    }
    prescribedItems.push(
      toPrescribedItem(template.id, { ...stretchItem, order: 1000 }, common),
    );
  }

  return { cycle, templates, prescribedItems };
}

function toPrescribedItem(
  sessionTemplateId: string,
  item: RawItem,
  common: { createdAt: string; updatedAt: string; deletedAt: null },
): PrescribedItem {
  return {
    id: `pi-${sessionTemplateId}-${item.order}`,
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
