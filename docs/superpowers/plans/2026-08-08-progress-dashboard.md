# Progress Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer un snapshot de progression factuel partagé entre Aujourd’hui et un nouvel onglet Progression (semaine, movers, PR, tonnage 4 semaines).

**Architecture:** Logique pure dans `domain/progress.ts` (testable sans IndexedDB) ; `progress.repo.ts` charge workouts / workoutExercises / setLogs / exercises et assemble un `ProgressSnapshot` ; composants UI partagés sous `features/progress/` ; route `/progress` + 4e onglet nav ; Today consomme le même snapshot.

**Tech Stack:** React 19, React Router 7, Dexie, Vitest, CSS modules, tokens Fonte/magnésie existants. Aucune lib de charts.

## Global Constraints

- Spec : `docs/superpowers/specs/2026-08-08-progress-dashboard-design.md`
- Hors-ligne uniquement (IndexedDB) ; pas de réseau
- Aucune dépendance chart ; pas de streak / XP / heatmap / corps / coach
- Cible séances semaine : `3`
- PR badge movers : fenêtre 14 jours ; liste PR : 90 jours, max 10
- Movers : max 3 ; ≥ 2 séances completed ; charge max non-warmup
- Tonnage display : `X,X t` si ≥ 1000 kg, sinon `N kg` ; virgule FR
- UI : plaques `--fonte-700`, radius 0 ; `Record` en `--laiton` + libellé
- Copie empty : `La progression apparaîtra après la première séance.`
- Lien Today : `Voir la progression →`
- Nav order : Aujourd’hui · Historique · Progression · Réglages
- Commits fréquents ; TDD sur le domaine ; `npm run test` / `npm run typecheck` depuis `app/`

## File structure

| File | Responsibility |
|---|---|
| `app/src/domain/progress.ts` | Types snapshot + pure helpers (semaine ISO, format, bars, movers, PR filter) |
| `app/tests/domain/progress.test.ts` | Unit tests domaine |
| `app/src/repositories/progress.repo.ts` | `getProgressSnapshot()` Dexie → snapshot |
| `app/src/features/progress/WeekSummary.tsx` (+ css) | Ligne semaine |
| `app/src/features/progress/MoversList.tsx` (+ css) | 3 movers |
| `app/src/features/progress/WeekTonnageBars.tsx` (+ css) | 4 barres |
| `app/src/features/progress/RecentPrsList.tsx` (+ css) | PR récents |
| `app/src/features/progress/LiftsList.tsx` (+ css) | Liste mouvements |
| `app/src/features/progress/ProgressScreen.tsx` (+ css) | Écran onglet |
| `app/src/features/progress/TodayProgressCard.tsx` (+ css) | Carte résumé Today |
| `app/src/ui/BottomNav.tsx` | 4e onglet |
| `app/src/App.tsx` | Route `/progress` |
| `app/src/features/today/TodayScreen.tsx` (+ css) | Intégration carte |

---

### Task 1: Domain — types, formats, semaine ISO, barres

**Files:**
- Create: `app/src/domain/progress.ts`
- Test: `app/tests/domain/progress.test.ts`

