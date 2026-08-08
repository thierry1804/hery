# Program Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre d’éditer le programme A/B/C (séances, items, chiffres) depuis Réglages, avec restore seed et sans toucher à l’historique / séance en cours.

**Architecture:** Validation pure dans `domain/program-validation.ts` ; mutations IndexedDB dans `program.repo.ts` (+ extraction helpers de seed pour restore) ; écrans sous `features/program/` branchés en routes nested depuis `/settings` ; UI Fonte/magnésie avec `Stepper`, `BigButton`, `Sheet`.

**Tech Stack:** React 19, React Router 7, Dexie, Vitest, CSS modules, seed JSON existants.

## Global Constraints

- Spec : `docs/superpowers/specs/2026-08-08-program-editor-design.md`
- Hors-ligne IndexedDB uniquement
- Éditer les 3 séances A/B/C existantes seulement (pas créer/supprimer de templates)
- Snapshot : historique + séance `in_progress` inchangés ; Aujourd’hui / prochaines séances = live
- Enregistrement item via bouton **Enregistrer**
- Soft-delete items (`deletedAt`)
- `dayOfWeek` unique parmi templates non supprimés
- Restore seed avec IDs templates stables (`tpl-seance-a/b/c`) ; confirmation obligatoire
- Lien Réglages : `Modifier le programme →`
- Routes exactes : `/settings/program`, `/settings/program/:templateId`, `/settings/program/:templateId/items/new`, `/settings/program/:templateId/items/:itemId`
- Pas de 5e onglet ; pas de générateur ; pas d’édition des phases
- Work from `app/` ; PowerShell : `;` not `&&` ; `npm run test` / `npm run typecheck`
- TDD sur domaine + repo ; commits fréquents

## File structure

| File | Responsibility |
|---|---|
| `app/src/domain/program-validation.ts` | Validate dayOfWeek, item patches |
| `app/tests/domain/program-validation.test.ts` | Unit tests validation |
| `app/src/db/seed-program.ts` | Pure builders from programme seed (shared by seed + restore) |
| `app/src/db/seed.ts` | Use builders ; keep `seedIfNeeded` |
| `app/src/repositories/program.repo.ts` | CRUD + reorder + restore |
| `app/tests/repositories/program.repo.test.ts` | Repo tests with fake-indexeddb |
| `app/src/features/program/formatPrescription.ts` | Short label `3×12 · 90 s` |
| `app/src/features/program/ProgramHubScreen.tsx` (+ css) | Hub |
| `app/src/features/program/SessionEditScreen.tsx` (+ css) | Séance |
| `app/src/features/program/ItemEditScreen.tsx` (+ css) | Item form |
| `app/src/features/program/ExercisePickerSheet.tsx` (+ css) | Picker |
| `app/src/features/settings/SettingsScreen.tsx` | Link entry |
| `app/src/App.tsx` | Routes |

---

### Task 1: Domain validation

**Files:**
- Create: `app/src/domain/program-validation.ts`
- Test: `app/tests/domain/program-validation.test.ts`

**Interfaces:**
- Consumes: `ItemKind` from schema (or string union duplicated lightly)
- Produces:
  - `export type ValidationOk = { ok: true }`
  - `export type ValidationErr = { ok: false; error: string }`
  - `export function validateDayOfWeek(day: number): ValidationOk | ValidationErr`
  - `export function validateItemPatch(input: { kind: string; sets: number | null; repsTarget: number | null; repsRangeMin: number | null; repsRangeMax: number | null; durationSec: number | null; restSec: number }): ValidationOk | ValidationErr`

Rules (verbatim):
- `dayOfWeek` ∈ 1..7
- `restSec >= 0`
- `strength`/`core`: `sets >= 1` ; either `repsTarget != null` OR both range bounds with `min <= max` (and if target set, ranges should be null — reject if target AND range both set)
- `cardio`: `durationSec > 0`
- `warmup`/`stretch`: if `durationSec != null` then `> 0`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { validateDayOfWeek, validateItemPatch } from '../../src/domain/program-validation';

describe('validateDayOfWeek', () => {
  it('accepts 1..7', () => {
    expect(validateDayOfWeek(1).ok).toBe(true);
    expect(validateDayOfWeek(7).ok).toBe(true);
  });
  it('rejects 0 and 8', () => {
    expect(validateDayOfWeek(0).ok).toBe(false);
    expect(validateDayOfWeek(8).ok).toBe(false);
  });
});

