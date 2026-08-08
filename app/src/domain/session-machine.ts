import { hoursSince } from '../lib/date';
import type { Workout } from '../db/schema';

const ABANDON_AFTER_HOURS = 6;
const RESUMABLE_WINDOW_HOURS = 24;

// RG-09: une seance sans activite depuis plus de 6h passe automatiquement en abandonnee
// mais reste consultable et reprenable pendant 24h.
export function shouldAutoAbandon(workout: Pick<Workout, 'status' | 'updatedAt'>): boolean {
  if (workout.status !== 'in_progress') return false;
  return hoursSince(workout.updatedAt) > ABANDON_AFTER_HOURS;
}

export function canResume(workout: Pick<Workout, 'status' | 'updatedAt'>): boolean {
  if (workout.status === 'in_progress') return true;
  if (workout.status === 'abandoned') return hoursSince(workout.updatedAt) <= RESUMABLE_WINDOW_HOURS;
  return false;
}

export type ItemProgressKind = 'warmup' | 'strength' | 'core' | 'cardio' | 'stretch';

export interface SessionProgress {
  currentIndex: number;
  total: number;
}

export function isSessionComplete(progress: SessionProgress): boolean {
  return progress.currentIndex >= progress.total;
}
