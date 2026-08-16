import { db } from '../db/db';

export interface SessionProgressState {
  itemIndex: number;
  setIndex: number;
  subIndex: number;
  checkedOrders: number[];
  restEndsAt: number | null;
  pendingAdvance: boolean;
}

const DEFAULT_STATE: SessionProgressState = {
  itemIndex: 0,
  setIndex: 1,
  subIndex: 0,
  checkedOrders: [],
  restEndsAt: null,
  pendingAdvance: false,
};

function key(workoutId: string): string {
  return `session-progress:${workoutId}`;
}

export async function loadProgress(workoutId: string): Promise<SessionProgressState> {
  const row = await db.settings.get(key(workoutId));
  // ...DEFAULT_STATE en base : retro-compatible avec un etat sauvegarde avant l'ajout de subIndex.
  if (row) return { ...DEFAULT_STATE, ...(row.value as Partial<SessionProgressState>) };
  return DEFAULT_STATE;
}

export async function saveProgress(workoutId: string, state: SessionProgressState): Promise<void> {
  await db.settings.put({ key: key(workoutId), value: state });
}

export async function clearProgress(workoutId: string): Promise<void> {
  await db.settings.delete(key(workoutId));
}
