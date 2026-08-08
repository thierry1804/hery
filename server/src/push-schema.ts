import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL missing');

const sql = postgres(url, { prepare: false });

await sql`
  CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY,
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
  )
`;

console.log('users table ready');
await sql.end();
