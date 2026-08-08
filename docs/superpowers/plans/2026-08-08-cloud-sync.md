# Cloud Sync (Dexie ↔ Neon) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auth email/mdp + sync bidirectionnelle LWW entre Dexie (hors-ligne) et Neon via une API Hono, sans bloquer la séance.

**Architecture:** Package `server/` (Hono + Drizzle + Neon) expose auth JWT et `push`/`pull`. Client `app/src/sync/` orchestre push des rows locales dirty puis pull/merge LWW. JWT en `localStorage` uniquement. Photos hors sync.

**Tech Stack:** Hono, Drizzle ORM, `postgres` (Neon), bcryptjs, jose (JWT), Vitest (client merge), React Router, Dexie existant.

## Global Constraints

- Spec : `docs/superpowers/specs/2026-08-08-cloud-sync-design.md`
- Dexie reste source de vérité en séance ; sync non bloquante
- `DATABASE_URL` / `JWT_SECRET` uniquement `server/.env` — jamais dans Vite
- Client : seulement `VITE_API_URL`
- JWT en `localStorage` — jamais dans `settings` syncées
- LWW sur `updatedAt` (ISO string comparable lexicographiquement si UTC `toISOString()`)
- Soft-delete via `deletedAt` ; pull inclut les soft-deleted
- Collections sync : exercises, cycles, sessionTemplates, prescribedItems, workouts, workoutExercises, setLogs, cardioLogs, bodyMetrics, proteinEntries, settings
- Hors sync : progressPhotos
- Settings exclues du sync : `lastSyncedAt`, `lastSyncError`, `seedVersion` (local device)
- App utilisable sans compte
- UI Fonte/magnésie existante ; pas de spinner global en séance
- Commits fréquents ; TDD sur merge client + auth/sync serveur où possible
- Rotate le mot de passe Neon s’il a été exposé avant premier deploy

## File structure

| File | Responsibility |
|---|---|
| `server/package.json` | Dépendances + scripts API |
| `server/tsconfig.json` | TS server |
| `server/.env.example` | Variables documentées sans secrets |
| `server/src/index.ts` | Bootstrap Hono + CORS |
| `server/src/db.ts` | Client Drizzle / postgres |
| `server/src/schema.ts` | Tables Drizzle |
| `server/drizzle.config.ts` | Config migrations |
| `server/src/auth.ts` | register / login / me + JWT helpers |
| `server/src/sync.ts` | push / pull handlers |
| `server/src/tables.ts` | Liste des collections sync + helpers upsert |
| `app/.env.example` | `VITE_API_URL` |
| `app/src/sync/types.ts` | Types changes / réponses |
| `app/src/sync/token.ts` | get/set/clear JWT localStorage |
| `app/src/sync/api.ts` | fetch auth + sync |
| `app/src/sync/merge.ts` | LWW pur (testable) |
| `app/src/sync/collect.ts` | Lire Dexie → changes depuis `since` |
| `app/src/sync/apply.ts` | Appliquer pull dans Dexie |
| `app/src/sync/runSync.ts` | Orchestration push→pull |
| `app/src/features/auth/LoginScreen.tsx` | UI login |
| `app/src/features/auth/RegisterScreen.tsx` | UI register |
| `app/src/features/auth/authShared.module.css` | Styles auth |
| `app/src/features/settings/SettingsScreen.tsx` | Compte + sync manuelle |
| `app/src/App.tsx` | Routes `/login` `/register` |
| `app/src/db/schema.ts` | `SETTINGS_KEYS.lastSyncedAt` etc. |
| `docs/adr/005-cloud-sync-neon.md` | ADR sync |
| `docs/adr/002-local-first-dexie.md` | Note supersede partielle |

**Implémentation SQL V0 :** chaque table syncée = `id`, `user_id`, `created_at`, `updated_at`, `deleted_at`, `payload jsonb` (entité client complète). LWW sur `updated_at` ; le client reconstitue la row depuis `payload`.

---