**Interfaces:**
- Consumes: rien (pure)
- Produces:
  - `export const WEEK_SESSION_TARGET = 3`
  - `export interface WeekStats { sessionsDone: number; sessionsTarget: number; tonnageKg: number; prCount: number }`
  - `export interface WeekBar { weekStart: string; tonnageKg: number }`
  - `export interface Mover { exerciseId: string; name: string; prevMaxKg: number; currMaxKg: number; deltaKg: number; hasRecentPr: boolean }`
  - `export interface RecentPr { setLogId: string; exerciseId: string; name: string; weightKg: number; reps: number; completedAt: string; prKinds: string[] }`
  - `export interface LiftRow { exerciseId: string; name: string; lastWeightKg: number; lastReps: number; prevMaxKg: number | null; deltaKg: number | null }`
  - `export interface ProgressSnapshot { hasAnyCompletedWorkout: boolean; week: WeekStats; weekBars: WeekBar[]; movers: Mover[]; recentPrs: RecentPr[]; lifts: LiftRow[] }`
  - `startOfIsoWeek(d: Date): Date`
  - `toDateStr` reuse from `../lib/date` — do not reimplement
  - `isoWeekStarts(now: Date, count: number): string[]` — `count` lundis ISO, du plus ancien au plus récent (inclut semaine de `now`)
  - `formatTonnageKg(kg: number): string`
  - `formatWeightKg(kg: number): string`
  - `formatDeltaKg(delta: number): string` — `+2,5` / `−2,5` / `=`
  - `buildWeekBars(workouts: { date: string; totalTonnageKg: number; status: string }[], now: Date): WeekBar[]`
  - `summarizeWeek(workouts: { date: string; totalTonnageKg: number; status: string }[], prCount: number, now: Date): WeekStats`

- [ ] **Step 1: Write failing tests**

Create `app/tests/domain/progress.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  buildWeekBars,
  formatDeltaKg,
  formatTonnageKg,
  formatWeightKg,
  isoWeekStarts,
  startOfIsoWeek,
  summarizeWeek,
  WEEK_SESSION_TARGET,
} from '../../src/domain/progress';
import { toDateStr } from '../../src/lib/date';

describe('progress domain', () => {
  it('startOfIsoWeek returns Monday for a Wednesday', () => {
    const wed = new Date(2026, 7, 5); // 2026-08-05 local
    expect(toDateStr(startOfIsoWeek(wed))).toBe('2026-08-03');
  });

  it('isoWeekStarts returns 4 Mondays ending with current week', () => {
    const wed = new Date(2026, 7, 5);
    expect(isoWeekStarts(wed, 4)).toEqual([
      '2026-07-13',
      '2026-07-20',
      '2026-07-27',
      '2026-08-03',
    ]);
  });

  it('formatTonnageKg uses tonnes from 1000', () => {
    expect(formatTonnageKg(850)).toBe('850 kg');
    expect(formatTonnageKg(1800)).toBe('1,8 t');
    expect(formatTonnageKg(1000)).toBe('1,0 t');
  });

  it('formatWeightKg uses FR comma', () => {
    expect(formatWeightKg(52.5)).toBe('52,5');
    expect(formatWeightKg(50)).toBe('50');
  });

  it('formatDeltaKg signs correctly', () => {
    expect(formatDeltaKg(2.5)).toBe('+2,5');
    expect(formatDeltaKg(-2.5)).toBe('−2,5');
    expect(formatDeltaKg(0)).toBe('=');
  });

  it('summarizeWeek counts completed workouts in current ISO week', () => {
    const now = new Date(2026, 7, 8); // Saturday
    const week = summarizeWeek(
      [
        { date: '2026-08-03', totalTonnageKg: 1000, status: 'completed' },
        { date: '2026-08-05', totalTonnageKg: 800, status: 'completed' },
        { date: '2026-07-28', totalTonnageKg: 500, status: 'completed' },
        { date: '2026-08-04', totalTonnageKg: 100, status: 'abandoned' },
      ],
      2,
      now,
    );
    expect(week).toEqual({
      sessionsDone: 2,
      sessionsTarget: WEEK_SESSION_TARGET,
      tonnageKg: 1800,
      prCount: 2,
    });
  });

  it('buildWeekBars fills four weeks including zeros', () => {
    const now = new Date(2026, 7, 8);
    const bars = buildWeekBars(
      [{ date: '2026-08-03', totalTonnageKg: 1000, status: 'completed' }],
      now,
    );
    expect(bars).toHaveLength(4);
    expect(bars[3]).toEqual({ weekStart: '2026-08-03', tonnageKg: 1000 });
    expect(bars[0]?.tonnageKg).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `cd app && npm run test -- tests/domain/progress.test.ts`

Expected: FAIL (module not found / exports missing)

- [ ] **Step 3: Implement domain helpers**

Create `app/src/domain/progress.ts` with the interfaces above and:

```ts
import { toDateStr } from '../lib/date';

