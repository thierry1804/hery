# Coach v2 — progression RIR-centric (mémoire, brief, mid-set)

Date : 2026-09-20  
Statut : validé produit (brainstorm)  
Approche : **big bang coach v2** (vision complète, implémentation en tâches planifiées ensuite)  
Références : ADR-003, D7 (`docs/01-architecture-fonctionnelle.md`), analyse séances 14–18/09/2026

## Contexte

Le coach V1 (`evaluateCoach`, C-01…C-07) propose surtout des hausses quand les cibles de reps sont atteintes deux fois. Le RIR est saisi et alimente principalement le deload global C-04 : il **ne bloque pas** une augmentation après une série à RIR 0.

L’analyse de la semaine A/B/C (14–18 septembre 2026) montre que le problème n’est pas le manque d’intensité, mais la **régularité du dosage**. Exemples :

- Smith squat 65 × 12 @ RIR 0 → ne pas pousser à 70 kg
- Leg curl 60 × 15 @ RIR 3 → hausse pertinente
- Leg press 190 × 13 @ RIR 1 → consolider en reps avant hausse
- Face pull 50 → 25 kg → comparaison non fiable
- Douleur 5/10 puis 2/10 → signal de récupération à surveiller, sans diagnostic médical

## Objectifs

1. Centrer la progression sur **charge + reps + RIR + historique + fatigue/douleur**.
2. Rendre **HOLD / CONSOLIDATE** un résultat normal et visible.
3. Ne **jamais** proposer automatiquement `INCREASE` après des séries work à RIR 0.
4. Persister une **mémoire de progression** par exercice (état, confiance, raisons).
5. Afficher des suggestions **avant / pendant / après** la séance, toujours explicables (RG-21).
6. Modéliser la **sémantique de charge** (assistance vs poids externe) et la **comparabilité**.

## Hors scope

- Indicateur de qualité d’exécution (1–5 / good|degraded) par série
- Cardio enrichi (FC moyenne / max, inclinaison, vitesse) au-delà de la durée déjà saisie
- Reformulation LLM (ADR-003 : règles seules pour la décision)
- Diagnostic médical ou libellés pathologiques
- Remplacement du tonnage comme KPI secondaire sur le dashboard (hors coach)

## Décisions produit

| Sujet | Choix |
|---|---|
| Style moteur | Règles déterministes pures (ADR-003) |
| Actions | `increase` \| `hold` \| `decrease` \| `repeat` \| `watch` \| `deload` \| `vary` \| `inform` |
| RIR 0 | Jamais `increase` sur la base de cette séance |
| Hausse | 2 séances consécutives « bonnes » (reps ≥ max **et** RIR dans cible, aucune série work à RIR 0) |
| 1 bonne séance | `repeat` (confirmer), pas encore `increase` |
| Douleur ≥ 5 | Biais `hold` / `watch`, message de surveillance, pas de diagnostic |
| Comparabilité | Écart > 30 % vs médiane des 3 dernières charges (hors deload) → `watch`, confiance `low` |
| Mid-set | Hint non bloquant après validation d’une série `work` |
| Acceptation cible | Bouton « Utiliser… » pour `increase` / `decrease` / `hold` (même charge ancrée) |

## Architecture

Quatre unités isolées, sans effet de bord dans le domaine :

| Unité | Responsabilité |
|---|---|
| `load-model` | Normaliser la charge selon `loadSemantics` ; juger `comparable` |
| `exercise-memory` | Calculer / persister l’état par exercice |
| `decide` | Priorité des règles → `CoachSuggestion` v2 |
| `surfaces` | Today (brief), séance active (mid-set), Progression (post) |

Fichiers cibles (indicatif) :

- `app/src/domain/coach.ts` — étendre types + `evaluateCoach` (ou scinder `coach-decide.ts` / `coach-memory.ts`)
- `app/src/domain/load-semantics.ts` — helpers assistance / comparabilité
- `app/src/db/schema.ts` — champs Exercise + table memory
- `app/src/repositories/progress.repo.ts` / nouveau `exercise-memory.repo.ts`
- UI : `TodayScreen` / carte coach, `ActiveSessionScreen`, `CoachSuggestions`

```
Séance completed
  → agrégation séries work (RIR, reps, charge)
  → load-model (comparable ?)
  → decide → memory persistée
  → surfaces lisent memory
```

Mid-set : **pas** de réécriture IndexedDB à chaque série ; calcul léger en mémoire à partir de la memory existante + série venant d’être loguée.

## Modèle de données

### Enrichissement `Exercise`

| Champ | Type | Rôle |
|---|---|---|
| `loadSemantics` | `'external_weight' \| 'bodyweight' \| 'assistance' \| 'machine_resistance'` | Interprétation de la charge (dips assistés = `assistance`) |
| `minReps` / `maxReps` | `number \| null` | Plage cible ; défaut = prescription séance |
| `targetRirMin` / `targetRirMax` | `number \| null` | Défaut **1** / **2** pour le travail |

`loadType` actuel (`weight` \| `time` \| …) reste pour le mode de saisie UI.

### Entité `ExerciseProgressionMemory`

Une entrée par `exerciseId` :

```ts
{
  exerciseId: string
  status: 'increase' | 'hold' | 'decrease' | 'repeat' | 'watch'
  currentLoadKg: number | null
  suggestedLoadKg: number | null
  targetReps: [number, number]
  targetRir: [number, number]
  confidence: 'high' | 'medium' | 'low'
  consecutiveSuccesses: number
  consecutiveFailures: number
  lastReason: string
  lastEvaluatedAt: string // ISO
  comparableHistory: boolean
}
```

