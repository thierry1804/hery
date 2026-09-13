import { describe, expect, it } from 'vitest';
import {
  deriveHistoricalStatus,
  statusAfterLeaveWithSets,
  statusAfterLogSet,
  statusAfterSkip,
} from '../../src/domain/workout-exercise-status';

describe('workout-exercise-status', () => {
  it('logSet: planned/started → started ; skipped reste skipped', () => {
    expect(statusAfterLogSet('planned')).toBe('started');
    expect(statusAfterLogSet('started')).toBe('started');
    expect(statusAfterLogSet('completed')).toBe('started');
    expect(statusAfterLogSet('skipped')).toBe('started');
  });

  it('skip: planned/started → skipped', () => {
    expect(statusAfterSkip('planned')).toBe('skipped');
    expect(statusAfterSkip('started')).toBe('skipped');
    expect(statusAfterSkip('completed')).toBe('skipped');
    expect(statusAfterSkip('skipped')).toBe('skipped');
  });

  it('leave with sets: started → completed si hasAnySet', () => {
    expect(statusAfterLeaveWithSets('started', true)).toBe('completed');
    expect(statusAfterLeaveWithSets('started', false)).toBe('started');
    expect(statusAfterLeaveWithSets('planned', false)).toBe('planned');
    expect(statusAfterLeaveWithSets('skipped', true)).toBe('skipped');
  });

  it('historique: séries travail → completed, sinon planned', () => {
    expect(deriveHistoricalStatus(true)).toBe('completed');
    expect(deriveHistoricalStatus(false)).toBe('planned');
  });
});
