# Data Reliability (Lot 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fiabiliser tonnage, durées de séance et statut d’exercice (`planned` / `started` / `completed` / `skipped`) selon `docs/superpowers/specs/2026-09-13-data-reliability-design.md`.

**Architecture:** Formules pures dans `domain/tonnage.ts` et `domain/workout-exercise-status.ts` ; `workouts.repo` reste la seule couche d’écriture Dexie et appelle `recomputeWorkoutTonnage` après chaque mutation de série ; migration idempotente au démarrage via `settings` ; UI minimale sur séance active (Ignorer + confirmation durée) et détail historique (badge + édition horaires).

**Tech Stack:** React 19, Dexie, Vitest, CSS modules existants. Pas de nouvelle dépendance.

## Global Constraints

- Spec : `docs/superpowers/specs/2026-09-13-data-reliability-design.md`
- Tonnage = `Σ weightKg × reps × (unilateral ? 2 : 1)` ; exclure warmup, soft-deleted, `reps < 1`, `weightKg == null`
- Durée suspecte : `< 15 min` ou `> 3 h` ; pas de correction auto
- `e1rm` : jamais recalculé a posteriori (RG-14)
- Séance active : aucun toast bloquant pour le recalcul (RG-07)
- Copie FR : `Ignorer`, `durée suspecte`, `Non fait`, `Ignoré`
- Commits fréquents ; TDD domaine d’abord ; commandes depuis `app/` : `npm run test`, `npm run typecheck`
- Ne pas toucher RIR / PR v2 / coach (lots 2+)

## File structure

| File | Responsibility |
|---|---|
| `app/src/domain/tonnage.ts` | `setCountsTowardTonnage`, `computeWorkoutTonnage`, `workoutDurationSec`, `isImplausibleDuration` |
| `app/src/domain/workout-exercise-status.ts` | Transitions `completionStatus` |
| `app/tests/domain/tonnage.test.ts` | Tests tonnage + durée |
| `app/tests/domain/workout-exercise-status.test.ts` | Tests transitions |
| `app/src/db/schema.ts` | Type `ExerciseCompletionStatus`, champ sur `WorkoutExercise`, `SETTINGS_KEYS` |
| `app/src/db/db.ts` | Dexie `version(2)` + upgrade backfill défensif |
| `app/src/db/migrate-reliability.ts` | Migration idempotente tonnage + statuts |
| `app/src/repositories/workouts.repo.ts` | Recalcul, skip, edit times, mark skipped, branch mutations |
| `app/src/main.tsx` | Appeler migration après seed |
| `app/src/features/session/ActiveSessionScreen.tsx` | Ignorer + confirm durée à la clôture |
| `app/src/features/history/WorkoutDetailScreen.tsx` | Badge durée, édition heures, libellés statut |
| `app/src/features/history/HistoryScreen.module.css` | Styles minimaux |
| `docs/04-modele-de-donnees.md` | Documenter `completionStatus` |

---

### Task 1: Domain tonnage + durée

**Files:**
- Create: `app/src/domain/tonnage.ts`
- Test: `app/tests/domain/tonnage.test.ts`

**Interfaces:**
- Consumes: rien
- Produces:
  - `export const MIN_PLAUSIBLE_DURATION_SEC = 15 * 60`
  - `export const MAX_PLAUSIBLE_DURATION_SEC = 3 * 60 * 60`
  - `export function setCountsTowardTonnage(set: { weightKg: number \| null; reps: number \| null; isWarmup: boolean; deletedAt?: string \| null }): boolean`
  - `export function computeWorkoutTonnage(sets: Array<{ weightKg: number \| null; reps: number \| null; isWarmup: boolean; deletedAt?: string \| null; exerciseId: string }>, unilateralByExerciseId: Map<string, boolean>): number`
  - `export function workoutDurationSec(startedAt: string \| null, endedAt: string \| null): number \| null`
  - `export function isImplausibleDuration(durationSec: number): boolean`

- [ ] **Step 1: Write the failing test**