Recalcul : après `completeWorkout`, et à l’ouverture de Progression / Today si memory absente ou périmée.

### Migration

- Seed catalogue : `loadSemantics` + plages reps/RIR pour exercices connus (ex. assisted dips → `assistance`)
- Memory vide au départ → premier snapshot la remplit
- Pas de recalcul destructif des `SetLog`

## Moteur de décision

Évaluation **par exercice**, séries `work` uniquement. Première règle qui matche gagne.

### Priorité

1. **WATCH** — historique non comparable **ou** douleur ≥ 5 sur la dernière séance concernée → pas de delta kg automatique ; message de surveillance.
2. **DECREASE** — RIR 0 sur ≥ 2 séries work de la dernière séance **ou** reps < `minReps` avec RIR ≤ 1 → `suggestedLoad = current ± 1 incrément` (assistance : sens inversé).
3. **HOLD** — charge à consolider : une série à RIR 0 ; **ou** reps dans la plage avec RIR dans la cible ; **ou** reps ≥ max mais RIR < `targetRirMin` → même charge, viser plus de contrôle / reps dans la plage à RIR 1–2.
4. **REPEAT** — exactement une séance « bonne » récente (reps ≥ `maxReps` **et** RIR ∈ cible **et** aucune série work à RIR 0) → confirmer avant hausse ; `consecutiveSuccesses = 1`.
5. **INCREASE** — deux séances consécutives « bonnes » ; phase ≠ `readaptation` ; garde-fou C-07 (+10 % / 4 semaines) → +1 incrément (assistance : −1 niveau d’assistance).
6. Sinon **HOLD** / **VARY** (plateau e1RM, héritage C-03) / **INFORM** (volume C-06).

### Règles globales conservées

- **C-04 deload** : fatigue ≥ 4 sur ≥ 2 des ~3 dernières séances **ou** douleur ≥ 5 **ou** majorité d’exercices à RIR ≤ 1 → suggestion globale `deload` ; n’empêche pas d’afficher des HOLD par exercice.
- **C-05** phase, **C-07** garde-fou : inchangés dans l’esprit.

### Séance « bonne »

```text
toutes les séries work :
  reps >= maxReps
  ET rir ∈ [targetRirMin, targetRirMax]
  ET aucune série avec rir === 0
```

RIR manquant sur une série work → la séance n’est pas « bonne » (confiance ↓, plutôt HOLD).

### Confiance

| Niveau | Condition |
|---|---|
| `high` | Historique comparable, ≥ 2 séances, RIR renseigné sur les séries work |
| `medium` | 1 séance utile ou RIR partiel |
| `low` | Non comparable ou données insuffisantes |

### Formulation (RG-21)

Chaque suggestion expose `lastReason` / `explanation` en français, ex. :

> « 12 reps atteintes mais à RIR 0 → maintiens 65 kg, vise 10–12 à RIR 1–2. »

## Surfaces UI

### Avant séance (Aujourd’hui / démarrage)

Bloc **Objectifs du jour** (4–6 lignes) : exercices de la séance du jour + status + charge + cible reps/RIR.  
Ligne globale si douleur récente ≥ 5.

### Pendant séance (après VALIDER une série work)

Hint non bloquant (pas de modal), remplacé à la série suivante :

- RIR 0 → ne pas monter ; viser la plage sans échec
- RIR élevé + reps hautes → série facile ; confirmer ou hausser légèrement en fin d’exercice

Le stepper de poids **n’est pas** modifié automatiquement.

### Après séance (Progression)

Tableau / cartes : dernière perf · RIR · action · **raison visible**.  
Bouton « Utiliser à la prochaine séance » si `suggestedLoadKg != null` et action ∈ {`increase`,`decrease`,`hold`}.

## Cas de test domaine (issus de la semaine)

| Cas | Attendu |
|---|---|
| Smith 65 × 12 @ RIR 0 | `hold` ou `decrease`, jamais `increase` |
| Leg curl 60 × 15 @ RIR 3 | `increase` ou `repeat` si première bonne séance |
| Leg press 190 × 13 @ RIR 1 | `hold` (viser plus de reps) |
| Face pull 50 → 25 | `watch`, `comparableHistory = false`, confiance `low` |
| Douleur 5 puis 2 | biais `watch`/`hold` puis relâchement |
| C-07 | hausse toujours bornée à +10 % / 4 semaines |

## Risques et garde-fous

- **Faux HOLD** si RIR mal saisi → confiance `medium` + raison visible ; utilisateur peut ignorer la cible.
- **Assistance mal seedée** → défaut `external_weight` ; seed explicite pour dips assistés.
- **Mid-set bruyant** → une seule ligne, dismissible implicitement à la série suivante.
- **Big bang** → le plan d’implémentation découpera en tâches (domaine → memory → UI post → brief → mid-set → seed).

## Critères d’acceptation

1. Aucun chemin C-01 legacy ne propose `increase` après une dernière séance contenant une série work à RIR 0.
2. HOLD apparaît explicitement dans l’UI Progression avec une raison.
3. Memory recalculée après `completeWorkout` et lue par Today + Progression.
4. Brief pré-séance affiche au moins les exercices de la séance du jour ayant une memory.
5. Mid-set affiche un hint après une série work à RIR 0.
6. Tests Vitest verts pour les 6 cas du tableau ci-dessus.
7. Docs D7 / ADR-003 mis à jour (actions, RIR-centric) sans abandonner le moteur déterministe.
