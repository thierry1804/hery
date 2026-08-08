import { describe, expect, it } from 'vitest';
import {
  buildWeekBars,
  formatDeltaKg,
  formatTonnageKg,
  formatWeightKg,
  isoWeekStarts,
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
