import { db } from '../db/db';
import type { SyncTableName } from './types';

export const SYNC_EXCLUDED_SETTING_KEYS = new Set([
  'lastSyncedAt',
  'lastSyncStatus',
  'seedVersion',
]);

export type DexieSyncTable = Exclude<SyncTableName, 'settings'>;

export const DEXIE_SYNC_TABLES: DexieSyncTable[] = [
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
];

export function tableOf(name: DexieSyncTable) {
  return db[name];
}