### Task 1: Scaffold serveur + Drizzle users

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/drizzle.config.ts`
- Create: `server/.env.example`
- Create: `server/src/db.ts`
- Create: `server/src/schema.ts`
- Create: `server/src/index.ts`
- Modify: `.gitignore` (si besoin `server/node_modules`)

**Interfaces:**
- Consumes: Neon `DATABASE_URL`
- Produces: `db` export ; table `users` ; serveur écoute `PORT` (défaut 8787)

- [ ] **Step 1: Créer `server/package.json`**

```json
{
  "name": "hery-server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@hono/node-server": "^1.14.0",
    "bcryptjs": "^3.0.2",
    "drizzle-orm": "^0.44.0",
    "hono": "^4.7.0",
    "jose": "^6.0.0",
    "postgres": "^3.4.5"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^24.0.0",
    "drizzle-kit": "^0.31.0",
    "tsx": "^4.19.0",
    "typescript": "~6.0.2",
    "vitest": "^4.1.0"
  }
}
```

- [ ] **Step 2: `server/tsconfig.json` + `.env.example` + `schema` users**

`server/.env.example`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
JWT_SECRET=change-me-to-a-long-random-string
CORS_ORIGIN=http://localhost:5173
PORT=8787
```

`server/src/schema.ts` (extrait users) :

```ts
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull(),
});
```

`server/src/db.ts`:

```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL missing');

const client = postgres(url, { prepare: false });
export const db = drizzle(client, { schema });
```

`server/src/index.ts` — Hono minimal `GET /health` → `{ ok: true }`, CORS depuis `CORS_ORIGIN`.

- [ ] **Step 3: Installer + pousser le schéma**

```bash
cd server
npm install
# créer server/.env avec DATABASE_URL rotaté + JWT_SECRET
npx drizzle-kit push
npm run dev
```

Expected: `GET http://localhost:8787/health` → `{"ok":true}`

- [ ] **Step 4: Commit**

```bash
git add server .gitignore
git commit -m "feat(server): scaffold Hono + Drizzle users table"
```

---

### Task 2: Auth register / login / me

**Files:**
- Create: `server/src/auth.ts`
- Create: `server/src/jwt.ts`
- Create: `server/tests/auth.test.ts` (optionnel si DB test dispo ; sinon test manuel documenté)
- Modify: `server/src/index.ts`

**Interfaces:**
- Consumes: `users` table, `JWT_SECRET`
- Produces:
  - `signToken(userId: string, email: string): Promise<string>`
  - `verifyToken(token: string): Promise<{ userId: string; email: string }>`
  - Routes: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
  - Body register/login: `{ email: string; password: string }`
  - Réponse auth: `{ token: string; user: { id: string; email: string } }`
  - Password min 8 chars ; email lowercased trim

- [ ] **Step 1: Implémenter `jwt.ts`**

```ts
import { SignJWT, jwtVerify } from 'jose';

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET missing');
  return new TextEncoder().encode(s);
}

export async function signToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret());
}

export async function verifyToken(token: string): Promise<{ userId: string; email: string }> {
  const { payload } = await jwtVerify(token, secret());
  const userId = payload.sub;
  const email = typeof payload.email === 'string' ? payload.email : '';
  if (!userId) throw new Error('invalid token');
  return { userId, email };
}
```

- [ ] **Step 2: Routes auth dans `auth.ts` + mount**

- Register : générer id `usr_` + ulid/nanoid ; `bcrypt.hash(password, 10)` ; insert ; return token  
- Login : find by email ; `bcrypt.compare` ; 401 si fail  
- Me : middleware Bearer → user  
- Erreurs : 400 validation, 409 email pris, 401 bad creds

Middleware helper :

```ts
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
```

- [ ] **Step 3: Vérifier manuellement**

```bash
curl -s -X POST http://localhost:8787/auth/register -H "content-type: application/json" -d "{\"email\":\"test@hery.local\",\"password\":\"password1\"}"
curl -s -X POST http://localhost:8787/auth/login -H "content-type: application/json" -d "{\"email\":\"test@hery.local\",\"password\":\"password1\"}"
# GET /auth/me avec Authorization: Bearer …
```

Expected: token JWT ; mauvais mdp → 401

- [ ] **Step 4: Commit**

```bash
git add server
git commit -m "feat(server): email/password auth with JWT"
```

---

### Task 3: Tables sync + push/pull

**Files:**
- Modify: `server/src/schema.ts`
- Create: `server/src/syncTables.ts`
- Create: `server/src/sync.ts`
- Modify: `server/src/index.ts`