export const WEEK_SESSION_TARGET = 3;

export function startOfIsoWeek(d: Date): Date {
  const day = d.getDay() || 7; // Sun=7
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (day - 1));
  return start;
}

export function isoWeekStarts(now: Date, count: number): string[] {
  const current = startOfIsoWeek(now);
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(current);
    d.setDate(current.getDate() - i * 7);
    out.push(toDateStr(d));
  }
  return out;
}

export function formatTonnageKg(kg: number): string {
  if (kg >= 1000) {
    const t = kg / 1000;
    return `${t.toFixed(1).replace('.', ',')} t`;
  }
  return `${Math.round(kg)} kg`;
}

export function formatWeightKg(kg: number): string {
  return Number.isInteger(kg) ? String(kg) : kg.toFixed(1).replace('.', ',');
}

export function formatDeltaKg(delta: number): string {
  if (delta === 0) return '=';
  const abs = formatWeightKg(Math.abs(delta));
  return delta > 0 ? `+${abs}` : `−${abs}`;
}

export function summarizeWeek(
  workouts: { date: string; totalTonnageKg: number; status: string }[],
  prCount: number,
  now: Date,
): WeekStats {
  const weekStart = toDateStr(startOfIsoWeek(now));
  const done = workouts.filter((w) => w.status === 'completed' && w.date >= weekStart);
  return {
    sessionsDone: done.length,
    sessionsTarget: WEEK_SESSION_TARGET,
    tonnageKg: done.reduce((s, w) => s + w.totalTonnageKg, 0),
    prCount,
  };
}

export function buildWeekBars(
  workouts: { date: string; totalTonnageKg: number; status: string }[],
  now: Date,
): WeekBar[] {
  const starts = isoWeekStarts(now, 4);
  return starts.map((weekStart, idx) => {
    const next = starts[idx + 1];
    const endExclusive = next ?? '9999-99-99';
    const tonnageKg = workouts
      .filter((w) => w.status === 'completed' && w.date >= weekStart && w.date < endExclusive)
      .reduce((s, w) => s + w.totalTonnageKg, 0);
    // For the last (current) week, also include dates >= weekStart with no upper from next — use weekStart+7
    return { weekStart, tonnageKg };
  }).map((bar, idx, arr) => {
    if (idx < arr.length - 1) return bar;
    const weekStart = bar.weekStart;
    const tonnageKg = workouts
      .filter((w) => w.status === 'completed' && w.date >= weekStart)
      .reduce((s, w) => s + w.totalTonnageKg, 0);
    return { weekStart, tonnageKg };
  });
}
```

Fix `buildWeekBars` cleanly (preferred single-pass implementation):

```ts
export function buildWeekBars(
  workouts: { date: string; totalTonnageKg: number; status: string }[],
  now: Date,
): WeekBar[] {
  const starts = isoWeekStarts(now, 4);
  return starts.map((weekStart, idx) => {
    const nextStart = starts[idx + 1];
    const tonnageKg = workouts
      .filter((w) => {
        if (w.status !== 'completed') return false;
        if (w.date < weekStart) return false;
        if (nextStart && w.date >= nextStart) return false;
        return true;
      })
      .reduce((s, w) => s + w.totalTonnageKg, 0);
    return { weekStart, tonnageKg };
  });
}
```

Also export empty type stubs used later (`Mover`, etc.) in the same file even if unused yet.

- [ ] **Step 4: Run tests — expect PASS**

Run: `cd app && npm run test -- tests/domain/progress.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/domain/progress.ts app/tests/domain/progress.test.ts
git commit -m "feat(progress): domain helpers for week stats and formatting"
```

---

### Task 2: Domain — movers, recent PRs, lifts

**Files:**
- Modify: `app/src/domain/progress.ts`
- Modify: `app/tests/domain/progress.test.ts`

**Interfaces:**
- Consumes: types Task 1
- Produces:
  - `export interface ExerciseSessionLift { workoutDate: string; workoutId: string; maxWeightKg: number; repsAtMax: number; tonnageKg: number; hadPr: boolean; latestPrAt: string | null }`
  - `export function selectMovers(rows: { exerciseId: string; name: string; sessions: ExerciseSessionLift[] }[], now: Date, limit = 3): Mover[]`
  - `export function buildLifts(rows: { exerciseId: string; name: string; sessions: ExerciseSessionLift[] }[]): LiftRow[]`
  - `export function selectRecentPrs(prs: RecentPr[], now: Date, limit = 10): RecentPr[]` — filter `completedAt >= now - 90d`, sort desc

Rules for `selectMovers` (spec):
- Keep exercises with `sessions.length >= 2` (sessions already sorted by date asc)
- `prev` = second-to-last, `curr` = last
- `hasRecentPr` if any session has `latestPrAt` within 14 days of `now`, or `hadPr` on last session with date in range — use `latestPrAt` ISO compare
- Sort: `hasRecentPr` desc, then `|delta|/prevMax` desc (prevMax>0), then `curr.tonnageKg` desc
- Map to `Mover`, slice `limit`

- [ ] **Step 1: Write failing tests** (append to progress.test.ts)

```ts
import { buildLifts, selectMovers, selectRecentPrs } from '../../src/domain/progress';

