# Lot 1 — Fiabilité des données (tonnage, durées, statut d’exercice)

Date : 2026-09-13  
Statut : validé produit (brainstorm)  
Approche programme : **A — Cascade stricte** (lots 1→6)  
Lot : **1 / 6**

## Contexte

L’export `hery-export-2026-09-11.json` montre un suivi régulier (16 séances, ~152 t recalculées) mais des défauts de qualité :

- Écarts de 150–500 kg entre `totalTonnageKg` stocké et le tonnage recalculé depuis les séries (5 séances).
- Durées aberrantes (11 min, 122 min, 844 min).
- Exercices de séance sans séries, sans statut explicite.
- Aucun RIR saisi (hors scope lot 1 — lot 2).

Cause racine tonnage : `totalTonnageKg` n’est recalculé que dans `completeWorkout` ; `logSet`, `editSetLog` et `removeSet` ne rafraîchissent pas l’agrégat.

## Objectifs

1. Garantir que `Workout.totalTonnageKg` reflète toujours les séries actives.
2. Détecter et permettre de corriger les durées improbables.
3. Distinguer exercice planifié / commencé / terminé / ignoré.
4. Exclure explicitement des stats les séries non comptabilisables.
5. Migrer l’historique existant (tonnage + statuts dérivés).

## Hors scope

- Saisie RIR / RPE / types de série (lot 2)
- PR v2 et seuils d’historique (lot 3)
- Courbes de progression et dashboard enrichi (lot 4)
- Coach / recommandations (lot 5)
- Fatigue, douleur, deload, poids corporel, cardio détaillé (lot 6)
- Recalcul a posteriori de `e1rm` (interdit par RG-14)

## Principe produit

« Une donnée écrite n’est jamais recalculée a posteriori » s’applique aux **faits** (`SetLog.weightKg`, `reps`, `e1rm` au moment du log).

`totalTonnageKg` est un **agrégat dénormalisé** : il doit être rafraîchi à chaque mutation de série, sans réécrire les séries elles-mêmes.

## 1. Recalcul du tonnage

### Formule

```
totalTonnageKg = Σ (weightKg × reps × unilateralMultiplier)
```

Séries incluses seulement si :

- `deletedAt == null`
- `isWarmup == false`
- `weightKg != null`
- `reps != null` et `reps >= 1`

`unilateralMultiplier` = 2 si `Exercise.unilateral`, sinon 1.  
Si l’exercice catalogue est introuvable : multiplier = 1 (pas d’échec total).

### Couches

| Couche | Rôle |
|---|---|
| `app/src/domain/tonnage.ts` | `computeWorkoutTonnage(...)` pur + tests |
| `app/src/repositories/workouts.repo.ts` | `recomputeWorkoutTonnage(workoutId)` |
| UI | Lit toujours `Workout.totalTonnageKg` (pas de recalcul live) |

### Déclencheurs

Après chaque mutation :

- `logSet`
- `editSetLog`
- `removeSet`
- `completeWorkout` (réutilise la même fonction ; plus de formule dupliquée)

Flux :

```
mutation SetLog
  → écrire / soft-delete
  → recomputeWorkoutTonnage(workoutId)
  → touchWorkout (updatedAt)
```

Pas de champ « version de calcul » sur la séance : une seule source de vérité (les séries) + agrégat synchronisé.

### Migration

Idempotente, clé settings (ex. `tonnageMigratedV1`) :

1. Parcourir les workouts `completed` avec `deletedAt == null`.
2. Recalculer et écrire `totalTonnageKg`.
3. Marquer la migration faite.

Relançable au prochain démarrage si échec partiel.

## 2. Durées aberrantes

### Calcul affiché

```
durée = endedAt − startedAt   (si les deux sont présents)
```

Sinon : « durée inconnue » (ne pas dériver depuis `updatedAt`).

### Seuils

Helper domaine : `isImplausibleDuration(durationSec: number): boolean`

| Cas | Condition | Comportement |
|---|---|---|
| Trop courte | `< 15 min` | Badge « durée suspecte » + invitation à corriger |
| Trop longue | `> 3 h` | Idem |
| Séance ouverte | `in_progress` + inactivité > 6 h | RG-09 inchangé (auto-abandon) |
| À la clôture | `completeWorkout` si durée hors [15 min ; 3 h] | Confirmation : confirmer ou corriger les heures |

