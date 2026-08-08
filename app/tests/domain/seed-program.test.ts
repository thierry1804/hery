import { describe, expect, it } from 'vitest';
import { buildProgramFromSeed } from '../../src/db/seed-program';

describe('buildProgramFromSeed', () => {
  it('builds the three seeded templates with warmups and stable item ids', () => {
    const ts = '2026-08-08T12:00:00.000Z';

    const program = buildProgramFromSeed(ts);

    expect(program.templates).toHaveLength(3);
    expect(program.templates.map((template) => template.id)).toEqual([
      'tpl-seance-a',
      'tpl-seance-b',
      'tpl-seance-c',
    ]);

    for (const template of program.templates) {
      const items = program.prescribedItems.filter(
        (item) => item.sessionTemplateId === template.id,
      );

      expect(items.filter((item) => item.kind === 'warmup')).toHaveLength(7);
      expect(items.find((item) => item.order === 1)?.id).toBe(`pi-${template.id}-1`);
      expect(items.find((item) => item.order === 10)?.id).toBe(`pi-${template.id}-10`);
      expect(items.find((item) => item.kind === 'stretch')).toMatchObject({
        id: `pi-${template.id}-1000`,
        order: 1000,
      });
    }

    expect(program.cycle.createdAt).toBe(ts);
    expect(program.prescribedItems.every((item) => item.updatedAt === ts)).toBe(true);
  });
});
