import { db } from '../db/db';
import { mergeLww } from './merge';
import { DEXIE_SYNC_TABLES, SYNC_EXCLUDED_SETTING_KEYS } from './tables';
import type { SyncChanges, SyncRow } from './types';

export async function applyChanges(changes: SyncChanges): Promise<void> {
  for (const name of DEXIE_SYNC_TABLES) {
    const incoming = changes[name] ?? [];
    for (const row of incoming) {
      const local = await db[name].get(row.id);
      const merged = mergeLww(local as SyncRow | undefined, row);
      await db[name].put(merged as never);
    }
  }

  for (const row of changes.settings ?? []) {
    const key = typeof row.key === 'string' ? row.key : row.id;
    if (SYNC_EXCLUDED_SETTING_KEYS.has(key)) continue;
    await db.settings.put({ key, value: row.value });
  }
}