Create `app/tests/domain/tonnage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  computeWorkoutTonnage,
  isImplausibleDuration,
  setCountsTowardTonnage,
  workoutDurationSec,
  MIN_PLAUSIBLE_DURATION_SEC,
  MAX_PLAUSIBLE_DURATION_SEC,
} from '../../src/domain/tonnage';

describe('setCountsTowardTonnage', () => {
  it('exclut warmup, soft-delete, reps < 1, weight null', () => {
    expect(setCountsTowardTonnage({ weightKg: 100, reps: 10, isWarmup: true })).toBe(false);
    expect(setCountsTowardTonnage({ weightKg: 100, reps: 10, isWarmup: false, deletedAt: 'x' })).toBe(false);
    expect(setCountsTowardTonnage({ weightKg: 100, reps: 0, isWarmup: false })).toBe(false);
    expect(setCountsTowardTonnage({ weightKg: null, reps: 10, isWarmup: false })).toBe(false);
    expect(setCountsTowardTonnage({ weightKg: 100, reps: 10, isWarmup: false })).toBe(true);
  });
});

describe('computeWorkoutTonnage', () => {
  it('somme weight×reps et double si unilatéral', () => {
    const unilateral = new Map([['ex-bi', false], ['ex-uni', true]]);
    const kg = computeWorkoutTonnage(
      [
        { exerciseId: 'ex-bi', weightKg: 100, reps: 10, isWarmup: false },
        { exerciseId: 'ex-uni', weightKg: 20, reps: 8, isWarmup: false },
        { exerciseId: 'ex-bi', weightKg: 50, reps: 10, isWarmup: true },
      ],
      unilateral,
    );
    expect(kg).toBe(100 * 10 + 20 * 8 * 2);
  });

  it('multiplier 1 si exercice absent de la map', () => {
    expect(
      computeWorkoutTonnage(
        [{ exerciseId: 'unknown', weightKg: 50, reps: 5, isWarmup: false }],
        new Map(),
      ),
    ).toBe(250);
  });
});

describe('duration helpers', () => {
  it('workoutDurationSec retourne null si bornes manquantes', () => {
    expect(workoutDurationSec(null, '2026-09-13T10:00:00.000Z')).toBeNull();
    expect(workoutDurationSec('2026-09-13T10:00:00.000Z', null)).toBeNull();
  });

  it('workoutDurationSec calcule la différence en secondes', () => {
    expect(
      workoutDurationSec('2026-09-13T10:00:00.000Z', '2026-09-13T11:30:00.000Z'),
    ).toBe(90 * 60);
  });

  it('isImplausibleDuration hors [15min, 3h]', () => {
    expect(isImplausibleDuration(MIN_PLAUSIBLE_DURATION_SEC - 1)).toBe(true);
    expect(isImplausibleDuration(MIN_PLAUSIBLE_DURATION_SEC)).toBe(false);
    expect(isImplausibleDuration(MAX_PLAUSIBLE_DURATION_SEC)).toBe(false);
    expect(isImplausibleDuration(MAX_PLAUSIBLE_DURATION_SEC + 1)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run tests/domain/tonnage.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 3: Write minimal implementation**

Create `app/src/domain/tonnage.ts`:

```ts
export const MIN_PLAUSIBLE_DURATION_SEC = 15 * 60;
export const MAX_PLAUSIBLE_DURATION_SEC = 3 * 60 * 60;

export function setCountsTowardTonnage(set: {
  weightKg: number | null;
  reps: number | null;
  isWarmup: boolean;
  deletedAt?: string | null;
}): boolean {
  if (set.isWarmup) return false;
  if (set.deletedAt != null) return false;
  if (set.weightKg == null) return false;
  if (set.reps == null || set.reps < 1) return false;
  return true;
}

export function computeWorkoutTonnage(
  sets: Array<{
    weightKg: number | null;
    reps: number | null;
    isWarmup: boolean;
    deletedAt?: string | null;
    exerciseId: string;
  }>,
  unilateralByExerciseId: Map<string, boolean>,
): number {
  let total = 0;
  for (const set of sets) {
    if (!setCountsTowardTonnage(set)) continue;
    const multiplier = unilateralByExerciseId.get(set.exerciseId) ? 2 : 1;
    total += (set.weightKg as number) * (set.reps as number) * multiplier;
  }
  return total;
}

export function workoutDurationSec(startedAt: string | null, endedAt: string | null): number | null {
  if (startedAt == null || endedAt == null) return null;
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.round(ms / 1000);
}

