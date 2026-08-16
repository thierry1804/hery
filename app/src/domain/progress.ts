import { toDateStr } from '../lib/date';
import type { MuscleGroup } from '../db/schema';

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

export interface MuscleVolume {
  muscle: MuscleGroup;
  tonnageKg: number;
}

export interface StreakStats {
  currentStreakWeeks: number;
  activeDaysThisMonth: number;
}

export interface MuscleFatigue {
  muscle: MuscleGroup;
  fatiguePct: number | null;
  daysSinceLastTrained: number;
}

export interface ExerciseHistory {
  exerciseId: string;
  name: string;
  sessions: ExerciseSessionLift[];
}

export interface ProgressSnapshot {
  hasAnyCompletedWorkout: boolean;
  week: WeekStats;
  weekBars: WeekBar[];
  movers: Mover[];
  recentPrs: RecentPr[];
  lifts: LiftRow[];
  muscleBalance: MuscleVolume[];
  muscleFatigue: MuscleFatigue[];
  streak: StreakStats;
  exerciseHistories: ExerciseHistory[];
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

export function buildMuscleBalance(
  contributions: { muscle: MuscleGroup; tonnageKg: number }[],
): MuscleVolume[] {
  const totals = new Map<MuscleGroup, number>();
  for (const c of contributions) {
    totals.set(c.muscle, (totals.get(c.muscle) ?? 0) + c.tonnageKg);
  }
  return [...totals.entries()]
    .map(([muscle, tonnageKg]) => ({ muscle, tonnageKg }))
    .sort((a, b) => b.tonnageKg - a.tonnageKg);
}

const MAX_STREAK_WEEKS_LOOKBACK = 520; // ~10 ans, garde-fou contre boucle infinie

export function computeWeekStreak(
  workouts: { date: string; status: string }[],
  now: Date,
  target = WEEK_SESSION_TARGET,
): number {
  const completedDates = workouts.filter((w) => w.status === 'completed').map((w) => w.date);
  let streak = 0;
  let weekStart = startOfIsoWeek(now);
  let isCurrentWeek = true;
  for (let i = 0; i < MAX_STREAK_WEEKS_LOOKBACK; i++) {
    const start = toDateStr(weekStart);
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 7);
    const count = completedDates.filter((d) => d >= start && d < toDateStr(end)).length;
    if (count >= target) {
      streak++;
    } else if (!isCurrentWeek) {
      break;
    }
    isCurrentWeek = false;
    weekStart = new Date(weekStart);
    weekStart.setDate(weekStart.getDate() - 7);
  }
  return streak;
}

export function countActiveDaysInMonth(
  workouts: { date: string; status: string }[],
  now: Date,
): number {
  const yearMonth = toDateStr(now).slice(0, 7);
  const dates = new Set(
    workouts.filter((w) => w.status === 'completed' && w.date.startsWith(yearMonth)).map((w) => w.date),
  );
  return dates.size;
}

export function buildStreakStats(
  workouts: { date: string; status: string }[],
  now: Date,
): StreakStats {
  return {
    currentStreakWeeks: computeWeekStreak(workouts, now),
    activeDaysThisMonth: countActiveDaysInMonth(workouts, now),
  };
}

const FATIGUE_WINDOW_HOURS = 72;

function fatigueDecayWeight(hoursAgo: number): number {
  return Math.max(0, 1 - hoursAgo / FATIGUE_WINDOW_HOURS);
}

// Pas un modele physiologique : "fatigue" = volume recent (decroissance lineaire sur 72h)
// rapporte a la dose habituelle du muscle (moyenne du tonnage par seance historique).
// Un chiffre issu des donnees reelles de l'utilisateur, jamais une estimation IA opaque.
export function buildMuscleFatigue(
  contributions: { muscle: MuscleGroup; workoutId: string; tonnageKg: number; hoursAgo: number }[],
): MuscleFatigue[] {
  const recentWeighted = new Map<MuscleGroup, number>();
  const perWorkoutTonnage = new Map<MuscleGroup, Map<string, number>>();
  const minHoursAgo = new Map<MuscleGroup, number>();

  for (const c of contributions) {
    if (c.hoursAgo <= FATIGUE_WINDOW_HOURS) {
      recentWeighted.set(c.muscle, (recentWeighted.get(c.muscle) ?? 0) + c.tonnageKg * fatigueDecayWeight(c.hoursAgo));
    }
    let byWorkout = perWorkoutTonnage.get(c.muscle);
    if (!byWorkout) {
      byWorkout = new Map();
      perWorkoutTonnage.set(c.muscle, byWorkout);
    }
    byWorkout.set(c.workoutId, (byWorkout.get(c.workoutId) ?? 0) + c.tonnageKg);

    const prevMin = minHoursAgo.get(c.muscle);
    if (prevMin == null || c.hoursAgo < prevMin) minHoursAgo.set(c.muscle, c.hoursAgo);
  }

  const out: MuscleFatigue[] = [];
  for (const [muscle, byWorkout] of perWorkoutTonnage) {
    const sessionTonnages = [...byWorkout.values()];
    const baseline = sessionTonnages.reduce((s, t) => s + t, 0) / sessionTonnages.length;
    const weighted = recentWeighted.get(muscle) ?? 0;
    const fatiguePct = baseline > 0 ? Math.min(100, Math.round((weighted / baseline) * 100)) : null;
    out.push({
      muscle,
      fatiguePct,
      daysSinceLastTrained: Math.floor(minHoursAgo.get(muscle)! / 24),
    });
  }

  return out.sort((a, b) => (b.fatiguePct ?? -1) - (a.fatiguePct ?? -1));
}

