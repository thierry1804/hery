import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/db/db';
import { buildProgramFromSeed } from '../../src/db/seed-program';
import {
  createPrescribedItem,
  reorderPrescribedItems,
  restoreProgramFromSeed,
  softDeletePrescribedItem,
  updateCycle,
  updatePrescribedItem,
  updateSessionTemplate,
} from '../../src/repositories/program.repo';

const seededAt = '2026-08-08T12:00:00.000Z';

beforeEach(async () => {
  await db.delete();
  await db.open();
  const { cycle, templates, prescribedItems } = buildProgramFromSeed(seededAt);
  await db.cycles.put(cycle);
  await db.sessionTemplates.bulkPut(templates);
  await db.prescribedItems.bulkPut(prescribedItems);
});

describe('program repository mutations', () => {
  it('updates a cycle name and timestamp', async () => {
    await updateCycle('cycle-fullbody-2026-08', { name: 'Nouveau cycle' });

    const cycle = await db.cycles.get('cycle-fullbody-2026-08');
    expect(cycle?.name).toBe('Nouveau cycle');
    expect(cycle?.updatedAt).not.toBe(seededAt);
  });

  it('updates the editable session template fields', async () => {
    await updateSessionTemplate('tpl-seance-a', {
      label: 'Séance du lundi',
      dayOfWeek: 1,
      targetDurationMin: 75,
    });

    expect(await db.sessionTemplates.get('tpl-seance-a')).toMatchObject({
      label: 'Séance du lundi',
      dayOfWeek: 1,
      targetDurationMin: 75,
    });
  });

  it('rejects a session day already used by another template', async () => {
    const other = await db.sessionTemplates.get('tpl-seance-b');

    await expect(
      updateSessionTemplate('tpl-seance-a', { dayOfWeek: other!.dayOfWeek }),
    ).rejects.toThrow('Ce jour est déjà pris par une autre séance.');
  });

  it('rejects an invalid session day before writing', async () => {
    await expect(updateSessionTemplate('tpl-seance-a', { dayOfWeek: 0 })).rejects.toThrow(
      'dayOfWeek must be between 1 and 7',
    );
    expect((await db.sessionTemplates.get('tpl-seance-a'))?.dayOfWeek).not.toBe(0);
  });

  it('creates and returns a validated prescribed item', async () => {
    const item = await createPrescribedItem('tpl-seance-a', {
      id: 'custom-item',
      order: 500,
      kind: 'strength',
      exerciseId: 'ex-squat',
      label: 'Squat',
      sets: 3,
      repsTarget: 8,
      repsRangeMin: null,
      repsRangeMax: null,
      durationSec: null,
      restSec: 90,
      perSide: false,
      notes: '',
    });

    expect(item).toMatchObject({
      id: 'custom-item',
      sessionTemplateId: 'tpl-seance-a',
      deletedAt: null,
    });
    expect(await db.prescribedItems.get('custom-item')).toEqual(item);
  });

  it('rejects an invalid prescribed item before creating it', async () => {
    await expect(
      createPrescribedItem('tpl-seance-a', {
        id: 'invalid-item',
        order: 500,
        kind: 'strength',
        exerciseId: 'ex-squat',
        label: 'Squat',
        sets: 0,
        repsTarget: 8,
        repsRangeMin: null,
        repsRangeMax: null,
        durationSec: null,
        restSec: 90,
        perSide: false,
        notes: '',
      }),
    ).rejects.toThrow('sets must be >= 1');
    expect(await db.prescribedItems.get('invalid-item')).toBeUndefined();
  });

  it('validates the merged prescribed item before updating it', async () => {
    const id = 'pi-tpl-seance-a-10';
    const original = await db.prescribedItems.get(id);

    await expect(updatePrescribedItem(id, { restSec: -1 })).rejects.toThrow(
      'restSec must be >= 0',
    );
    expect(await db.prescribedItems.get(id)).toEqual(original);

    await updatePrescribedItem(id, { sets: 4, restSec: 120 });
    expect(await db.prescribedItems.get(id)).toMatchObject({ sets: 4, restSec: 120 });
  });

  it('soft deletes a prescribed item', async () => {
    const id = 'pi-tpl-seance-a-10';
    await softDeletePrescribedItem(id);

    const item = await db.prescribedItems.get(id);
    expect(item?.deletedAt).not.toBeNull();
    expect(item?.updatedAt).toBe(item?.deletedAt);
  });

  it('reorders prescribed items in increments of ten', async () => {
    const ids = ['pi-tpl-seance-a-20', 'pi-tpl-seance-a-10', 'pi-tpl-seance-a-1'];
    await reorderPrescribedItems('tpl-seance-a', ids);

    await expect(Promise.all(ids.map((id) => db.prescribedItems.get(id)))).resolves.toEqual([
      expect.objectContaining({ order: 10 }),
      expect.objectContaining({ order: 20 }),
      expect.objectContaining({ order: 30 }),
    ]);
  });

  it('restores seeded templates and items while soft deleting custom items', async () => {
    await db.sessionTemplates.update('tpl-seance-a', { label: 'Personnalisée' });
    const custom = await createPrescribedItem('tpl-seance-a', {
      id: 'custom-item',
      order: 500,
      kind: 'cardio',
      exerciseId: null,
      label: 'Vélo',
      sets: null,
      repsTarget: null,
      repsRangeMin: null,
      repsRangeMax: null,
      durationSec: 600,
      restSec: 0,
      perSide: false,
      notes: '',
    });
    await softDeletePrescribedItem('pi-tpl-seance-a-10');

    await restoreProgramFromSeed();

    expect((await db.sessionTemplates.get('tpl-seance-a'))?.label).not.toBe('Personnalisée');
    expect((await db.prescribedItems.get(custom.id))?.deletedAt).not.toBeNull();
    expect((await db.prescribedItems.get('pi-tpl-seance-a-10'))?.deletedAt).toBeNull();
  });
});