export function isImplausibleDuration(durationSec: number): boolean {
  return durationSec < MIN_PLAUSIBLE_DURATION_SEC || durationSec > MAX_PLAUSIBLE_DURATION_SEC;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run tests/domain/tonnage.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/domain/tonnage.ts app/tests/domain/tonnage.test.ts
git commit -m "$(cat <<'EOF'
feat(domain): add tonnage and duration helpers for data reliability

EOF
)"
```

---

### Task 2: Domain statut d’exercice

**Files:**
- Create: `app/src/domain/workout-exercise-status.ts`
- Test: `app/tests/domain/workout-exercise-status.test.ts`

**Interfaces:**
- Consumes: `ExerciseCompletionStatus` sera défini dans schema — pour cette task, **définir le type union dans le domaine** et le réexporter depuis schema à la Task 3 pour éviter circularité, OU définir le type uniquement dans `schema.ts` et l’importer ici. **Choix plan :** type dans `schema.ts` dès Task 3 ; pour Task 2, déclarer localement :

```ts
export type ExerciseCompletionStatus = 'planned' | 'started' | 'completed' | 'skipped';
```

  puis Task 3 : déplacer le type vers `schema.ts` et faire importer le domaine depuis schema (ou garder le type dans le domaine et `schema` importe `import type { ExerciseCompletionStatus } from '../domain/workout-exercise-status'`).

  **Retenu :** type exporté depuis `domain/workout-exercise-status.ts` ; `schema.ts` fait `import type { ExerciseCompletionStatus } from '../domain/workout-exercise-status'` et réexporte si besoin.

- Produces:
  - `export type ExerciseCompletionStatus = 'planned' | 'started' | 'completed' | 'skipped'`
  - `export function statusAfterLogSet(current: ExerciseCompletionStatus): ExerciseCompletionStatus`
  - `export function statusAfterSkip(current: ExerciseCompletionStatus): ExerciseCompletionStatus`
  - `export function statusAfterLeaveWithSets(current: ExerciseCompletionStatus, hasAnySet: boolean): ExerciseCompletionStatus`
  - `export function deriveHistoricalStatus(hasWorkingSet: boolean): ExerciseCompletionStatus`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import {
  deriveHistoricalStatus,
  statusAfterLeaveWithSets,
  statusAfterLogSet,
  statusAfterSkip,
} from '../../src/domain/workout-exercise-status';

describe('workout-exercise-status', () => {
  it('logSet: planned/started → started ; skipped reste skipped', () => {
    expect(statusAfterLogSet('planned')).toBe('started');
    expect(statusAfterLogSet('started')).toBe('started');
    expect(statusAfterLogSet('completed')).toBe('started');
    expect(statusAfterLogSet('skipped')).toBe('started');
  });

  it('skip: planned/started → skipped', () => {
    expect(statusAfterSkip('planned')).toBe('skipped');
    expect(statusAfterSkip('started')).toBe('skipped');
    expect(statusAfterSkip('completed')).toBe('skipped');
    expect(statusAfterSkip('skipped')).toBe('skipped');
  });

  it('leave with sets: started → completed si hasAnySet', () => {
    expect(statusAfterLeaveWithSets('started', true)).toBe('completed');
    expect(statusAfterLeaveWithSets('started', false)).toBe('started');
    expect(statusAfterLeaveWithSets('planned', false)).toBe('planned');
    expect(statusAfterLeaveWithSets('skipped', true)).toBe('skipped');
  });

  it('historique: séries travail → completed, sinon planned', () => {
    expect(deriveHistoricalStatus(true)).toBe('completed');
    expect(deriveHistoricalStatus(false)).toBe('planned');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run tests/domain/workout-exercise-status.test.ts`

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```ts
export type ExerciseCompletionStatus = 'planned' | 'started' | 'completed' | 'skipped';

export function statusAfterLogSet(current: ExerciseCompletionStatus): ExerciseCompletionStatus {
  void current;
  return 'started';
}

export function statusAfterSkip(_current: ExerciseCompletionStatus): ExerciseCompletionStatus {
  return 'skipped';
}

export function statusAfterLeaveWithSets(
  current: ExerciseCompletionStatus,
  hasAnySet: boolean,
): ExerciseCompletionStatus {
  if (current === 'skipped') return 'skipped';
  if (hasAnySet) return 'completed';
  return current;
}

export function deriveHistoricalStatus(hasWorkingSet: boolean): ExerciseCompletionStatus {
  return hasWorkingSet ? 'completed' : 'planned';
}
```

