import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL missing');

const sql = postgres(url, { prepare: false });

const syncTables = [
  'exercises',
  'cycles',
  'session_templates',
  'prescribed_items',
  'workouts',
  'workout_exercises',
  'set_logs',
  'cardio_logs',
  'body_metrics',
  'protein_entries',
  'settings',
] as const;

await sql`
  CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY,
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
  )
`;

for (const name of syncTables) {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS ${name} (
      id text PRIMARY KEY,
      user_id text NOT NULL,
      created_at text NOT NULL,
      updated_at text NOT NULL,
      deleted_at text,
      payload jsonb NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ${name}_user_updated_idx ON ${name} (user_id, updated_at);
  `);
  console.log(`${name} ready`);
}

console.log('schema ready');
await sql.end();
