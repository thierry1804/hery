import { describe, expect, it } from 'vitest';
import type { PrescribedItem } from '../../src/db/schema';
import { formatPrescription } from '../../src/features/program/formatPrescription';

const baseItem: PrescribedItem = {
  id: 'item-1',
  sessionTemplateId: 'template-1',
  order: 10,
  kind: 'strength',
  exerciseId: 'exercise-1',
  label: 'Presse',
  sets: 3,
  repsTarget: 8,
  repsRangeMin: null,
  repsRangeMax: null,
  durationSec: null,
  restSec: 90,
  perSide: false,
  notes: '',
  createdAt: '2026-08-08T00:00:00.000Z',
  updatedAt: '2026-08-08T00:00:00.000Z',
  deletedAt: null,
};

describe('formatPrescription', () => {
  it('formate les séries et répétitions avec le repos', () => {
    expect(formatPrescription(baseItem)).toBe('3×8 · 90 s');
  });

  it('formate une plage de répétitions', () => {
    expect(
      formatPrescription({
        ...baseItem,
        repsTarget: null,
        repsRangeMin: 8,
        repsRangeMax: 12,
      }),
    ).toBe('3×8–12 · 90 s');
  });

  it('exprime les durées longues en minutes', () => {
    expect(
      formatPrescription({
        ...baseItem,
        kind: 'cardio',
        sets: null,
        repsTarget: null,
        durationSec: 600,
        restSec: 0,
      }),
    ).toBe('10 min');
  });

  it('exprime les durées courtes en secondes', () => {
    expect(
      formatPrescription({
        ...baseItem,
        kind: 'core',
        sets: null,
        repsTarget: null,
        durationSec: 45,
        restSec: 30,
      }),
    ).toBe('45 s · 30 s');
  });

  it("n'affiche pas le repos d'un échauffement", () => {
    expect(
      formatPrescription({
        ...baseItem,
        kind: 'warmup',
        restSec: 30,
      }),
    ).toBe('3×8');
  });
});
