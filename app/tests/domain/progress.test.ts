import { describe, expect, it } from 'vitest';
import {
  buildLifts,
  buildWeekBars,
  formatDeltaKg,
  formatTonnageKg,
  formatWeightKg,
  isoWeekStarts,
  selectMovers,
  selectRecentPrs,
  startOfIsoWeek,
  summarizeWeek,
  WEEK_SESSION_TARGET,
} from '../../src/domain/progress';
import { toDateStr } from '../../src/lib/date';

describe('progress domain', () => {
  it('startOfIsoWeek returns Monday for a Wednesday', () => {
    const wed = new Date(2026, 7, 5); // 2026-08-05 local
    expect(toDateStr(startOfIsoWeek(wed))).toBe('2026-08-03');
  });

  it('isoWeekStarts returns 4 Mondays ending with current week', () => {
    const wed = new Date(2026, 7, 5);
    expect(isoWeekStarts(wed, 4)).toEqual([
      '2026-07-13',
      '2026-07-20',
      '2026-07-27',
      '2026-08-03',
    ]);
  });

  it('formatTonnageKg uses tonnes from 1000', () => {
    expect(formatTonnageKg(850)).toBe('850 kg');
    expect(formatTonnageKg(1800)).toBe('1,8 t');
    expect(formatTonnageKg(1000)).toBe('1,0 t');
  });

  it('formatWeightKg uses FR comma', () => {
    expect(formatWeightKg(52.5)).toBe('52,5');
    expect(formatWeightKg(50)).toBe('50');
  });

  it('formatDeltaKg signs correctly', () => {
    expect(formatDeltaKg(2.5)).toBe('+2,5');
    expect(formatDeltaKg(-2.5)).toBe('−2,5');
    expect(formatDeltaKg(0)).toBe('=');
  });

  it('summarizeWeek counts completed workouts in current ISO week', () => {
    const now = new Date(2026, 7, 8); // Saturday
    const week = summarizeWeek(
      [
        { date: '2026-08-03', totalTonnageKg: 1000, status: 'completed' },
        { date: '2026-08-05', totalTonnageKg: 800, status: 'completed' },
        { date: '2026-07-28', totalTonnageKg: 500, status: 'completed' },
        { date: '2026-08-04', totalTonnageKg: 100, status: 'abandoned' },
      ],
      2,
      now,
    );
    expect(week).toEqual({
      sessionsDone: 2,
      sessionsTarget: WEEK_SESSION_TARGET,
      tonnageKg: 1800,
      prCount: 2,
    });
  });

  it('buildWeekBars fills four weeks including zeros', () => {
    const now = new Date(2026, 7, 8);
    const bars = buildWeekBars(
      [{ date: '2026-08-03', totalTonnageKg: 1000, status: 'completed' }],
      now,
    );
    expect(bars).toHaveLength(4);
    expect(bars[3]).toEqual({ weekStart: '2026-08-03', tonnageKg: 1000 });
    expect(bars[0]?.tonnageKg).toBe(0);
  });
});

describe('selectMovers', () => {
  const now = new Date('2026-08-08T12:00:00.000Z');

  it('needs two sessions and prefers recent PR then relative delta', () => {
    const movers = selectMovers(
      [
        {
          exerciseId: 'a',
          name: 'Presse',
          sessions: [
            { workoutDate: '2026-07-01', workoutId: '1', maxWeightKg: 50, repsAtMax: 10, tonnageKg: 1500, hadPr: false, latestPrAt: null },
            { workoutDate: '2026-08-01', workoutId: '2', maxWeightKg: 52.5, repsAtMax: 10, tonnageKg: 1575, hadPr: true, latestPrAt: '2026-08-01T10:00:00.000Z' },
          ],
        },
        {
          exerciseId: 'b',
          name: 'Row',
          sessions: [
            { workoutDate: '2026-07-01', workoutId: '1', maxWeightKg: 40, repsAtMax: 10, tonnageKg: 1200, hadPr: false, latestPrAt: null },
            { workoutDate: '2026-08-02', workoutId: '3', maxWeightKg: 40, repsAtMax: 10, tonnageKg: 1200, hadPr: false, latestPrAt: null },
          ],
        },
        {
          exerciseId: 'c',
          name: 'One',
          sessions: [
            { workoutDate: '2026-08-01', workoutId: '2', maxWeightKg: 100, repsAtMax: 5, tonnageKg: 500, hadPr: true, latestPrAt: '2026-08-01T10:00:00.000Z' },
          ],
        },
      ],
      now,
      3,
    );
    expect(movers.map((m) => m.exerciseId)).toEqual(['a']);
    expect(movers[0]?.deltaKg).toBe(2.5);
    expect(movers[0]?.hasRecentPr).toBe(true);
  });
});

describe('buildLifts', () => {
  it('includes single-session lifts with null delta', () => {
    const lifts = buildLifts([
      {
        exerciseId: 'c',
        name: 'One',
        sessions: [
          { workoutDate: '2026-08-01', workoutId: '2', maxWeightKg: 100, repsAtMax: 5, tonnageKg: 500, hadPr: true, latestPrAt: null },
        ],
      },
    ]);
    expect(lifts[0]).toMatchObject({
      exerciseId: 'c',
      lastWeightKg: 100,
      lastReps: 5,
      prevMaxKg: null,
      deltaKg: null,
    });
  });
});

describe('selectRecentPrs', () => {
  it('keeps last 90 days sorted desc', () => {
    const now = new Date('2026-08-08T12:00:00.000Z');
    const list = selectRecentPrs(
      [
        { setLogId: '1', exerciseId: 'a', name: 'A', weightKg: 50, reps: 10, completedAt: '2026-08-07T10:00:00.000Z', prKinds: ['weight'] },
        { setLogId: '2', exerciseId: 'b', name: 'B', weightKg: 60, reps: 8, completedAt: '2026-01-01T10:00:00.000Z', prKinds: ['weight'] },
        { setLogId: '3', exerciseId: 'c', name: 'C', weightKg: 70, reps: 6, completedAt: '2026-08-01T10:00:00.000Z', prKinds: ['reps'] },
      ],
      now,
      10,
    );
    expect(list.map((p) => p.setLogId)).toEqual(['1', '3']);
  });
});