- [ ] **Step 4: Run tests**

Run: `cd app && npx vitest run tests/domain/workout-exercise-status.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/domain/workout-exercise-status.ts app/tests/domain/workout-exercise-status.test.ts
git commit -m "$(cat <<'EOF'
feat(domain): add workout exercise completion status transitions

EOF
)"
```

---

### Task 3: Schéma + Dexie v2

**Files:**
- Modify: `app/src/db/schema.ts`
- Modify: `app/src/db/db.ts`

**Interfaces:**
- Consumes: `ExerciseCompletionStatus` from `../domain/workout-exercise-status`
- Produces: `WorkoutExercise.completionStatus` ; `SETTINGS_KEYS.dataReliabilityMigratedV1`

- [ ] **Step 1: Update schema**

In `app/src/db/schema.ts`:

1. Add import:

```ts
import type { ExerciseCompletionStatus } from '../domain/workout-exercise-status';
export type { ExerciseCompletionStatus };
```

2. On `WorkoutExercise`, add:

```ts
completionStatus: ExerciseCompletionStatus;
```

3. In `SETTINGS_KEYS`, add:

```ts
dataReliabilityMigratedV1: 'dataReliabilityMigratedV1',
```

- [ ] **Step 2: Dexie version 2**

In `app/src/db/db.ts`, after `version(1)`, add:

```ts
this.version(2)
  .stores({
    exercises: 'id, name, *primaryMuscles, equipment, updatedAt',
    cycles: 'id, startDate, updatedAt',
    sessionTemplates: 'id, cycleId, code, dayOfWeek, updatedAt',
    prescribedItems: 'id, sessionTemplateId, [sessionTemplateId+order], exerciseId',
    workouts: 'id, date, status, sessionTemplateId, updatedAt',
    workoutExercises: 'id, workoutId, exerciseId, [workoutId+order]',
    setLogs: 'id, workoutExerciseId, [workoutExerciseId+index], completedAt, isPR',
    cardioLogs: 'id, workoutId, date',
    bodyMetrics: 'id, date',
    progressPhotos: 'id, date, pose',
    proteinEntries: 'id, date',
    settings: 'key',
  })
  .upgrade(async (tx) => {
    await tx
      .table('workoutExercises')
      .toCollection()
      .modify((we: { completionStatus?: string }) => {
        if (we.completionStatus == null) we.completionStatus = 'planned';
      });
  });
```

Note: indexes inchangés ; le bump sert surtout à l’upgrade défensif. La migration métier (tonnage + dérivation historique) est Task 6.

- [ ] **Step 3: Fix compile errors at creation sites**

Update `getOrCreateWorkoutExercise` in `workouts.repo.ts` to set `completionStatus: 'planned'` when creating a new `WorkoutExercise` (minimal pour typecheck ; logique complète Task 4–5).

Search for other `WorkoutExercise` object literals (tests, seeds) and add `completionStatus: 'planned'` or appropriate value.

- [ ] **Step 4: Typecheck**

Run: `cd app && npm run typecheck`

Expected: PASS (ou uniquement erreurs hors scope à corriger dans ce commit)

- [ ] **Step 5: Commit**

```bash
git add app/src/db/schema.ts app/src/db/db.ts app/src/repositories/workouts.repo.ts
git commit -m "$(cat <<'EOF'
feat(db): add completionStatus and Dexie v2 upgrade

EOF
)"
```

---

### Task 4: Recalcul tonnage dans le repository

**Files:**
- Modify: `app/src/repositories/workouts.repo.ts`
- Test: `app/tests/repositories/workouts-tonnage.test.ts` (créer ; pattern Dexie fake / db réelle comme les autres tests repo)

**Interfaces:**
- Consumes: `computeWorkoutTonnage`, `setCountsTowardTonnage` from domain
- Produces: `export async function recomputeWorkoutTonnage(workoutId: string): Promise<number>`

