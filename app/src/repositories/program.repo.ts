import { db } from '../db/db';
import type { PrescribedItem, ProgramCycle, SessionTemplate } from '../db/schema';

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

export function currentPhase(cycle: ProgramCycle, date: Date = new Date()) {
  const weekNumber = Math.max(
    1,
    Math.ceil((date.getTime() - new Date(cycle.startDate).getTime()) / (7 * 24 * 3600 * 1000)) + 1,
  );
  return cycle.phases.find((p) => weekNumber >= p.fromWeek && weekNumber <= p.toWeek) ?? cycle.phases[0];
}
