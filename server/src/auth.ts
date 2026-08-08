import { eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { signToken, verifyToken } from './jwt';
import { users } from './schema';

function newUserId(): string {
  return `usr_${crypto.randomUUID().replace(/-/g, '')}`;
}

function normalizeEmail(email: unknown): string {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

function validateCredentials(email: string, password: unknown): void {
  if (!email || !email.includes('@')) {
    throw new HTTPException(400, { message: 'invalid email' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    throw new HTTPException(400, { message: 'password must be at least 8 characters' });
  }
}

export async function requireUser(c: Context): Promise<{ userId: string; email: string }> {
  const header = c.req.header('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new HTTPException(401, { message: 'unauthorized' });
  try {
    return await verifyToken(token);
  } catch {
    throw new HTTPException(401, { message: 'unauthorized' });
  }
}

export const authRoutes = new Hono();

authRoutes.post('/register', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();
  const email = normalizeEmail(body.email);
  validateCredentials(email, body.password);

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) throw new HTTPException(409, { message: 'email already registered' });

  const now = new Date().toISOString();
  const id = newUserId();
  const passwordHash = await bcrypt.hash(body.password as string, 10);

  await db.insert(users).values({
    id,
    email,
    passwordHash,
    createdAt: now,
    updatedAt: now,
  });

  const token = await signToken(id, email);
  return c.json({ token, user: { id, email } }, 201);
});

authRoutes.post('/login', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();
  const email = normalizeEmail(body.email);
  validateCredentials(email, body.password);

  const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = found[0];
  if (!user) throw new HTTPException(401, { message: 'invalid credentials' });

  const ok = await bcrypt.compare(body.password as string, user.passwordHash);
  if (!ok) throw new HTTPException(401, { message: 'invalid credentials' });

  const token = await signToken(user.id, user.email);
  return c.json({ token, user: { id: user.id, email: user.email } });
});

authRoutes.get('/me', async (c) => {
  const { userId, email } = await requireUser(c);
  return c.json({ user: { id: userId, email } });
});
