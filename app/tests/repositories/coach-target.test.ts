import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/db/db';
import { acceptCoachTarget, getAcceptedCoachTarget } from '../../src/repositories/coach-target.repo';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('coach target repository', () => {
  it('retourne la charge acceptée tant qu’aucune séance postérieure n’est terminée', async () => {
    await acceptCoachTarget('press', 62.5);
    expect(await getAcceptedCoachTarget('press')).toBe(62.5);
  });

  it('expire la charge après une séance terminée postérieure à son acceptation', async () => {
    await acceptCoachTarget('press', 62.5);
    await db.workouts.put({
      id: 'workout', sessionTemplateId: null, templateSnapshot: [], date: '2099-01-01', startedAt: null,
      endedAt: '2099-01-01T12:00:00.000Z', status: 'completed', bodyweightKg: null,
      fatigueLevel: null, painLevel: null, painArea: '', isDeload: false, totalTonnageKg: 0, notes: '',
      createdAt: '2099-01-01T10:00:00.000Z', updatedAt: '2099-01-01T12:00:00.000Z', deletedAt: null,
    });
    await db.workoutExercises.put({
      id: 'we', workoutId: 'workout', exerciseId: 'press', substitutedFromId: null, order: 1,
      machineSettings: '', sessionRpe: null, note: '', completionStatus: 'completed',
      createdAt: '2099-01-01T10:00:00.000Z', updatedAt: '2099-01-01T12:00:00.000Z', deletedAt: null,
    });
    expect(await getAcceptedCoachTarget('press')).toBeNull();
  });
});