- [ ] **Step 1: Inspect existing repo test setup**

Read `app/tests/repositories/program.repo.test.ts` and `app/tests/setup.ts` for how Dexie is reset. Mirror that pattern.

- [ ] **Step 2: Write failing integration test**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/db/db';
import {
  completeWorkout,
  editSetLog,
  getOrCreateWorkoutExercise,
  logSet,
  recomputeWorkoutTonnage,
  removeSet,
  startWorkout,
} from '../../src/repositories/workouts.repo';
// seed minimal exercise + template as needed for startWorkout
```

Scénarios minimaux (adapter aux helpers de seed du projet) :

1. `logSet` 100×10 → `workout.totalTonnageKg === 1000`
2. `editSetLog` → 100×8 → tonnage `800`
3. `removeSet` → tonnage `0`
4. warmup exclu

Si le harness Dexie est trop lourd pour un premier jet : tester `recomputeWorkoutTonnage` en isolant après inserts manuels dans `db.*`.

- [ ] **Step 3: Implement `recomputeWorkoutTonnage`**

```ts
import { computeWorkoutTonnage } from '../domain/tonnage';

export async function recomputeWorkoutTonnage(workoutId: string): Promise<number> {
  const exercises = await getWorkoutExercises(workoutId);
  const unilateral = new Map<string, boolean>();
  const flat: Array<{
    weightKg: number | null;
    reps: number | null;
    isWarmup: boolean;
    deletedAt?: string | null;
    exerciseId: string;
  }> = [];

  for (const we of exercises) {
    const ex = await db.exercises.get(we.exerciseId);
    unilateral.set(we.exerciseId, ex?.unilateral ?? false);
    const sets = await db.setLogs.where('workoutExerciseId').equals(we.id).toArray();
    for (const s of sets) {
      flat.push({
        weightKg: s.weightKg,
        reps: s.reps,
        isWarmup: s.isWarmup,
        deletedAt: s.deletedAt,
        exerciseId: we.exerciseId,
      });
    }
  }

  const tonnage = computeWorkoutTonnage(flat, unilateral);
  await db.workouts.update(workoutId, { totalTonnageKg: tonnage, updatedAt: nowIso() });
  return tonnage;
}
```

- [ ] **Step 4: Wire callers**

- End of `logSet` : after put, resolve `workoutId` via `workoutExercises.get`, then `await recomputeWorkoutTonnage(workoutId)` (peut remplacer ou compléter `touchWorkout` — `recompute` met déjà `updatedAt`).
- End of `editSetLog` : same.
- End of `removeSet` : same (charger le set avant update pour connaître `workoutExerciseId`).
- `completeWorkout` : remplacer la boucle locale par `await recomputeWorkoutTonnage(workoutId)` puis update `status` / `endedAt` (ne pas écraser le tonnage avec une 2e formule).

Exemple `completeWorkout` :

```ts
export async function completeWorkout(workoutId: string): Promise<void> {
  const tonnage = await recomputeWorkoutTonnage(workoutId);
  const ts = nowIso();
  await db.workouts.update(workoutId, {
    status: 'completed',
    endedAt: ts,
    totalTonnageKg: tonnage,
    updatedAt: ts,
  });
  void import('../sync/runSync').then((m) => m.runSync());
}
```

Note: `recomputeWorkoutTonnage` écrit déjà le tonnage ; le 2e update peut omettre `totalTonnageKg` si on veut éviter la double écriture — garder une seule écriture claire.

- [ ] **Step 5: Run tests**

Run: `cd app && npx vitest run tests/repositories/workouts-tonnage.test.ts tests/domain/tonnage.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/src/repositories/workouts.repo.ts app/tests/repositories/workouts-tonnage.test.ts
git commit -m "$(cat <<'EOF'
fix(workouts): recompute tonnage after every set mutation