describe('selectMovers', () => {
  const now = new Date('2026-08-08T12:00:00.000Z');

  it('needs two sessions and prefers recent PR then relative delta', () => {
    const movers = selectMovers(
      [
        {
          exerciseId: 'a',
          name: 'Presse',
          sessions: [
            { workoutDate: '2026-07-01', workoutId: '1', maxWeightKg: 50, repsAtMax: 10, tonnageKg: 1500, hadPr: false, latestPrAt: null },
            { workoutDate: '2026-08-01', workoutId: '2', maxWeightKg: 52.5, repsAtMax: 10, tonnageKg: 1575, hadPr: true, latestPrAt: '2026-08-01T10:00:00.000Z' },
          ],
        },
        {
          exerciseId: 'b',
          name: 'Row',
          sessions: [
            { workoutDate: '2026-07-01', workoutId: '1', maxWeightKg: 40, repsAtMax: 10, tonnageKg: 1200, hadPr: false, latestPrAt: null },
            { workoutDate: '2026-08-02', workoutId: '3', maxWeightKg: 40, repsAtMax: 10, tonnageKg: 1200, hadPr: false, latestPrAt: null },
          ],
        },
        {
          exerciseId: 'c',
          name: 'One',
          sessions: [
            { workoutDate: '2026-08-01', workoutId: '2', maxWeightKg: 100, repsAtMax: 5, tonnageKg: 500, hadPr: true, latestPrAt: '2026-08-01T10:00:00.000Z' },
          ],
        },
      ],
      now,
      3,
    );
    expect(movers.map((m) => m.exerciseId)).toEqual(['a']);
    expect(movers[0]?.deltaKg).toBe(2.5);
    expect(movers[0]?.hasRecentPr).toBe(true);
  });
});

describe('buildLifts', () => {
  it('includes single-session lifts with null delta', () => {
    const lifts = buildLifts([
      {
        exerciseId: 'c',
        name: 'One',
        sessions: [
          { workoutDate: '2026-08-01', workoutId: '2', maxWeightKg: 100, repsAtMax: 5, tonnageKg: 500, hadPr: true, latestPrAt: null },
        ],
      },
    ]);
    expect(lifts[0]).toMatchObject({
      exerciseId: 'c',
      lastWeightKg: 100,
      lastReps: 5,
      prevMaxKg: null,
      deltaKg: null,
    });
  });
});

