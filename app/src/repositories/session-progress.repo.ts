import { db } from '../db/db';

export interface SessionProgressState {
  itemIndex: number;
  setIndex: number;
  checkedOrders: number[];
  restEndsAt: number | null;
  pendingAdvance: boolean;
}

function key(workoutId: string): string {
  return `session-progress:${workoutId}`;
}

export async function loadProgress(workoutId: string): Promise<SessionProgressState> {
  const row = await db.settings.get(key(workoutId));
  if (row) return row.value as SessionProgressState;
  return { itemIndex: 0, setIndex: 1, checkedOrders: [], restEndsAt: null, pendingAdvance: false };
}

export async function saveProgress(workoutId: string, state: SessionProgressState): Promise<void> {
  await db.settings.put({ key: key(workoutId), value: state });
}

export async function clearProgress(workoutId: string): Promise<void> {
  await db.settings.delete(key(workoutId));
}