EOF
)"
```

---

### Task 5: Skip, transitions de statut, édition des horaires

**Files:**
- Modify: `app/src/repositories/workouts.repo.ts`
- Modify: `app/tests/repositories/workouts-tonnage.test.ts` (ou nouveau `workouts-status.test.ts`)

**Interfaces:**
- Produces:
  - `export async function skipWorkoutExercise(workoutExerciseId: string): Promise<void>`
  - `export async function markExerciseCompleted(workoutExerciseId: string): Promise<void>`
  - `export async function updateWorkoutTimes(workoutId: string, startedAt: string, endedAt: string): Promise<void>`
  - `export async function markRemainingExercisesSkipped(workoutId: string): Promise<void>`

- [ ] **Step 1: Write failing tests**

- `skipWorkoutExercise` → `completionStatus === 'skipped'`
- `logSet` sur WE `planned` → `started`
- `markExerciseCompleted` après séries → `completed`
- `updateWorkoutTimes` avec `endedAt < startedAt` → throw `Error('endedAt must be >= startedAt')`
- `updateWorkoutTimes` valide → champs mis à jour

- [ ] **Step 2: Implement**

```ts
import {
  statusAfterLeaveWithSets,
  statusAfterLogSet,
  statusAfterSkip,
} from '../domain/workout-exercise-status';

// dans logSet, après put:
const we = await db.workoutExercises.get(input.workoutExerciseId);
if (we) {
  const next = statusAfterLogSet(we.completionStatus ?? 'planned');
  if (next !== we.completionStatus) {
    await db.workoutExercises.update(we.id, { completionStatus: next, updatedAt: nowIso() });
  }
  await recomputeWorkoutTonnage(we.workoutId);
}

export async function skipWorkoutExercise(workoutExerciseId: string): Promise<void> {
  const we = await db.workoutExercises.get(workoutExerciseId);
  if (!we || we.deletedAt != null) return;
  await db.workoutExercises.update(workoutExerciseId, {
    completionStatus: statusAfterSkip(we.completionStatus ?? 'planned'),
    updatedAt: nowIso(),
  });
  await touchWorkout(we.workoutId);
}

export async function markExerciseCompleted(workoutExerciseId: string): Promise<void> {
  const we = await db.workoutExercises.get(workoutExerciseId);
  if (!we || we.deletedAt != null) return;
  const sets = await getSetLogs(workoutExerciseId);
  const next = statusAfterLeaveWithSets(we.completionStatus ?? 'planned', sets.length > 0);
  await db.workoutExercises.update(workoutExerciseId, {
    completionStatus: next,
    updatedAt: nowIso(),
  });
}

export async function updateWorkoutTimes(
  workoutId: string,
  startedAt: string,
  endedAt: string,
): Promise<void> {
  if (new Date(endedAt).getTime() < new Date(startedAt).getTime()) {
    throw new Error('endedAt must be >= startedAt');
  }
  await db.workouts.update(workoutId, { startedAt, endedAt, updatedAt: nowIso() });
}

export async function markRemainingExercisesSkipped(workoutId: string): Promise<void> {
  const list = await getWorkoutExercises(workoutId);
  for (const we of list) {
    if (we.completionStatus === 'planned') {
      await skipWorkoutExercise(we.id);
    }
  }
}
```

Widen `updateWorkoutExercise` patch type to include `completionStatus` if useful.

- [ ] **Step 3: Run tests + typecheck**

Run: `cd app && npx vitest run tests/repositories/ && npm run typecheck`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/src/repositories/workouts.repo.ts app/tests/repositories/
git commit -m "$(cat <<'EOF'
feat(workouts): skip, completion status transitions, and time edits

EOF
)"
```

---

### Task 6: Migration idempotente au démarrage

**Files:**
- Create: `app/src/db/migrate-reliability.ts`
- Modify: `app/src/main.tsx`
- Test: `app/tests/db/migrate-reliability.test.ts`

**Interfaces:**
- Produces: `export async function migrateDataReliabilityV1(): Promise<void>`

- [ ] **Step 1: Write failing test**

Insérer un workout `completed` avec `totalTonnageKg: 0` et une série 100×10 non-warmup ; exercice bilatéral.  
Appeler `migrateDataReliabilityV1` deux fois.  
Assert : tonnage `1000` ; 2e appel no-op (setting présent) ; WE sans série → `planned` ; WE avec série → `completed`.

- [ ] **Step 2: Implement**

