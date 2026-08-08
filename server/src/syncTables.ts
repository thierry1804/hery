import {
  bodyMetrics,
  cardioLogs,
  cycles,
  exercises,
  prescribedItems,
  proteinEntries,
  sessionTemplates,
  setLogs,
  settings,
  workoutExercises,
  workouts,
} from './schema';

export const SYNC_TABLE_NAMES = [
  'exercises',
  'cycles',
  'sessionTemplates',
  'prescribedItems',
  'workouts',
  'workoutExercises',
  'setLogs',
  'cardioLogs',
  'bodyMetrics',
  'proteinEntries',
  'settings',
] as const;

export type SyncTableName = (typeof SYNC_TABLE_NAMES)[number];

// drizzle table typing varies by version; keep practical
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SYNC_TABLES: Record<SyncTableName, any> = {
  exercises,
  cycles,
  sessionTemplates,
  prescribedItems,
  workouts,
  workoutExercises,
  setLogs,
  cardioLogs,
  bodyMetrics,
  proteinEntries,
  settings,
};

export type SyncRow = {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  [key: string]: unknown;
};
