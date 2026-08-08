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

export interface ExerciseSessionLift {
  workoutDate: string;
  workoutId: string;
  maxWeightKg: number;
  repsAtMax: number;
  tonnageKg: number;
  hadPr: boolean;
  latestPrAt: string | null;
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

const MS_14 = 14 * 24 * 60 * 60 * 1000;
const MS_90 = 90 * 24 * 60 * 60 * 1000;

function sessionDateMs(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00.000Z`).getTime();
}

function computeHasRecentPr(sessions: ExerciseSessionLift[], now: Date): boolean {
  const nowMs = now.getTime();
  if (
    sessions.some(
      (s) => s.latestPrAt != null && nowMs - new Date(s.latestPrAt).getTime() <= MS_14,
    )
  ) {
    return true;
  }
  const last = sessions[sessions.length - 1];
  if (last?.hadPr && nowMs - sessionDateMs(last.workoutDate) <= MS_14) {
    return true;
  }
  return false;
}

export function selectMovers(
  rows: { exerciseId: string; name: string; sessions: ExerciseSessionLift[] }[],
  now: Date,
  limit = 3,
): Mover[] {
  const candidates = rows
    .filter((row) => row.sessions.length >= 2)
    .map((row) => {
      const prev = row.sessions[row.sessions.length - 2]!;
      const curr = row.sessions[row.sessions.length - 1]!;
      const prevMaxKg = prev.maxWeightKg;
      const currMaxKg = curr.maxWeightKg;
      const deltaKg = currMaxKg - prevMaxKg;
      const hasRecentPr = computeHasRecentPr(row.sessions, now);
      return {
        exerciseId: row.exerciseId,
        name: row.name,
        prevMaxKg,
        currMaxKg,
        deltaKg,
        hasRecentPr,
        relativeDelta: prevMaxKg > 0 ? Math.abs(deltaKg) / prevMaxKg : 0,
        currTonnageKg: curr.tonnageKg,
      };
    })
    .filter((m) => m.deltaKg !== 0 || m.hasRecentPr);

  candidates.sort((a, b) => {
    if (a.hasRecentPr !== b.hasRecentPr) return a.hasRecentPr ? -1 : 1;
    if (a.relativeDelta !== b.relativeDelta) return b.relativeDelta - a.relativeDelta;
    return b.currTonnageKg - a.currTonnageKg;
  });

  return candidates.slice(0, limit).map((c) => ({
    exerciseId: c.exerciseId,
    name: c.name,
    prevMaxKg: c.prevMaxKg,
    currMaxKg: c.currMaxKg,
    deltaKg: c.deltaKg,
    hasRecentPr: c.hasRecentPr,
  }));
}

export function buildLifts(
  rows: { exerciseId: string; name: string; sessions: ExerciseSessionLift[] }[],
): LiftRow[] {
  return rows.map((row) => {
    const curr = row.sessions[row.sessions.length - 1]!;
    if (row.sessions.length < 2) {
      return {
        exerciseId: row.exerciseId,
        name: row.name,
        lastWeightKg: curr.maxWeightKg,
        lastReps: curr.repsAtMax,
        prevMaxKg: null,
        deltaKg: null,
      };
    }
    const prev = row.sessions[row.sessions.length - 2]!;
    return {
      exerciseId: row.exerciseId,
      name: row.name,
      lastWeightKg: curr.maxWeightKg,
      lastReps: curr.repsAtMax,
      prevMaxKg: prev.maxWeightKg,
      deltaKg: curr.maxWeightKg - prev.maxWeightKg,
    };
  });
}

export function selectRecentPrs(prs: RecentPr[], now: Date, limit = 10): RecentPr[] {
  const cutoff = now.getTime() - MS_90;
  return prs
    .filter((p) => new Date(p.completedAt).getTime() >= cutoff)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, limit);
}