```ts
import { db } from './db';
import { SETTINGS_KEYS } from './schema';
import { deriveHistoricalStatus } from '../domain/workout-exercise-status';
import { recomputeWorkoutTonnage } from '../repositories/workouts.repo';
import { setCountsTowardTonnage } from '../domain/tonnage';

export async function migrateDataReliabilityV1(): Promise<void> {
  const flag = await db.settings.get(SETTINGS_KEYS.dataReliabilityMigratedV1);
  if (flag?.value === true) return;

  const workouts = await db.workouts
    .filter((w) => w.deletedAt == null && w.status === 'completed')
    .toArray();

  for (const w of workouts) {
    await recomputeWorkoutTonnage(w.id);
  }

  const wes = await db.workoutExercises.filter((we) => we.deletedAt == null).toArray();
  for (const we of wes) {
    const sets = await db.setLogs.where('workoutExerciseId').equals(we.id).toArray();
    const hasWorking = sets.some((s) => setCountsTowardTonnage(s));
    const status = deriveHistoricalStatus(hasWorking);
    if (we.completionStatus !== status) {
      await db.workoutExercises.update(we.id, { completionStatus: status });
    }
  }

  await db.settings.put({ key: SETTINGS_KEYS.dataReliabilityMigratedV1, value: true });
}
```

- [ ] **Step 3: Wire `main.tsx`**

```ts
import { seedIfNeeded } from './db/seed';
import { migrateDataReliabilityV1 } from './db/migrate-reliability';

void seedIfNeeded().then(() => migrateDataReliabilityV1());
```

(Adapter si `seedIfNeeded` ne retourne pas de Promise — alors `void (async () => { await seedIfNeeded(); await migrateDataReliabilityV1(); })()`.)

- [ ] **Step 4: Run tests**

Run: `cd app && npx vitest run tests/db/migrate-reliability.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/db/migrate-reliability.ts app/src/main.tsx app/tests/db/migrate-reliability.test.ts app/src/db/schema.ts
git commit -m "$(cat <<'EOF'
feat(db): migrate historical tonnage and exercise completion status

EOF
)"
```

---

### Task 7: UI séance — Ignorer + confirmation durée

**Files:**
- Modify: `app/src/features/session/ActiveSessionScreen.tsx`
- Modify: CSS module de la séance si besoin (`ActiveSessionScreen.module.css` ou équivalent)

**Interfaces:**
- Consumes: `skipWorkoutExercise`, `markExerciseCompleted`, `getOrCreateWorkoutExercise`, `markRemainingExercisesSkipped`, `workoutDurationSec`, `isImplausibleDuration`, `completeWorkout`

- [ ] **Step 1: Bouton Ignorer**

Sur l’étape `exercise` / `superset` (pas warmup/cardio/stretch), ajouter un bouton texte `Ignorer` (ghost, non primaire) :

```ts
const handleSkip = async () => {
  if ((step.kind !== 'exercise' && step.kind !== 'superset') || !currentExerciseId) return;
  const currentItem = activeItem(step, subIndex);
  if (!currentItem) return;
  let weId = workoutExerciseId;
  if (!weId) {
    const we = await getOrCreateWorkoutExercise(
      workoutId,
      currentExerciseId,
      currentItem.order,
      substitutedFromId,
    );
    weId = we.id;
  }
  await skipWorkoutExercise(weId);
  goToNextStep(); // ou avancer sans completeWorkout si pas dernier
};
```

Avant `goToNextStep` quand on quitte un exercice avec des séries (fin de repos `pendingAdvance`), appeler `markExerciseCompleted(workoutExerciseId)` si `workoutExerciseId` non null.

- [ ] **Step 2: Confirmation durée à la clôture**

Remplacer le chemin direct `completeWorkout` dans `goToNextStep` (dernier item) par :

1. Calculer `durationSec = workoutDurationSec(workout.startedAt, new Date().toISOString())`
2. Si `durationSec != null && isImplausibleDuration(durationSec)` → afficher un petit panneau/dialog local :

   - Texte : `Durée inhabituelle (${minutes} min). Confirmer ou corriger les heures.`
   - Actions : `Confirmer` → `completeWorkout` ; `Corriger` → champs datetime + `updateWorkoutTimes` puis `completeWorkout`
   - Case optionnelle : `Marquer les exercices non faits comme ignorés` → `markRemainingExercisesSkipped` avant complete

