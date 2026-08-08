import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

const origin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

app.use(
  '*',
  cors({
    origin,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
  }),
);

app.get('/health', (c) => c.json({ ok: true }));

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`hery-server listening on http://localhost:${info.port}`);
});

export { app };
