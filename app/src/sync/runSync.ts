import { db } from '../db/db';
import { SETTINGS_KEYS } from '../db/schema';
import { apiPull, apiPush } from './api';
import { applyChanges } from './apply';
import { collectChanges } from './collect';
import { getToken } from './token';

const EPOCH = '1970-01-01T00:00:00.000Z';

export async function runSync(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!getToken()) return { ok: false, error: 'not_authenticated' };

  try {
    const sinceSetting = await db.settings.get(SETTINGS_KEYS.lastSyncedAt);
    const since = typeof sinceSetting?.value === 'string' ? sinceSetting.value : EPOCH;

    const changes = await collectChanges(since);
    await apiPush(changes);
    const pull = await apiPull(since);
    await applyChanges(pull.changes);

    await db.settings.put({ key: SETTINGS_KEYS.lastSyncedAt, value: pull.serverTime });
    await db.settings.put({ key: SETTINGS_KEYS.lastSyncStatus, value: 'ok' });
    return { ok: true };
  } catch (e) {
    await db.settings.put({ key: SETTINGS_KEYS.lastSyncStatus, value: 'error' });
    return { ok: false, error: e instanceof Error ? e.message : 'sync_failed' };
  }
}
