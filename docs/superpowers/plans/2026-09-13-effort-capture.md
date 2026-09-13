# Effort Capture (Lot 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Brancher la saisie optionnelle du RIR par série de travail et le `setKind` (échauffement / approche / travail) pendant la séance et en édition historique.

**Architecture:** Helpers purs dans `domain/set-kind.ts` ; `SetLog.setKind` + sync `isWarmup`/`rir` dans `workouts.repo` ; chips UI dans `ActiveSessionScreen` ; affichage dans `SetInput` et édition dans `WorkoutDetailScreen` ; migration Dexie v3.

**Tech Stack:** React 19, Dexie, Vitest, CSS modules existants. Pas de nouvelle dépendance.

## Global Constraints

- Spec : `docs/superpowers/specs/2026-09-13-effort-capture-design.md`
- RIR optionnel, valeurs UI `0|1|2|3+` → stocké `0|1|2|3` ; retap = `null`
- `isWarmup = setKind !== 'work'` ; `rir` forcé `null` si pas `work`
- Approche et échauffement hors tonnage/PR (via `isWarmup`)
- Aucun écran intermédiaire ; chips au-dessus de VALIDER
- Pas de cardio / poids du jour
- Commits fréquents ; TDD domaine ; commandes depuis `app/` : `npx vitest run …`, `npm run typecheck`
- Créer une branche `feat/effort-capture` depuis `master` avant le code

## File structure

| File | Responsibility |
|---|---|
| `app/src/domain/set-kind.ts` | Types helpers, labels, normalizeRir, isWarmupFromKind |
| `app/tests/domain/set-kind.test.ts` | Tests domaine |
| `app/src/db/schema.ts` | `SetKind`, champ `setKind` sur `SetLog` |
| `app/src/db/db.ts` | Dexie `version(3)` backfill |
| `app/src/repositories/workouts.repo.ts` | logSet/editSetLog + last RIR |
| `app/tests/repositories/workouts-effort.test.ts` | Tests repo |
| `app/src/features/session/EffortChips.tsx` (+ css) | Kind + RIR chips |
| `app/src/features/session/ActiveSessionScreen.tsx` | Brancher état + logSet |
| `app/src/features/session/SetInput.tsx` | Afficher É/A/RIR |
| `app/src/features/history/WorkoutDetailScreen.tsx` | Éditer kind + RIR |
| `docs/01-architecture-fonctionnelle.md` | RG-11 |
| `docs/04-modele-de-donnees.md` | setKind / rir |

---

### Task 1: Domain set-kind

**Files:**
- Create: `app/src/domain/set-kind.ts`
- Test: `app/tests/domain/set-kind.test.ts`

**Interfaces:**
- Produces:
  - `export type SetKind = 'warmup' | 'approach' | 'work'`
  - `export function isWarmupFromKind(kind: SetKind): boolean`
  - `export function normalizeRir(kind: SetKind, rir: number | null): number | null`
  - `export function rirFromChip(chip: 0 | 1 | 2 | '3+'): number`
  - `export function setKindShortLabel(kind: SetKind): string` — `É` / `A` / `''`
  - `export function formatSetRir(rir: number | null): string` — `RIR 2` ou `''`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  formatSetRir,
  isWarmupFromKind,
  normalizeRir,
  rirFromChip,
  setKindShortLabel,
} from '../../src/domain/set-kind';

