# Exercise Trends (Lot 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrichir la courbe « Progression par exercice » avec métriques Charge / e1RM / Volume et fenêtres 4 / 8 / 12 semaines.

**Architecture:** Helpers purs dans `domain/progress.ts` ; `progress.repo` ajoute `maxE1rm` par séance ; `ExerciseTrendChart` gère sélecteurs et filtre client-side. Pas de lib de charts.

**Tech Stack:** React 19, Vitest, CSS modules. Aucune nouvelle dépendance.

## Global Constraints

- Spec : `docs/superpowers/specs/2026-09-13-exercise-trends-design.md`
- Défauts : métrique `weight`, fenêtre `8`
- Volume = `tonnageKg` (somme work) ; e1RM = max e1rm ; charge = maxWeightKg
- Points e1rm `null` omis ; &lt; 2 points dans fenêtre → message période
- Points PR agrandis seulement en métrique Charge
- Branche : `feat/exercise-trends` depuis `master`
- Commandes : `cd app && npx vitest run …` ; `npm run typecheck`

## File structure

| File | Responsibility |
|---|---|
| `app/src/domain/progress.ts` | Types + `filterSessionsByWeeks` + `metricValue` + format delta volume |
| `app/tests/domain/progress.test.ts` | Tests nouveaux helpers |
| `app/src/repositories/progress.repo.ts` | Remplir `maxE1rm` |
| `app/src/features/progress/ExerciseTrendChart.tsx` | UI sélecteurs + courbe |
| `app/src/features/progress/ExerciseTrendChart.module.css` | Styles chips |
| Spec + plan docs | Commit sur la branche |

---

### Task 1: Domain helpers + maxE1rm type

**Files:**
- Modify: `app/src/domain/progress.ts`
- Modify: `app/tests/domain/progress.test.ts`

**Interfaces:**
- Produces:
  - `export type TrendMetric = 'weight' | 'e1rm' | 'volume'`
  - `export type TrendWeeks = 4 | 8 | 12`
  - `ExerciseSessionLift.maxE1rm: number | null`
  - `filterSessionsByWeeks(sessions: ExerciseSessionLift[], weeks: TrendWeeks, now: Date): ExerciseSessionLift[]`
  - `metricValue(session: ExerciseSessionLift, metric: TrendMetric): number | null`
  - `formatTrendValue(metric, value): string` (optionnel — peut inline dans UI)
  - `formatTrendDelta(metric, delta): string` (volume : réutiliser logique proche `formatDeltaKg` ou `formatTonnageKg`)

- [ ] **Step 1: Extend type**

```ts
export interface ExerciseSessionLift {
  workoutDate: string;
  workoutId: string;
  maxWeightKg: number;
  repsAtMax: number;
  tonnageKg: number;
  maxE1rm: number | null;
  hadPr: boolean;
  latestPrAt: string | null;
}
```

- [ ] **Step 2: Failing tests**

```ts
it('filterSessionsByWeeks keeps dates within window', () => {
  const now = new Date(2026, 8, 13); // 2026-09-13
  const sessions = [
    { workoutDate: '2026-06-01', workoutId: 'a', maxWeightKg: 50, repsAtMax: 8, tonnageKg: 400, maxE1rm: 60, hadPr: false, latestPrAt: null },
    { workoutDate: '2026-08-20', workoutId: 'b', maxWeightKg: 55, repsAtMax: 8, tonnageKg: 440, maxE1rm: 65, hadPr: false, latestPrAt: null },
    { workoutDate: '2026-09-10', workoutId: 'c', maxWeightKg: 60, repsAtMax: 8, tonnageKg: 480, maxE1rm: 70, hadPr: true, latestPrAt: 'x' },
  ];
  const filtered = filterSessionsByWeeks(sessions, 4, now);
  expect(filtered.map((s) => s.workoutId)).toEqual(['b', 'c']); // 4*7=28 days → from ~2026-08-16
});

it('metricValue returns null for missing e1rm', () => {
  const s = { workoutDate: '2026-09-10', workoutId: 'c', maxWeightKg: 60, repsAtMax: 8, tonnageKg: 480, maxE1rm: null, hadPr: false, latestPrAt: null };
  expect(metricValue(s, 'e1rm')).toBeNull();
  expect(metricValue(s, 'weight')).toBe(60);
  expect(metricValue(s, 'volume')).toBe(480);
});
```

