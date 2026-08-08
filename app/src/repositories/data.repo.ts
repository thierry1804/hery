import { db } from '../db/db';
import { nowIso } from '../lib/date';
import { SETTINGS_KEYS } from '../db/schema';

const SCHEMA_VERSION = 1;

// RG-24: l'export est toujours complet, jamais partiel.
export async function exportAll(): Promise<string> {
  const [
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
  ] = await Promise.all([
    db.exercises.toArray(),
    db.cycles.toArray(),
    db.sessionTemplates.toArray(),
    db.prescribedItems.toArray(),
    db.workouts.toArray(),
    db.workoutExercises.toArray(),
    db.setLogs.toArray(),
    db.cardioLogs.toArray(),
    db.bodyMetrics.toArray(),
    db.proteinEntries.toArray(),
    db.settings.toArray(),
  ]);

  const payload = {
    app: 'hery',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowIso(),
    counts: { workouts: workouts.length, setLogs: setLogs.length },
    data: {
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
    },
    photos: 'photos exportees separement (archive), jamais en base64 dans ce fichier',
  };

  await db.settings.put({ key: SETTINGS_KEYS.lastExportAt, value: payload.exportedAt });
  return JSON.stringify(payload, null, 2);
}

interface ExportPayload {
  app: string;
  schemaVersion: number;
  data: Record<string, unknown[]>;
}

// RG-25: remplacer ou fusionner selon choix explicite, jamais de fusion silencieuse.
export async function importAll(json: string, mode: 'replace' | 'merge'): Promise<void> {
  const payload = JSON.parse(json) as ExportPayload;
  if (payload.app !== 'hery') throw new Error('Fichier non reconnu');

  const tables = [
    db.exercises,
    db.cycles,
    db.sessionTemplates,
    db.prescribedItems,
    db.workouts,
    db.workoutExercises,
    db.setLogs,
    db.cardioLogs,
    db.bodyMetrics,
    db.proteinEntries,
    db.settings,
  ] as const;
  const keys = [
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

  await db.transaction('rw', tables, async () => {
    if (mode === 'replace') {
      for (const t of tables) await t.clear();
    }
    for (let i = 0; i < tables.length; i++) {
      const rows = payload.data[keys[i]!];
      if (Array.isArray(rows) && rows.length > 0) {
        const table = tables[i] as unknown as { bulkPut: (items: unknown[]) => Promise<unknown> };
        await table.bulkPut(rows);
      }
    }
  });
}

export async function getLastExportAt(): Promise<string | undefined> {
  const s = await db.settings.get(SETTINGS_KEYS.lastExportAt);
  return s?.value as string | undefined;
}