describe('selectRecentPrs', () => {
  it('keeps last 90 days sorted desc', () => {
    const now = new Date('2026-08-08T12:00:00.000Z');
    const list = selectRecentPrs(
      [
        { setLogId: '1', exerciseId: 'a', name: 'A', weightKg: 50, reps: 10, completedAt: '2026-08-07T10:00:00.000Z', prKinds: ['weight'] },
        { setLogId: '2', exerciseId: 'b', name: 'B', weightKg: 60, reps: 8, completedAt: '2026-01-01T10:00:00.000Z', prKinds: ['weight'] },
        { setLogId: '3', exerciseId: 'c', name: 'C', weightKg: 70, reps: 6, completedAt: '2026-08-01T10:00:00.000Z', prKinds: ['reps'] },
      ],
      now,
      10,
    );
    expect(list.map((p) => p.setLogId)).toEqual(['1', '3']);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `cd app && npm run test -- tests/domain/progress.test.ts`  
Expected: FAIL on missing exports

- [ ] **Step 3: Implement selectMovers / buildLifts / selectRecentPrs**

Implement in `progress.ts` per rules above. For 14-day window:

```ts
const ms14 = 14 * 24 * 60 * 60 * 1000;
const hasRecentPr = sessions.some(
  (s) => s.latestPrAt != null && now.getTime() - new Date(s.latestPrAt).getTime() <= ms14,
);
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `cd app && npm run test -- tests/domain/progress.test.ts`  
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/domain/progress.ts app/tests/domain/progress.test.ts
git commit -m "feat(progress): movers, lifts and recent PR selection"
```

---

### Task 3: Repository `getProgressSnapshot`

**Files:**
- Create: `app/src/repositories/progress.repo.ts`
- Modify: `app/tests/domain/progress.test.ts` only if pure helpers need tiny adjustments — no fake-idb required if repo stays thin

**Interfaces:**
- Consumes: domain helpers Task 1–2 ; `db` from `../db/db` ; `listWorkouts` pattern from workouts.repo
- Produces: `export async function getProgressSnapshot(now?: Date): Promise<ProgressSnapshot>`

Algorithm:

1. `now = now ?? new Date()`
2. Load all non-deleted workouts; keep `completed` for aggregates (`hasAnyCompletedWorkout`)
3. Load all workoutExercises + setLogs (+ exercises map for names / unilateral not needed for max weight)
4. Group setLogs by exerciseId via workoutExercise → workout (completed only)
5. For each exerciseId, build `ExerciseSessionLift[]` per completed workout that has ≥1 non-warmup weight set:
   - `maxWeightKg` = max weightKg among those sets
   - `repsAtMax` = reps of the set that achieved max (if tie, higher reps)
   - `tonnageKg` = sum weight*reps for non-warmup weight sets
   - `hadPr` / `latestPrAt` from PR sets
6. `prCount` for current week: count PR setLogs whose parent workout is completed and `workout.date >= weekStart`
7. Assemble snapshot via domain helpers

```ts
export async function getProgressSnapshot(now: Date = new Date()): Promise<ProgressSnapshot> {
  // load + group + call summarizeWeek / buildWeekBars / selectMovers / buildLifts / selectRecentPrs
}
```

- [ ] **Step 1: Implement repo** (no separate idb test — covered by domain; smoke later)

Keep file focused; reuse `db.workouts`, `db.workoutExercises`, `db.setLogs`, `db.exercises`.

Filter: `deletedAt == null`, workouts `status === 'completed'` for lift history. Include abandoned? **No** for tonnage/movers — completed only.

- [ ] **Step 2: Typecheck**

Run: `cd app && npm run typecheck`  
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/src/repositories/progress.repo.ts
git commit -m "feat(progress): IndexedDB snapshot repository"
```

---

### Task 4: Shared UI — WeekSummary + MoversList

**Files:**
- Create: `app/src/features/progress/WeekSummary.tsx`
- Create: `app/src/features/progress/WeekSummary.module.css`
- Create: `app/src/features/progress/MoversList.tsx`
- Create: `app/src/features/progress/MoversList.module.css`

**Interfaces:**
- Consumes: `WeekStats`, `Mover`, `formatTonnageKg`, `formatWeightKg` from domain
- Produces: React components

- [ ] **Step 1: Implement WeekSummary**

```tsx
import type { WeekStats } from '../../domain/progress';
import { formatTonnageKg } from '../../domain/progress';
import styles from './WeekSummary.module.css';

export function WeekSummary({ week }: { week: WeekStats }) {
  const tonnage = formatTonnageKg(week.tonnageKg);
  const records =
    week.prCount > 0
      ? ` · ${week.prCount} record${week.prCount === 1 ? '' : 's'}`
      : '';
  return (
    <p className={styles.line}>
      <span className="tabular">{week.sessionsDone}</span> séance
      {week.sessionsDone === 1 ? '' : 's'} sur{' '}
      <span className="tabular">{week.sessionsTarget}</span>
      {' · '}
      <span className="tabular">{tonnage}</span>
      {records}
    </p>
  );
}
```

CSS: `color: var(--fonte-300); font-size: var(--fs-14); margin: 0;`

- [ ] **Step 2: Implement MoversList**

```tsx
import type { Mover } from '../../domain/progress';
import { formatWeightKg } from '../../domain/progress';
import styles from './MoversList.module.css';

export function MoversList({ movers }: { movers: Mover[] }) {
  if (movers.length === 0) return null;
  return (
    <ul className={styles.list}>
      {movers.map((m) => (
        <li key={m.exerciseId} className={styles.row}>
          <span className={styles.name}>{m.name}</span>
          <span className={`tabular ${styles.value}`}>
            {formatWeightKg(m.prevMaxKg)} → {formatWeightKg(m.currMaxKg)} kg
            {m.hasRecentPr ? <span className={styles.pr}> · Record</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
```

Style rows like Today `itemRow` (border-bottom `--fonte-500`, name magnésie, value fonte-300, `.pr` laiton).

- [ ] **Step 3: Typecheck**

Run: `cd app && npm run typecheck`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/src/features/progress/WeekSummary.tsx app/src/features/progress/WeekSummary.module.css app/src/features/progress/MoversList.tsx app/src/features/progress/MoversList.module.css
git commit -m "feat(progress): WeekSummary and MoversList UI"
```

---

### Task 5: Progress screen sections + route + nav

**Files:**
- Create: `app/src/features/progress/WeekTonnageBars.tsx` (+ css)
- Create: `app/src/features/progress/RecentPrsList.tsx` (+ css)
- Create: `app/src/features/progress/LiftsList.tsx` (+ css)
- Create: `app/src/features/progress/ProgressScreen.tsx` (+ css)
- Modify: `app/src/App.tsx`
- Modify: `app/src/ui/BottomNav.tsx`

**Interfaces:**
- Consumes: `getProgressSnapshot`, shared components, domain formatters
- Produces: `/progress` screen + nav tab

- [ ] **Step 1: WeekTonnageBars**

Props: `bars: WeekBar[]`  
Render 4 rows: label = short week (`formatDateFr` day/month or `dd/mm` from `weekStart`) + track/fill.  
`max = Math.max(...bars.map(b => b.tonnageKg), 1)`  
Fill width `% = (tonnageKg / max) * 100` ; if tonnageKg > 0 ensure min-width ~4px.

- [ ] **Step 2: RecentPrsList + LiftsList**

RecentPrs: `name — {reps} × {weight} kg` + optional kinds ignored in UI (just `Record` tone via laiton name or meta).  
Lifts: `name` | `{reps} × {weight} kg` | delta via `formatDeltaKg` or `—` if null.

- [ ] **Step 3: ProgressScreen**

```tsx
export function ProgressScreen() {
  const [snap, setSnap] = useState<ProgressSnapshot | null>(null);
  useEffect(() => {
    void getProgressSnapshot().then(setSnap);
  }, []);
  // skeleton if null
  // if !hasAnyCompletedWorkout → empty message
  // else sections: WeekSummary, WeekTonnageBars, RecentPrsList, LiftsList
}
```

Layout CSS mirror HistoryScreen (`screen`, `header`, `title`, plates).

- [ ] **Step 4: Wire App + BottomNav**

`BottomNav.tsx`:

```ts
const TABS = [
  { to: '/', label: "Aujourd'hui" },
  { to: '/history', label: 'Historique' },
  { to: '/progress', label: 'Progression' },
  { to: '/settings', label: 'Réglages' },
];
```

`App.tsx`: add  
`import { ProgressScreen } from './features/progress/ProgressScreen';`  
`<Route path="/progress" element={<ProgressScreen />} />`

- [ ] **Step 5: Typecheck + unit tests**

Run: `cd app && npm run typecheck && npm run test`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/src/features/progress app/src/App.tsx app/src/ui/BottomNav.tsx
git commit -m "feat(progress): Progression tab with shared snapshot UI"
```

---

### Task 6: Today integration

**Files:**
- Create: `app/src/features/progress/TodayProgressCard.tsx` (+ css)
- Modify: `app/src/features/today/TodayScreen.tsx`
- Modify: `app/src/features/today/TodayScreen.module.css` (only if spacing helpers needed)

**Interfaces:**
- Consumes: `getProgressSnapshot`, `WeekSummary`, `MoversList`
- Produces: card with empty state or summary + `Link` to `/progress`

- [ ] **Step 1: TodayProgressCard**

```tsx
export function TodayProgressCard() {
  const [snap, setSnap] = useState<ProgressSnapshot | null>(null);
  useEffect(() => {
    void getProgressSnapshot().then(setSnap);
  }, []);
  if (!snap) return null; // or thin skeleton
  return (
    <section className={styles.plate} aria-label="Progression">
      <p className={styles.label}>Cette semaine</p>
      {!snap.hasAnyCompletedWorkout ? (
        <p className={styles.empty}>La progression apparaîtra après la première séance.</p>
      ) : (
        <>
          <WeekSummary week={snap.week} />
          <MoversList movers={snap.movers} />
          <Link to="/progress" className={styles.more}>Voir la progression →</Link>
        </>
      )}
    </section>
  );
}
```

Even with completed workouts but 0 movers, still show WeekSummary + link.

- [ ] **Step 2: Insert into TodayScreen**

Rest branch (`template === null`): after `</header>`, before `<div className={styles.footer}>`:  
`<TodayProgressCard />`

Session day branch: after the movements `plate`, before `footer`:  
`<TodayProgressCard />`

Ensure footer / CTA still at bottom (`margin-top: auto` already on footer — keep).

- [ ] **Step 3: Manual smoke checklist**

1. 0 completed workouts → empty copy on Today + Progress  
2. Complete or use existing history → same week numbers on both screens  
3. Nav 4 tabs ; Progression active state  
4. Rest day layout: card fills gap ; hors-programme still reachable  
5. Session day: DÉMARRER still visible without hunting  

- [ ] **Step 4: Typecheck + tests**

Run: `cd app && npm run typecheck && npm run test`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/features/progress/TodayProgressCard.tsx app/src/features/progress/TodayProgressCard.module.css app/src/features/today/TodayScreen.tsx app/src/features/today/TodayScreen.module.css
git commit -m "feat(progress): show week snapshot on Today screen"
```

---

## Spec coverage check

| Spec item | Task |
|---|---|
| Nav 4 tabs + `/progress` | 5 |
| Today résumé repos + séance | 6 |
| Week line + movers + link | 4, 6 |
| Empty copy | 5, 6 |
| Progress sections (week, bars, PRs, lifts) | 5 |
| ProgressSnapshot rules | 1–3 |
| Formats FR / tonnes | 1 |
| No charts / no streak | global |
| Domain unit tests | 1–2 |
| Same week stats both screens | 3 + shared components |

## Placeholder / consistency self-review

- Types `ProgressSnapshot` / `Mover` / `WeekBar` named consistently across tasks  
- `WEEK_SESSION_TARGET = 3` single source  
- `buildWeekBars` last-week bound uses next Monday exclusive, not open-ended bug  
- No chart dependency introduced  