Ajuster la borne exacte du filtre : `cutoff = nowDateStr - weeks*7` via `toDateStr` local.

- [ ] **Step 3: Implement**

```ts
export function filterSessionsByWeeks(
  sessions: ExerciseSessionLift[],
  weeks: TrendWeeks,
  now: Date,
): ExerciseSessionLift[] {
  const cutoff = new Date(now);
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - weeks * 7);
  const cutoffStr = toDateStr(cutoff);
  return sessions.filter((s) => s.workoutDate >= cutoffStr);
}

export function metricValue(session: ExerciseSessionLift, metric: TrendMetric): number | null {
  if (metric === 'weight') return session.maxWeightKg;
  if (metric === 'volume') return session.tonnageKg;
  return session.maxE1rm;
}
```

Mettre à jour tout objet `ExerciseSessionLift` dans les tests existants (`maxE1rm: null` ou une valeur).

- [ ] **Step 4: PASS + commit**

```bash
git commit -m "feat(domain): trend metric helpers and maxE1rm on session lifts"
```

---

### Task 2: Repo maxE1rm

**Files:**
- Modify: `app/src/repositories/progress.repo.ts`
- Modify: tests progress si snapshots construisent des sessions (grep `maxWeightKg`)

- [ ] **Step 1: Dans la boucle sessions.push**

```ts
const e1rms = weightSets.map((s) => s.e1rm).filter((v): v is number => v != null);
const maxE1rm = e1rms.length > 0 ? Math.max(...e1rms) : null;

sessions.push({
  ...
  maxE1rm,
});
```

- [ ] **Step 2: typecheck + fix tests features/progress si besoin**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(progress): compute maxE1rm per exercise session"
```

---

### Task 3: ExerciseTrendChart UI

**Files:**
- Modify: `ExerciseTrendChart.tsx`
- Modify: `ExerciseTrendChart.module.css`

- [ ] **Step 1: State**

```ts
const [metric, setMetric] = useState<TrendMetric>('weight');
const [weeks, setWeeks] = useState<TrendWeeks>(8);
```

- [ ] **Step 2: Derive points**

```ts
const windowed = filterSessionsByWeeks(selected.sessions, weeks, new Date());
const plotted = windowed
  .map((s) => ({ session: s, value: metricValue(s, metric) }))
  .filter((p): p is { session: ExerciseSessionLift; value: number } => p.value != null);
```

Si `selected.sessions.length < 2` → empty global.  
Si `plotted.length < 2` → empty période.

- [ ] **Step 3: SVG** — remplacer `maxWeightKg` par `value` ; `hadPr` dot seulement si `metric === 'weight'`

- [ ] **Step 4: Chips UI**

```tsx
<div className={styles.chips} role="group" aria-label="Métrique">
  {([['weight','Charge'],['e1rm','e1RM'],['volume','Volume']] as const).map(...)}
</div>
<div className={styles.chips} role="group" aria-label="Période">
  {([4,8,12] as const).map((w) => ... `${w} sem.`)}
</div>
```

Résumé courant : dernière valeur + delta vs avant-dernier de `plotted`.

- [ ] **Step 5: CSS chips** (comme EffortChips : border, `chipActive` avec `--acier`)

- [ ] **Step 6: typecheck + commit**

```bash
git commit -m "feat(progress): metric and week-window controls on exercise trend chart"
```

---

### Task 4: Docs commit

- Add spec + plan to git
- Optional one-liner in progress dashboard design note — YAGNI ; skip unless useful

```bash
git add docs/superpowers/specs/2026-09-13-exercise-trends-design.md docs/superpowers/plans/2026-09-13-exercise-trends.md
git commit -m "docs: exercise trends design and plan (lot 4)"
```

---

## Spec coverage

| Requirement | Task |
|---|---|
| maxE1rm + helpers | 1–2 |
| Chips métrique/fenêtre | 3 |
| Messages vides | 3 |
| Pas de lib charts | — |
| RIR/prescription exclus | — |

## Placeholder scan

Aucun TBD.
