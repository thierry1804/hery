import { db } from '../db/db';
import { DEXIE_SYNC_TABLES, SYNC_EXCLUDED_SETTING_KEYS } from './tables';
import { SYNC_TABLE_NAMES, type SyncChanges, type SyncRow } from './types';

function emptyChanges(): SyncChanges {
  return Object.fromEntries(SYNC_TABLE_NAMES.map((name) => [name, []])) as unknown as SyncChanges;
}

export async function collectChanges(since: string): Promise<SyncChanges> {
  const changes = emptyChanges();

  for (const name of DEXIE_SYNC_TABLES) {
    const rows = await db[name].toArray();
    changes[name] = rows
      .filter((row) => row.updatedAt > since)
      .map((row) => ({ ...row }) as SyncRow);
  }

  // Settings are tiny; always push non-excluded keys (no updatedAt in Dexie schema).
  const now = new Date().toISOString();
  const epoch = '1970-01-01T00:00:00.000Z';
  const settings = await db.settings.toArray();
  changes.settings = settings
    .filter((s) => !SYNC_EXCLUDED_SETTING_KEYS.has(s.key))
    .map(
      (s) =>
        ({
          id: s.key,
          key: s.key,
          value: s.value,
          createdAt: epoch,
          updatedAt: now,
          deletedAt: null,
        }) satisfies SyncRow,
    );

  return changes;
}