Aucune correction automatique silencieuse.

### Correction manuelle

Sur `WorkoutDetailScreen` :

- Éditer `startedAt` et `endedAt`.
- Refuser `endedAt < startedAt` avec message clair.
- Persister via `updatedAt` (pas de nouveau champ d’audit en lot 1).

Les moyennes de durée (lots ultérieurs) utiliseront `isImplausibleDuration` pour exclure les valeurs non corrigées.

## 3. Statut d’exercice de séance

### Schéma

Sur `WorkoutExercise` :

```ts
completionStatus: 'planned' | 'started' | 'completed' | 'skipped'
```

Migration Dexie : ajouter le champ + backfill.

| Statut | Signification | Déclencheur |
|---|---|---|
| `planned` | Présent, pas encore touché | Création séance / ajout exercice |
| `started` | Au moins une série loguée | Premier `logSet` |
| `completed` | Exercice terminé | Dernière série de travail, ou passage à l’exercice suivant après ≥ 1 série |
| `skipped` | Ignoré volontairement | Action explicite « Ignorer » |

Règles :

- `skipped` : aucune série active ; tonnage = 0.
- À la clôture, un `planned` sans séries **reste** `planned` (pas de conversion auto en `skipped`).
- Option à la clôture (défaut : non) : « Marquer les exercices non faits comme ignorés ».

### UI minimale

- Séance active : bouton **Ignorer** sur l’exercice courant.
- Journal : libellés `Ignoré` / `Non fait` / (rien si `completed`).
- Pas de refonte dashboard.

### Migration historique

- ≥ 1 série non-warmup active → `completed`
- 0 série → `planned` (jamais inventer `skipped`)

## 4. Séries incomplètes

Pas de nouveau statut sur `SetLog`. Une série non validée n’est pas écrite.

Exclue de tout agrégat (tonnage, volume, PR) si :

- `reps == null` ou `reps < 1`, ou
- `weightKg == null` pour un exercice chargé (hors isométrique/durée), ou
- `isWarmup == true`, ou
- `deletedAt != null`

Après édition a posteriori invalide : exclusion des stats + warning discret dans le détail.

## 5. Surface de code

| Zone | Changement |
|---|---|
| `domain/tonnage.ts` | Formules + `isImplausibleDuration` |
| `domain/workout-exercise-status.ts` | Transitions de statut |
| `db/schema.ts` + Dexie | `completionStatus` |
| `workouts.repo.ts` | Recalcul, skip, edit times, migrations |
| `ActiveSessionScreen` | Bouton Ignorer + transitions |
| `WorkoutDetailScreen` | Badge durée, édition heures, libellés statut |
| Tests Vitest | Domaine + repo |

## 6. Erreurs

- Recalcul : exercice manquant → multiplier 1.
- Horaires : `endedAt < startedAt` rejeté.
- Migration : idempotente, relançable.
- Séance active : aucun toast bloquant pour le recalcul (budget perçu inchangé, RG-07).

## 7. Critères d’acceptation

1. Éditer ou supprimer une série d’une séance terminée → `totalTonnageKg` égal au recalcul depuis les séries.
2. Migration : les séances à écart d’export passent à 0 écart.
3. Clôture hors [15 min ; 3 h] → confirmation ou correction.
4. « Ignorer » → `skipped`, 0 série, hors tonnage.
5. Historique sans séries → `planned`, pas `skipped`.
6. Warmup / soft-deleted / reps < 1 exclus du tonnage.
7. Tests unitaires verts (tonnage, durée, transitions de statut).

## 8. Programme global (rappel)

| Lot | Contenu |
|---|---|
| **1** | Fiabilité (cette spec) |
| 2 | Saisie effort (RIR, types de série, cardio optionnel, poids du jour) |
| 3 | PR v2 |
| 4 | Progression (courbes, fenêtres 4/8/12 sem.) |
| 5 | Coach (C-01…C-07) |
| 6 | Récupération / volume musculaire / deload |

## Références

- `docs/04-modele-de-donnees.md` — formules tonnage, I-05
- `docs/01-architecture-fonctionnelle.md` — RG-01, RG-09, RG-12, RG-14
- `app/src/repositories/workouts.repo.ts` — `completeWorkout`, `editSetLog`, `removeSet`
- `app/src/domain/session-machine.ts` — auto-abandon 6 h