describe('validateItemPatch', () => {
  it('accepts strength with sets and repsTarget', () => {
    expect(
      validateItemPatch({
        kind: 'strength',
        sets: 3,
        repsTarget: 10,
        repsRangeMin: null,
        repsRangeMax: null,
        durationSec: null,
        restSec: 90,
      }).ok,
    ).toBe(true);
  });
  it('rejects strength without sets', () => {
    expect(
      validateItemPatch({
        kind: 'strength',
        sets: null,
        repsTarget: 10,
        repsRangeMin: null,
        repsRangeMax: null,
        durationSec: null,
        restSec: 60,
      }).ok,
    ).toBe(false);
  });
  it('rejects negative rest', () => {
    expect(
      validateItemPatch({
        kind: 'strength',
        sets: 3,
        repsTarget: 10,
        repsRangeMin: null,
        repsRangeMax: null,
        durationSec: null,
        restSec: -1,
      }).ok,
    ).toBe(false);
  });
  it('requires duration for cardio', () => {
    expect(
      validateItemPatch({
        kind: 'cardio',
        sets: null,
        repsTarget: null,
        repsRangeMin: null,
        repsRangeMax: null,
        durationSec: null,
        restSec: 0,
      }).ok,
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

`cd app; npm run test -- tests/domain/program-validation.test.ts`

- [ ] **Step 3: Implement `program-validation.ts`**

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add app/src/domain/program-validation.ts app/tests/domain/program-validation.test.ts
git commit -m "feat(program): validation helpers for editor"
```

---

### Task 2: Extract seed builders + restore helper (pure)

**Files:**
- Create: `app/src/db/seed-program.ts`
- Modify: `app/src/db/seed.ts` — call builders
- Test: `app/tests/domain/seed-program.test.ts` (pure, no idb)

**Interfaces:**
- Produces:
  - `export function buildProgramFromSeed(ts: string): { cycle: ProgramCycle; templates: SessionTemplate[]; prescribedItems: PrescribedItem[] }`
  - Item IDs: use **deterministic** ids for restore stability where possible: `pi-${templateId}-${order}` (e.g. `pi-tpl-seance-a-10`) so restore overwrites same rows ; `seedIfNeeded` first install can use same scheme
  - Templates keep seed ids `tpl-seance-a` etc.
  - Warmup orders from seed ; stretch order `1000`

Refactor `seed.ts` `toPrescribedItem` into `seed-program.ts`. `seedIfNeeded` builds via `buildProgramFromSeed(nowIso())` then bulkPut.

- [ ] **Step 1: Move builders + adjust seed.ts**
- [ ] **Step 2: Test** that `buildProgramFromSeed` returns 3 templates and items including warmups per template
- [ ] **Step 3: typecheck + test**
- [ ] **Step 4: Commit** `refactor(program): extract seed program builders`

---

### Task 3: program.repo mutations

**Files:**
- Modify: `app/src/repositories/program.repo.ts`
- Test: `app/tests/repositories/program.repo.test.ts`
- Setup: reuse `app/tests/setup.ts` + `fake-indexeddb` (already a dep)

**Interfaces:**
- Consumes: validation helpers, `buildProgramFromSeed`, `db`, `nowIso`, `newId`
- Produces:
  - `updateCycle(id, patch: Partial<Pick<ProgramCycle, 'name'>>): Promise<void>`
  - `updateSessionTemplate(id, patch: Partial<Pick<SessionTemplate, 'label' | 'dayOfWeek' | 'targetDurationMin'>>): Promise<void>` — throws or returns err if day conflict
  - `createPrescribedItem(sessionTemplateId, input: Omit<PrescribedItem, keyof Common | 'id' | 'sessionTemplateId'> & { id?: string }): Promise<PrescribedItem>`
  - `updatePrescribedItem(id, patch): Promise<void>`
  - `softDeletePrescribedItem(id): Promise<void>`
  - `reorderPrescribedItems(sessionTemplateId, orderedIds: string[]): Promise<void>` — sets order to `(index+1)*10`
  - `restoreProgramFromSeed(): Promise<void>` — transaction: for active cycle templates, soft-delete all their current prescribedItems not in rebuilt set OR simpler: soft-delete all prescribedItems for those template ids, then `bulkPut` templates + items from `buildProgramFromSeed` (templates overwrite in place; new item ids deterministic)

`updateSessionTemplate` uniqueness:

```ts
const others = await getAllTemplates();
if (others.some((t) => t.id !== id && t.dayOfWeek === patch.dayOfWeek)) {
  throw new Error('Ce jour est déjà pris par une autre séance.');
}
```

- [ ] **Step 1: Failing repo tests** (seed db in beforeEach via `buildProgramFromSeed` + put)
- [ ] **Step 2: Implement mutations**
- [ ] **Step 3: PASS tests + typecheck**
- [ ] **Step 4: Commit** `feat(program): repository mutations and seed restore`

---

### Task 4: Settings link + ProgramHub + routes

**Files:**
- Create: `app/src/features/program/ProgramHubScreen.tsx`
- Create: `app/src/features/program/ProgramHubScreen.module.css`
- Create: `app/src/features/program/programShared.module.css` (shared plate/row styles)
- Modify: `app/src/features/settings/SettingsScreen.tsx`
- Modify: `app/src/App.tsx`

**Interfaces:**
- Hub loads `getActiveCycle` + `getAllTemplates`
- Edit cycle name: input + Enregistrer → `updateCycle`
- List templates as links to `/settings/program/:id`
- Restore button opens `Sheet` confirmation → `restoreProgramFromSeed` → reload list
- Settings: new plate section Programme with `<Link to="/settings/program">Modifier le programme →</Link>`

DAY_NAMES shared constant in `features/program/days.ts`:

```ts
export const DAY_NAMES = ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
```

App routes:

```tsx
<Route path="/settings" element={<SettingsScreen />} />
<Route path="/settings/program" element={<ProgramHubScreen />} />
<Route path="/settings/program/:templateId" element={<SessionEditScreen />} />
<Route path="/settings/program/:templateId/items/new" element={<ItemEditScreen />} />
<Route path="/settings/program/:templateId/items/:itemId" element={<ItemEditScreen />} />
```

(SessionEditScreen / ItemEditScreen can be stubs returning « … » in this task if needed — prefer implement hub fully and stub children with placeholder component that reads params.)

- [ ] **Step 1: Implement hub + settings link + routes** (stubs OK for session/item)
- [ ] **Step 2: typecheck**
- [ ] **Step 3: Commit** `feat(program): Program hub and settings entry`

---

### Task 5: SessionEditScreen

**Files:**
- Create: `app/src/features/program/SessionEditScreen.tsx` (+ css)
- Create: `app/src/features/program/formatPrescription.ts`
- Test (optional unit): `formatPrescription`

**Behavior:**
- Load template + items + exercise names
- Form: label (text), dayOfWeek (`<select>`), targetDurationMin (Stepper or number)
- Save meta → `updateSessionTemplate` ; show error string if day taken
- Item rows: Link to item edit ; buttons ↑↓ calling `reorderPrescribedItems`
- CTA BigButton → `/settings/program/:id/items/new`
- Back link → `/settings/program`

`formatPrescription(item)`:
- sets+repsTarget → `${sets}×${repsTarget}`
- sets+range → `${sets}×${min}–${max}`
- durationSec → minutes if ≥60 else seconds
- append ` · ${restSec} s` if restSec > 0 and kind not warmup-only without rest display — always show rest for strength

- [ ] **Step 1: Implement screen**
- [ ] **Step 2: typecheck**
- [ ] **Step 3: Commit** `feat(program): session edit screen`

---

### Task 6: ItemEditScreen + ExercisePickerSheet

**Files:**
- Create: `app/src/features/program/ItemEditScreen.tsx` (+ css)
- Create: `app/src/features/program/ExercisePickerSheet.tsx` (+ css)

**Behavior:**
- `new` vs edit: if `itemId === undefined` route `items/new`
- Kind selector on create (strength/core/cardio/warmup/stretch); locked on edit (or editable — allow change kind)
- Fields per spec table ; Steppers for numeric
- Picker: Sheet with search input filtering `getAllExercises()` by name ; on pick set exerciseId + label from exercise.name for strength
- Enregistrer → validate → create/update → navigate back to session
- Supprimer (edit only) → confirm → softDelete → navigate back

- [ ] **Step 1: Implement picker + item form**
- [ ] **Step 2: typecheck + focused tests**
- [ ] **Step 3: Commit** `feat(program): item editor and exercise picker`

---

### Task 7: Integration polish + acceptance checks

**Files:**
- Possibly tweak CSS responsive (max-width 560, safe areas) matching Settings
- Fix any gaps from stubs

- [ ] **Step 1: Manual checklist**
  1. Réglages → Modifier le programme
  2. Edit label/jour/durée séance A
  3. Edit repos d’un exo → visible Aujourd’hui
  4. Add item, reorder, delete
  5. Replace exercise via picker
  6. Start workout — snapshot has new values ; abandon ; restore seed ; confirm A/B/C back
- [ ] **Step 2: `npm run test` + `npm run typecheck`**
- [ ] **Step 3: Commit** if polish needed `fix(program): editor polish`

---

## Spec coverage

| Spec item | Task |
|---|---|
| Validation rules | 1 |
| Seed restore stable ids | 2–3 |
| Repo CRUD / reorder / day unique | 3 |
| Settings link + hub + routes | 4 |
| Session meta + item list + reorder | 5 |
| Item form + picker + delete | 6 |
| Acceptance smoke | 7 |
| No history rewrite | guaranteed by snapshot (no code change to startWorkout) |

## Self-review

- No chart deps ; no 5th tab
- Enregistrer button (not autosave) locked in Task 6
- Deterministic prescribed item ids documented for restore