**Interfaces:**
- Consumes: `requireUser`, `db`
- Produces:
  - `SYNC_TABLES` = liste fixe des noms
  - `POST /sync/push` body `{ changes: Record<SyncTable, SyncRow[]> }`
  - `GET /sync/pull?since=ISO` → `{ changes: Record<SyncTable, SyncRow[]>, serverTime: string }`
  - `SyncRow` = entité client (camelCase) telle que dans Dexie ; serveur stocke `payload` = row entière

Helper table Drizzle (répéter ou factory) :

```ts
function syncTable(name: string) {
  return pgTable(name, {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
    payload: jsonb('payload').notNull(),
  });
}
```

Noms SQL snake : `exercises`, `cycles`, `session_templates`, `prescribed_items`, `workouts`, `workout_exercises`, `set_logs`, `cardio_logs`, `body_metrics`, `protein_entries`, `settings`  
Note settings : PK composite impossible avec id seul — côté client `Setting` a `key` pas `id`. **Adapter :** sérialiser settings comme `{ id: key, key, value, createdAt, updatedAt, deletedAt }` où `id === key`.

- [ ] **Step 1: Ajouter tables + `drizzle-kit push`**

- [ ] **Step 2: Push LWW**

Pour chaque row entrante :

```ts
const existing = await db.select().from(table).where(and(eq(table.id, row.id), eq(table.userId, userId))).limit(1);
if (!existing[0] || row.updatedAt >= existing[0].updatedAt) {
  await db.insert(table).values({...}).onConflictDoUpdate({ target: table.id, set: {...} });
  accepted++;
} else {
  rejected++;
}
```

Sécurité : ignorer / écraser `userId` client ; toujours forcer `userId` du JWT. Vérifier que `payload.id === row.id`.

- [ ] **Step 3: Pull**

```ts
.where(and(eq(table.userId, userId), gt(table.updatedAt, since)))
```

Retourner `payload` tel quel (camelCase client).

- [ ] **Step 4: Test manuel push/pull avec curl + token**

Expected: row visible au pull ; second push plus ancien `updatedAt` → rejected++

- [ ] **Step 5: Commit**

```bash
git add server
git commit -m "feat(server): sync push/pull LWW endpoints"
```

---

### Task 4: Client — token, API, types

**Files:**
- Create: `app/.env.example`
- Create: `app/src/sync/types.ts`
- Create: `app/src/sync/token.ts`
- Create: `app/src/sync/api.ts`
- Create: `app/tests/sync/merge.test.ts` (prépare Task 5 ; peut rester vide ce commit)
- Modify: `app/src/db/schema.ts` — keys sync

**Interfaces:**
- Produces:
  - `getToken(): string | null` / `setToken(t: string)` / `clearToken()`
  - `apiRegister(email, password)` / `apiLogin` / `apiMe` / `apiPush` / `apiPull(since)`
  - `SyncTableName` union
  - Sur 401 : `clearToken()` + throw `AuthError`

```ts
// token.ts
const KEY = 'hery.jwt';
export function getToken() { return localStorage.getItem(KEY); }
export function setToken(t: string) { localStorage.setItem(KEY, t); }
export function clearToken() { localStorage.removeItem(KEY); }
```

```ts
// api.ts
const base = () => import.meta.env.VITE_API_URL as string;
async function request(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set('content-type', 'application/json');
  const token = getToken();
  if (token) headers.set('authorization', `Bearer ${token}`);
  const res = await fetch(`${base()}${path}`, { ...init, headers });
  if (res.status === 401) {
    clearToken();
    throw new AuthError('unauthorized');
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

`SETTINGS_KEYS` ajouter :

```ts
lastSyncedAt: 'lastSyncedAt',
lastSyncStatus: 'lastSyncStatus', // 'ok' | 'error' | 'pending'
```

- [ ] **Step 1: Créer fichiers + `.env.example` avec `VITE_API_URL=http://localhost:8787`**

- [ ] **Step 2: `npm run typecheck` dans `app/`**

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/src/sync app/.env.example app/src/db/schema.ts
git commit -m "feat(sync): client API and JWT storage"
```

---

### Task 5: Client — merge LWW pur (TDD)

**Files:**
- Create: `app/src/sync/merge.ts`
- Create: `app/tests/sync/merge.test.ts`

**Interfaces:**
- Produces:
  - `export type RowCommon = { id: string; updatedAt: string; deletedAt?: string | null }`
  - `mergeLww<T extends RowCommon>(local: T | undefined, incoming: T): T` — garde le `updatedAt` max ; égalité → incoming gagne
  - `mergeTables<T extends RowCommon>(localRows: T[], incomingRows: T[]): T[]` — index par id

- [ ] **Step 1: Tests failing**

```ts
import { describe, expect, it } from 'vitest';
import { mergeLww, mergeTables } from '../../src/sync/merge';