describe('set-kind', () => {
  it('isWarmupFromKind', () => {
    expect(isWarmupFromKind('warmup')).toBe(true);
    expect(isWarmupFromKind('approach')).toBe(true);
    expect(isWarmupFromKind('work')).toBe(false);
  });

  it('normalizeRir force null hors work', () => {
    expect(normalizeRir('work', 2)).toBe(2);
    expect(normalizeRir('approach', 2)).toBeNull();
    expect(normalizeRir('warmup', 0)).toBeNull();
    expect(normalizeRir('work', null)).toBeNull();
  });

  it('rirFromChip mappe 3+', () => {
    expect(rirFromChip(0)).toBe(0);
    expect(rirFromChip('3+')).toBe(3);
  });

  it('labels', () => {
    expect(setKindShortLabel('warmup')).toBe('É');
    expect(setKindShortLabel('approach')).toBe('A');
    expect(setKindShortLabel('work')).toBe('');
    expect(formatSetRir(2)).toBe('RIR 2');
    expect(formatSetRir(null)).toBe('');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

`cd app && npx vitest run tests/domain/set-kind.test.ts`

- [ ] **Step 3: Implement**

```ts
export type SetKind = 'warmup' | 'approach' | 'work';

export function isWarmupFromKind(kind: SetKind): boolean {
  return kind !== 'work';
}

export function normalizeRir(kind: SetKind, rir: number | null): number | null {
  if (kind !== 'work') return null;
  return rir;
}

export function rirFromChip(chip: 0 | 1 | 2 | '3+'): number {
  return chip === '3+' ? 3 : chip;
}

export function setKindShortLabel(kind: SetKind): string {
  if (kind === 'warmup') return 'É';
  if (kind === 'approach') return 'A';
  return '';
}

export function formatSetRir(rir: number | null): string {
  return rir == null ? '' : `RIR ${rir}`;
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add app/src/domain/set-kind.ts app/tests/domain/set-kind.test.ts
git commit -m "feat(domain): add setKind and RIR helpers"
```

---

### Task 2: Schema + Dexie v3

**Files:**
- Modify: `app/src/db/schema.ts`
- Modify: `app/src/db/db.ts`

**Interfaces:**
- Import `SetKind` from domain (ou définir dans schema et réexporter) — **retenu :** type dans `domain/set-kind.ts`, schema importe et réexporte.

- [ ] **Step 1: Update schema**

```ts
import type { SetKind } from '../domain/set-kind';
export type { SetKind };
```

Sur `SetLog` ajouter :

```ts
setKind: SetKind;
```

- [ ] **Step 2: Dexie version 3**

Après `version(2)`, ajouter `version(3)` avec les mêmes stores + upgrade :

```ts
.upgrade(async (tx) => {
  await tx.table('setLogs').toCollection().modify((s: { isWarmup?: boolean; setKind?: string }) => {
    if (s.setKind == null) {
      s.setKind = s.isWarmup ? 'warmup' : 'work';
    }
  });
});
```

- [ ] **Step 3: Fix toutes les créations de SetLog**

Dans `logSet` (temporairement `setKind: 'work'` jusqu’à Task 3) et dans les tests qui construisent des `SetLog` (`migrate-reliability.test.ts`, etc.) : ajouter `setKind`.

- [ ] **Step 4: `npm run typecheck` — PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(db): add setKind to SetLog and Dexie v3 migration"
```

---

### Task 3: Repository logSet / editSetLog / last RIR

**Files:**
- Modify: `app/src/repositories/workouts.repo.ts`
- Test: `app/tests/repositories/workouts-effort.test.ts`

**Interfaces:**
- `LogSetInput` gagne `setKind: SetKind` et `rir: number | null`
- `editSetLog` patch gagne `setKind?` et `rir?`
- `export async function getLastWorkRir(exerciseId: string, excludeWorkoutExerciseId?: string): Promise<number | null>`

- [ ] **Step 1: Write failing tests** (même harness que `workouts-tonnage.test.ts`)

Cas :
1. `logSet` approach → `isWarmup true`, `rir null`, tonnage 0
2. `logSet` work + rir 2 → persistés
3. `logSet` work + rir avec kind approach dans input → rir forcé null via `normalizeRir`
4. `editSetLog` work → approach → tonnage recalculé à 0
5. `getLastWorkRir` retourne le dernier rir work non null

- [ ] **Step 2: Implement**

Dans `logSet` :

```ts
import { isWarmupFromKind, normalizeRir, type SetKind } from '../domain/set-kind';

// input: setKind, rir
const setKind = input.setKind;
const isWarmup = isWarmupFromKind(setKind);
const rir = normalizeRir(setKind, input.rir);
// detectPrKinds with isWarmup
// put set with setKind, isWarmup, rir
```

`editSetLog` : après merge patch, recalculer `isWarmup`/`rir`/`e1rm`, puis `recomputeWorkoutTonnage`.

`getLastWorkRir` : parcourir séries de l’exercice (comme `getLastCompletedSets`), trouver le plus récent `setKind === 'work' && rir != null`.

- [ ] **Step 3: Mettre à jour tous les appels `logSet` existants** (ActiveSession temporairement `setKind: 'work', rir: null` si pas encore Task 4)

- [ ] **Step 4: Tests PASS + typecheck**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(workouts): persist setKind and RIR on set log and edit"
```

---

### Task 4: EffortChips + ActiveSessionScreen

**Files:**
- Create: `app/src/features/session/EffortChips.tsx`
- Create: `app/src/features/session/EffortChips.module.css`
- Modify: `app/src/features/session/ActiveSessionScreen.tsx`

**Interfaces:**
- Props EffortChips :

```ts
{
  setKind: SetKind;
  onSetKindChange: (k: SetKind) => void;
  rir: number | null;
  onRirChange: (r: number | null) => void;
}
```

- [ ] **Step 1: Implement EffortChips**

- 3 boutons kind (style segment, radius ≤ 10px, pas pill full)
- Si `setKind === 'work'` : 4 boutons RIR ; sélectionné = fond `--acier` ; retap → `onRirChange(null)`
- `3+` via `rirFromChip` ; affichage sélectionné si `rir === 3` sur chip `3+`

- [ ] **Step 2: State dans ActiveSessionScreen**

```ts
const [setKind, setSetKind] = useState<SetKind>('work');
const [rir, setRir] = useState<number | null>(null);
```

Au chargement d’un exercice (`currentExerciseId` change) : `setSetKind('work')` ; `void getLastWorkRir(id).then(setRir)`.

Dans `handleValidate` : passer `setKind` et `rir` à `logSet` (ne pas reset kind après validate).

Afficher `<EffortChips … />` dans la zone controls, avant `actions` / VALIDER (uniquement step exercise/superset, loadType weight ou reps — aussi time? Spec dit séries de travail ; pour `time` afficher kind seulement, RIR si work).

- [ ] **Step 3: typecheck**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(session): add setKind and RIR chips above validate"
```

---

### Task 5: SetInput labels + WorkoutDetail edit

**Files:**
- Modify: `app/src/features/session/SetInput.tsx`
- Modify: `app/src/features/history/WorkoutDetailScreen.tsx`
- Modify: CSS history si besoin

- [ ] **Step 1: SetInput**

Après le texte charge×reps, ajouter :

```ts
const kindLabel = setKindShortLabel(log.setKind ?? (log.isWarmup ? 'warmup' : 'work'));
const rirLabel = formatSetRir(log.rir);
// afficher · É / · A / · RIR n
```

- [ ] **Step 2: WorkoutDetailScreen**

En mode édition d’une série : steppers charge/reps + `EffortChips` (ou selects simples) ; `editSetLog` avec kind+rir.

Affichage lecture : mêmes suffixes que SetInput.

- [ ] **Step 3: typecheck + tests effort**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(history): show and edit setKind and RIR"
```

---

### Task 6: Docs RG-11 + modèle

**Files:**
- Modify: `docs/01-architecture-fonctionnelle.md`
- Modify: `docs/04-modele-de-donnees.md`

- [ ] **Step 1: Remplacer RG-11**

Nouveau texte :

> `RG-11` Le RIR est saisi **par série de travail**, optionnel, prérempli avec la dernière valeur du même exercice. Valeurs : 0, 1, 2, 3+ (stocké 3). Les séries `warmup` et `approach` n’ont pas de RIR. Le RPE de fin d’exercice (`sessionRpe`) n’est pas exigé pour la V1 effort.

- [ ] **Step 2: Documenter `setKind` et `rir` dans `04-modele-de-donnees.md`**

- [ ] **Step 3: Commit**

```bash
git commit -m "docs: update RG-11 for per-set RIR and setKind"
```

---

### Task 7: Commit spec + plan si pas déjà versionnés

**Files:**
- `docs/superpowers/specs/2026-09-13-effort-capture-design.md`
- `docs/superpowers/plans/2026-09-13-effort-capture.md` (ce fichier)

- [ ] **Step 1:** S’assurer qu’ils sont commités sur la branche feature.

---

## Spec coverage

| Requirement | Task |
|---|---|
| Domain helpers | 1 |
| setKind schema + migration | 2 |
| Persist + last RIR + edit | 3 |
| Chips séance | 4 |
| Affichage / édition historique | 5 |
| RG-11 docs | 6 |
| Cardio/poids exclus | — |

## Placeholder scan

Aucun TBD.
