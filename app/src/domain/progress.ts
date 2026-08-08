import { toDateStr } from '../lib/date';

export const WEEK_SESSION_TARGET = 3;

export interface WeekStats {
  sessionsDone: number;
  sessionsTarget: number;
  tonnageKg: number;
  prCount: number;
}

export interface WeekBar {
  weekStart: string;
  tonnageKg: number;
}

export interface Mover {
  exerciseId: string;
  name: string;
  prevMaxKg: number;
  currMaxKg: number;
  deltaKg: number;
  hasRecentPr: boolean;
}

export interface RecentPr {
  setLogId: string;
  exerciseId: string;
  name: string;
  weightKg: number;
  reps: number;
  completedAt: string;
  prKinds: string[];
}

export interface LiftRow {
  exerciseId: string;
  name: string;
  lastWeightKg: number;
  lastReps: number;
  prevMaxKg: number | null;
  deltaKg: number | null;
}

export interface ProgressSnapshot {
  hasAnyCompletedWorkout: boolean;
  week: WeekStats;
  weekBars: WeekBar[];
  movers: Mover[];
  recentPrs: RecentPr[];
  lifts: LiftRow[];
}

export function startOfIsoWeek(d: Date): Date {
  const day = d.getDay() || 7; // Sun=7
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (day - 1));
  return start;
}

export function isoWeekStarts(now: Date, count: number): string[] {
  const current = startOfIsoWeek(now);
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(current);
    d.setDate(current.getDate() - i * 7);
    out.push(toDateStr(d));
  }
  return out;
}

export function formatTonnageKg(kg: number): string {
  if (kg >= 1000) {
    const t = kg / 1000;
    return `${t.toFixed(1).replace('.', ',')} t`;
  }
  return `${Math.round(kg)} kg`;
}

export function formatWeightKg(kg: number): string {
  return Number.isInteger(kg) ? String(kg) : kg.toFixed(1).replace('.', ',');
}

export function formatDeltaKg(delta: number): string {
  if (delta === 0) return '=';
  const abs = formatWeightKg(Math.abs(delta));
  return delta > 0 ? `+${abs}` : `−${abs}`;
}

export function summarizeWeek(
  workouts: { date: string; totalTonnageKg: number; status: string }[],
  prCount: number,
  now: Date,
): WeekStats {
  const weekStart = toDateStr(startOfIsoWeek(now));
  const done = workouts.filter((w) => w.status === 'completed' && w.date >= weekStart);
  return {
    sessionsDone: done.length,
    sessionsTarget: WEEK_SESSION_TARGET,
    tonnageKg: done.reduce((s, w) => s + w.totalTonnageKg, 0),
    prCount,
  };
}

export function buildWeekBars(
  workouts: { date: string; totalTonnageKg: number; status: string }[],
  now: Date,
): WeekBar[] {
  const starts = isoWeekStarts(now, 4);
  return starts.map((weekStart, idx) => {
    const nextStart = starts[idx + 1];
    const tonnageKg = workouts
      .filter((w) => {
        if (w.status !== 'completed') return false;
        if (w.date < weekStart) return false;
        if (nextStart && w.date >= nextStart) return false;
        return true;
      })
      .reduce((s, w) => s + w.totalTonnageKg, 0);
    return { weekStart, tonnageKg };
  });
}