describe('mergeLww', () => {
  it('keeps newer updatedAt', () => {
    const local = { id: 'a', updatedAt: '2026-01-02T00:00:00.000Z', v: 1 };
    const remote = { id: 'a', updatedAt: '2026-01-03T00:00:00.000Z', v: 2 };
    expect(mergeLww(local, remote).v).toBe(2);
  });
  it('keeps local if newer', () => {
    const local = { id: 'a', updatedAt: '2026-01-04T00:00:00.000Z', v: 1 };
    const remote = { id: 'a', updatedAt: '2026-01-03T00:00:00.000Z', v: 2 };
    expect(mergeLww(local, remote).v).toBe(1);
  });
  it('incoming wins on equal timestamp', () => {
    const local = { id: 'a', updatedAt: '2026-01-03T00:00:00.000Z', v: 1 };
    const remote = { id: 'a', updatedAt: '2026-01-03T00:00:00.000Z', v: 2 };
    expect(mergeLww(local, remote).v).toBe(2);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd app && npm run test -- tests/sync/merge.test.ts
```

- [ ] **Step 3: Implement `merge.ts`**

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add app/src/sync/merge.ts app/tests/sync/merge.test.ts
git commit -m "feat(sync): LWW merge helpers"
```

---

### Task 6: Client — collect / apply / runSync

**Files:**
- Create: `app/src/sync/collect.ts`
- Create: `app/src/sync/apply.ts`
- Create: `app/src/sync/runSync.ts`
- Create: `app/src/sync/tables.ts`

**Interfaces:**
- Consumes: `db` Dexie, `apiPush`, `apiPull`, `mergeLww`, settings keys
- Produces:
  - `collectChanges(since: string): Promise<Record<SyncTableName, unknown[]>>`
  - `applyChanges(changes: Record<SyncTableName, unknown[]>): Promise<void>`
  - `runSync(): Promise<{ ok: true } | { ok: false; error: string }>` — no-op si pas de token
  - Ordre : push puis pull puis update `lastSyncedAt` = `serverTime`
  - Settings : exclure keys dans `SYNC_EXCLUDED_SETTING_KEYS = ['lastSyncedAt','lastSyncStatus','seedVersion']`
  - Settings row shape pour wire : `{ id: key, key, value, createdAt, updatedAt, deletedAt: null }`

`collectChanges` : pour chaque table Dexie, `where('updatedAt').above(since)` (settings : filtrer keys).  
Si `since` vide / epoch : tout envoyer (premier sync peut être lourd — OK V0).

`applyChanges` : pour chaque incoming row, lire local by id, `mergeLww`, `put`.

`runSync` :

```ts
export async function runSync() {
  if (!getToken()) return { ok: false as const, error: 'not_authenticated' };
  try {
    const since = (await db.settings.get('lastSyncedAt'))?.value as string | undefined ?? '1970-01-01T00:00:00.000Z';
    const changes = await collectChanges(since);
    await apiPush(changes);
    const pull = await apiPull(since);
    await applyChanges(pull.changes);
    await db.settings.put({ key: 'lastSyncedAt', value: pull.serverTime });
    await db.settings.put({ key: 'lastSyncStatus', value: 'ok' });
    return { ok: true as const };
  } catch (e) {
    await db.settings.put({ key: 'lastSyncStatus', value: 'error' });
    return { ok: false as const, error: e instanceof Error ? e.message : 'sync_failed' };
  }
}
```

- [ ] **Step 1: Implémenter + typecheck**

- [ ] **Step 2: Smoke test manuel** — login via curl token in localStorage DevTools, `runSync()` depuis console après exposer temporairement, ou via UI Task 7

- [ ] **Step 3: Commit**

```bash
git add app/src/sync
git commit -m "feat(sync): collect, apply, and runSync orchestration"
```

---

### Task 7: UI Auth — login / register

**Files:**
- Create: `app/src/features/auth/LoginScreen.tsx`
- Create: `app/src/features/auth/RegisterScreen.tsx`
- Create: `app/src/features/auth/authShared.module.css`
- Modify: `app/src/App.tsx`

**Interfaces:**
- Consumes: `apiLogin`, `apiRegister`, `setToken`, `runSync`
- Routes: `/login`, `/register`
- Après succès : `setToken` → `void runSync()` → `navigate('/settings')`
- Copie factuelle : titres `Connexion` / `Créer un compte` ; pas de marketing
- Lien croisé login ↔ register
- Styles : plaques `--fonte-700`, inputs existants pattern Settings/program

- [ ] **Step 1: Écrans + CSS**

- [ ] **Step 2: Routes dans `App.tsx`**

```tsx
<Route path="/login" element={<LoginScreen />} />
<Route path="/register" element={<RegisterScreen />} />
```

- [ ] **Step 3: Vérifier manuellement register → token → redirect**

- [ ] **Step 4: Commit**

```bash
git add app/src/features/auth app/src/App.tsx
git commit -m "feat(auth): login and register screens"
```

---

### Task 8: Settings compte + déclencheurs sync

**Files:**
- Modify: `app/src/features/settings/SettingsScreen.tsx`
- Modify: `app/src/features/settings/SettingsScreen.module.css`
- Modify: `app/src/main.tsx` ou petit `app/src/sync/SyncBootstrap.tsx`
- Modify: `app/src/repositories/workouts.repo.ts` (fin de séance) — appeler `void runSync()` après complete/abandon **sans await bloquant UI**

**Interfaces:**
- Section Réglages « Compte » :
  - Si pas de token : liens Connexion / Créer un compte
  - Si token : email via `apiMe` (ou cache), dernière sync, bouton Synchroniser, Déconnexion (`clearToken`)
- `SyncBootstrap` : `window.addEventListener('online', () => void runSync())` ; sync une fois au mount si token
- Fin séance : fire-and-forget `runSync()`

- [ ] **Step 1: UI Settings compte**

- [ ] **Step 2: SyncBootstrap + hook fin séance**

Trouver dans `workouts.repo.ts` / store les fonctions `completeWorkout` / `abandonWorkout` et ajouter :

```ts
void import('../sync/runSync').then((m) => m.runSync());
```

- [ ] **Step 3: Parcours acceptation**

1. Register sur appareil A, créer/modifier une séance, sync  
2. Clear site data (ou navigateur privé)  
3. Login → sync → workouts restaurés  
4. Mode avion : séance OK sans erreur bloquante  

- [ ] **Step 4: Commit**

```bash
git add app/src/features/settings app/src/main.tsx app/src/repositories/workouts.repo.ts app/src/sync
git commit -m "feat(sync): settings account UI and sync triggers"
```

---

### Task 9: ADR + docs

**Files:**
- Create: `docs/adr/005-cloud-sync-neon.md`
- Modify: `docs/adr/002-local-first-dexie.md` — statut « accepté — supersédé partiellement par ADR-005 pour la sync optionnelle »
- Modify: `README.md` — section « Sync cloud (optionnel) » : démarrer server, env vars

- [ ] **Step 1: Écrire ADR-005** (contexte, décision Hono+Drizzle+Neon, LWW, JWT, photos exclus)

- [ ] **Step 2: Update ADR-002 + README**

- [ ] **Step 3: Commit**

```bash
git add docs README.md
git commit -m "docs: ADR-005 cloud sync and README setup"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|---|---|
| Dexie offline intact | 6–8 (sync opt-in) |
| Bidirectional LWW | 3, 5, 6 |
| Auth email/mdp | 2, 7 |
| JWT localStorage only | 4 |
| DATABASE_URL server-only | 1, 4 |
| Photos hors sync | 3, 6 (tables list) |
| Push/pull endpoints | 3 |
| Triggers login/online/fin séance/manuel | 7, 8 |
| Settings compte UI | 8 |
| ADR | 9 |
| Acceptation multi-device | 8 step 3 |

## Placeholder scan

Aucun TBD. Choix SQL `payload jsonb` documenté (compatible LWW row-level).

## Type consistency

- `SyncTableName` / `SYNC_TABLES` alignés client↔serveur  
- Auth response `{ token, user: { id, email } }`  
- Pull `{ changes, serverTime }`  
- Settings wire format `{ id: key, key, value, createdAt, updatedAt, deletedAt }`
