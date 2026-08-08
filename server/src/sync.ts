import { and, eq, gt } from 'drizzle-orm';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { requireUser } from './auth';
import { db } from './db';
import { SYNC_TABLE_NAMES, SYNC_TABLES, type SyncRow, type SyncTableName } from './syncTables';

export const syncRoutes = new Hono();

function emptyChanges(): Record<SyncTableName, SyncRow[]> {
  return Object.fromEntries(SYNC_TABLE_NAMES.map((name) => [name, []])) as Record<
    SyncTableName,
    SyncRow[]
  >;
}

syncRoutes.post('/push', async (c) => {
  const { userId } = await requireUser(c);
  const body = await c.req.json<{ changes?: Partial<Record<SyncTableName, SyncRow[]>> }>();
  const changes = body.changes ?? {};

  let accepted = 0;
  let rejected = 0;

  for (const name of SYNC_TABLE_NAMES) {
    const rows = changes[name] ?? [];
    const table = SYNC_TABLES[name];

    for (const row of rows) {
      if (!row || typeof row.id !== 'string' || typeof row.updatedAt !== 'string') {
        rejected++;
        continue;
      }
      if (typeof row.createdAt !== 'string') {
        rejected++;
        continue;
      }

      const payload = { ...row, id: row.id };
      const existing = await db
        .select()
        .from(table)
        .where(and(eq(table.id, row.id), eq(table.userId, userId)))
        .limit(1);

      const current = existing[0] as
        | { updatedAt: string; userId: string }
        | undefined;

      if (current && row.updatedAt < current.updatedAt) {
        rejected++;
        continue;
      }

      await db
        .insert(table)
        .values({
          id: row.id,
          userId,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          deletedAt: row.deletedAt ?? null,
          payload,
        })
        .onConflictDoUpdate({
          target: table.id,
          set: {
            userId,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            deletedAt: row.deletedAt ?? null,
            payload,
          },
        });
      accepted++;
    }
  }

  return c.json({ accepted, rejected });
});

syncRoutes.get('/pull', async (c) => {
  const { userId } = await requireUser(c);
  const since = c.req.query('since') ?? '1970-01-01T00:00:00.000Z';
  if (Number.isNaN(Date.parse(since))) {
    throw new HTTPException(400, { message: 'invalid since' });
  }

  const changes = emptyChanges();

  for (const name of SYNC_TABLE_NAMES) {
    const table = SYNC_TABLES[name];
    const rows = await db
      .select()
      .from(table)
      .where(and(eq(table.userId, userId), gt(table.updatedAt, since)));

    changes[name] = rows.map((r: { payload: SyncRow }) => r.payload);
  }

  return c.json({ changes, serverTime: new Date().toISOString() });
});
