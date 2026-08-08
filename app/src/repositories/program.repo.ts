import { db } from '../db/db';
import { buildProgramFromSeed } from '../db/seed-program';
import type { PrescribedItem, ProgramCycle, SessionTemplate } from '../db/schema';
import { validateDayOfWeek, validateItemPatch } from '../domain/program-validation';
import { nowIso } from '../lib/date';
import { newId } from '../lib/id';

type PrescribedItemInput = Omit<
  PrescribedItem,
  'id' | 'sessionTemplateId' | 'createdAt' | 'updatedAt' | 'deletedAt'
> & { id?: string };

type PrescribedItemPatch = Partial<Omit<PrescribedItemInput, 'id'>>;

function assertValid(result: ReturnType<typeof validateItemPatch>): void {
  if (!result.ok) throw new Error(result.error);
}

export async function getActiveCycle(): Promise<ProgramCycle | undefined> {
  return db.cycles.filter((c) => c.active && c.deletedAt == null).first();
}

export async function getTemplateForDay(dayOfWeek: number): Promise<SessionTemplate | undefined> {
  return db.sessionTemplates.filter((t) => t.dayOfWeek === dayOfWeek && t.deletedAt == null).first();
}

export async function getTemplateById(id: string): Promise<SessionTemplate | undefined> {
  return db.sessionTemplates.get(id);
}

export async function getAllTemplates(): Promise<SessionTemplate[]> {
  const all = await db.sessionTemplates.filter((t) => t.deletedAt == null).toArray();
  return all.sort((a, b) => a.code.localeCompare(b.code));
}

export async function getPrescribedItems(sessionTemplateId: string): Promise<PrescribedItem[]> {
  const items = await db.prescribedItems
    .where('sessionTemplateId')
    .equals(sessionTemplateId)
    .toArray();
  return items.filter((i) => i.deletedAt == null).sort((a, b) => a.order - b.order);
}

export async function updateCycle(
  id: string,
  patch: Partial<Pick<ProgramCycle, 'name'>>,
): Promise<void> {
  await db.cycles.update(id, { ...patch, updatedAt: nowIso() });
}

export async function updateSessionTemplate(
  id: string,
  patch: Partial<Pick<SessionTemplate, 'label' | 'dayOfWeek' | 'targetDurationMin'>>,
): Promise<void> {
  if (patch.dayOfWeek !== undefined) {
    const validation = validateDayOfWeek(patch.dayOfWeek);
    if (!validation.ok) throw new Error(validation.error);

    const others = await getAllTemplates();
    if (others.some((template) => template.id !== id && template.dayOfWeek === patch.dayOfWeek)) {
      throw new Error('Ce jour est déjà pris par une autre séance.');
    }
  }

  await db.sessionTemplates.update(id, { ...patch, updatedAt: nowIso() });
}

export async function createPrescribedItem(
  sessionTemplateId: string,
  input: PrescribedItemInput,
): Promise<PrescribedItem> {
  assertValid(validateItemPatch(input));

  const timestamp = nowIso();
  const item: PrescribedItem = {
    ...input,
    id: input.id ?? newId(),
    sessionTemplateId,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  };
  await db.prescribedItems.add(item);
  return item;
}

export async function updatePrescribedItem(
  id: string,
  patch: PrescribedItemPatch,
): Promise<void> {
  const current = await db.prescribedItems.get(id);
  if (!current) return;

  assertValid(validateItemPatch({ ...current, ...patch }));
  await db.prescribedItems.update(id, { ...patch, updatedAt: nowIso() });
}

export async function softDeletePrescribedItem(id: string): Promise<void> {
  const timestamp = nowIso();
  await db.prescribedItems.update(id, { deletedAt: timestamp, updatedAt: timestamp });
}

export async function reorderPrescribedItems(
  sessionTemplateId: string,
  orderedIds: string[],
): Promise<void> {
  const timestamp = nowIso();
  await db.transaction('rw', db.prescribedItems, async () => {
    const items = await db.prescribedItems.bulkGet(orderedIds);
    await Promise.all(
      items.map((item, index) => {
        if (!item || item.sessionTemplateId !== sessionTemplateId) return Promise.resolve(0);
        return db.prescribedItems.update(item.id, {
          order: (index + 1) * 10,
          updatedAt: timestamp,
        });
      }),
    );
  });
}

export async function restoreProgramFromSeed(): Promise<void> {
  const timestamp = nowIso();
  const { templates, prescribedItems } = buildProgramFromSeed(timestamp);

  await db.transaction(
    'rw',
    [db.cycles, db.sessionTemplates, db.prescribedItems],
    async () => {
      const activeCycle = await db.cycles.filter((cycle) => cycle.active && cycle.deletedAt == null).first();
      if (!activeCycle) return;

      const activeTemplates = await db.sessionTemplates
        .where('cycleId')
        .equals(activeCycle.id)
        .toArray();
      const templateIds = activeTemplates.map((template) => template.id);
      const existingItems = await db.prescribedItems
        .where('sessionTemplateId')
        .anyOf(templateIds)
        .toArray();

      await db.prescribedItems.bulkPut(
        existingItems.map((item) => ({
          ...item,
          updatedAt: timestamp,
          deletedAt: timestamp,
        })),
      );
      await db.sessionTemplates.bulkPut(templates);
      await db.prescribedItems.bulkPut(prescribedItems);
    },
  );
}

export function currentPhase(cycle: ProgramCycle, date: Date = new Date()) {
  const weekNumber = Math.max(
    1,
    Math.ceil((date.getTime() - new Date(cycle.startDate).getTime()) / (7 * 24 * 3600 * 1000)) + 1,
  );
  return cycle.phases.find((p) => weekNumber >= p.fromWeek && weekNumber <= p.toWeek) ?? cycle.phases[0];
}