3. Sinon → `completeWorkout` comme aujourd’hui.

Pas de lib de modal externe : réutiliser `Sheet` existant (`app/src/ui/Sheet.tsx`) si disponible, sinon panneau inline.

- [ ] **Step 3: Vérifier manuellement / test composant si existant**

Run: `cd app && npm run typecheck`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/src/features/session/
git commit -m "$(cat <<'EOF'
feat(session): skip exercise and confirm implausible workout duration

EOF
)"
```

---

### Task 8: UI historique — badge durée + édition + libellés

**Files:**
- Modify: `app/src/features/history/WorkoutDetailScreen.tsx`
- Modify: `app/src/features/history/HistoryScreen.module.css`

**Interfaces:**
- Consumes: `updateWorkoutTimes`, `workoutDurationSec`, `isImplausibleDuration`

- [ ] **Step 1: Afficher durée + badge**

Sous le tonnage :

```tsx
const durationSec = workoutDurationSec(detail.workout.startedAt, detail.workout.endedAt);
const suspect = durationSec != null && isImplausibleDuration(durationSec);
```

Afficher `Durée : X min` ou `Durée inconnue` ; si suspect, `<span className={styles.suspect}>durée suspecte</span>`.

- [ ] **Step 2: Édition des horaires**

Bouton `Corriger les heures` → panneau avec deux `<input type="datetime-local">` préremplis depuis `startedAt`/`endedAt` (conversion ISO ↔ local).  
Enregistrer via `updateWorkoutTimes` ; catch erreur → message `La fin doit être après le début.`  
Recharger le détail.

- [ ] **Step 3: Libellés statut exercice**

Pour chaque bloc exercice :

- `skipped` → `Ignoré`
- `planned` et `sets.length === 0` → `Non fait`
- sinon rien (ou `Terminé` discret si tu veux — YAGNI : seulement Ignoré / Non fait)

Si `sets` vides et statut planned : ne pas afficher de fausse série.

Warning discret si une série a `weightKg`/`reps` invalides alors que non-warmup : `série incomplète (exclue des stats)`.

- [ ] **Step 4: Styles**

```css
.suspect {
  color: var(--laiton, #c4a35a);
  font-size: var(--fs-14);
}

.statusLabel {
  color: var(--fonte-300);
  font-size: var(--fs-14);
  font-weight: 400;
}
```

- [ ] **Step 5: Typecheck**

Run: `cd app && npm run typecheck && npm run test`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/src/features/history/
git commit -m "$(cat <<'EOF'
feat(history): flag implausible duration and show exercise completion labels

EOF
)"
```

---

### Task 9: Doc modèle de données

**Files:**
- Modify: `docs/04-modele-de-donnees.md`

- [ ] **Step 1: Documenter**

Dans la section `WorkoutExercise`, ajouter `completionStatus` avec les 4 valeurs et la règle de migration historique.

Dans Formules / invariants, noter que `totalTonnageKg` est un agrégat rafraîchi à chaque mutation de série (pas un fait immuable).

- [ ] **Step 2: Commit**

```bash
git add docs/04-modele-de-donnees.md
git commit -m "$(cat <<'EOF'
docs: document completionStatus and tonnage aggregate refresh

EOF
)"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|---|---|
| Recalcul tonnage après mutation | 4 |
| Formule + exclusions | 1, 4 |
| Migration tonnage historique | 6 |
| `isImplausibleDuration` + badge | 1, 8 |
| Confirmation à la clôture | 7 |
| Édition `startedAt`/`endedAt` | 5, 8 |
| `completionStatus` + transitions | 2, 3, 5 |
| Bouton Ignorer | 7 |
| Historique → planned pas skipped | 2, 6 |
| Option marquer non faits ignorés | 5, 7 |
| Séries incomplètes hors stats | 1, 8 |
| Hors scope RIR/PR/coach | respecté |

## Placeholder scan

Aucun TBD / « implement later » restant.

## Type consistency

- `ExerciseCompletionStatus` : domaine → schema réexport
- `recomputeWorkoutTonnage(workoutId: string): Promise<number>`
- `SETTINGS_KEYS.dataReliabilityMigratedV1`
