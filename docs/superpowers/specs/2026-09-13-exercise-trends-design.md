# Lot 4 — Progression par exercice (métriques + fenêtres)

Date : 2026-09-13  
Statut : validé produit (brainstorm)  
Approche programme : **A — Cascade stricte** (lots 1→6)  
Lot : **4 / 6**  
Approche technique : **A — Enrichir ExerciseTrendChart existant**

## Contexte

L’onglet Progression affiche déjà une courbe SVG de **charge max** par exercice. Le lot 4 l’enrichit avec d’autres métriques et des fenêtres temporelles, sans lib de charts ni refonte du dashboard.

Lots 1–3 : tonnage fiable, RIR/`setKind`, PR v2.

## Décisions produit

| Sujet | Choix |
|---|---|
| Périmètre | **A** — métriques charge / e1RM / volume + fenêtres 4/8/12 sem. |
| Agrégation séance | **A** — charge = max · e1RM = max · volume = somme work |
| RIR / prescription vs réalisé | Hors lot (reportés) |

## Objectifs

1. Permettre de lire la progression d’un exercice en charge, e1RM ou volume.
2. Restreindre la courbe à 4, 8 ou 12 semaines (défaut 8).
3. Conserver le SVG existant et le ton factuel du produit.

## Hors scope

- RIR moyen
- Comparaison prescription vs réalisé
- Nouvelle page détail exercice
- Librairie de charts
- Refonte WeekSummary / tonnage bars / fatigue / équilibre
- Coach (lot 5)

## 1. Données

### `ExerciseSessionLift` (étendu)

| Champ | Règle |
|---|---|
| `maxWeightKg` | Max `weightKg` des séries work (existant) |
| `repsAtMax` | Reps de la série à charge max (existant) |
| `tonnageKg` | Somme `weight×reps×unilatéral` work (existant — vérifier alignement lot 1) |
| `maxE1rm` | **Nouveau** : max des `e1rm` non null des séries work ; `null` si aucun |
| `hadPr` / dates | Inchangés |

Pas de migration Dexie : agrégats dérivés à la lecture dans `progress.repo`.

### Helpers domaine

```ts
type TrendMetric = 'weight' | 'e1rm' | 'volume';
type TrendWeeks = 4 | 8 | 12;

filterSessionsByWeeks(sessions, weeks, now): ExerciseSessionLift[]
metricValue(session, metric): number | null  // null si e1rm absent
```

Fenêtre : `workoutDate >=` date locale du jour moins `weeks * 7` jours.

## 2. UX — `ExerciseTrendChart`

Contrôles au-dessus du SVG :

1. Select exercice (existant)
2. Chips métrique : `Charge` · `e1RM` · `Volume` (défaut **Charge**)
3. Chips fenêtre : `4 sem.` · `8 sem.` · `12 sem.` (défaut **8**)

Affichage :

- Courbe sur les points filtrés dont `metricValue != null`
- Résumé : valeur courante + delta vs point précédent **dans la fenêtre**
- Format : charge/e1RM → `formatWeightKg` / `formatDeltaKg` ; volume → `formatTonnageKg` (+ delta adapté)
- Points PR agrandis **uniquement** en métrique Charge

États vides :

| Cas | Message |
|---|---|
| &lt; 2 séances au total | `Pas assez de données pour une courbe.` |
| &lt; 2 points dans la fenêtre (après filtre métrique) | `Pas assez de données sur cette période.` |

## 3. Critères d’acceptation

1. Défaut Charge + 8 sem. fonctionne avec l’historique existant.
2. Volume = tonnage séance (somme work).
3. e1RM omet les séances sans e1rm.
4. Fenêtre 4 sem. avec un seul point → message période.
5. Delta calculé dans la fenêtre.
6. Tests domaine (filtre + metricValue) verts.
7. Aucune nouvelle dépendance ; typecheck OK.

## 4. Programme global (rappel)

| Lot | Contenu |
|---|---|
| 1–3 | Fiabilité, effort, PR v2 — faits |
| **4** | Progression métriques/fenêtres (cette spec) |
| 5 | Coach |
| 6 | Récupération / cardio / poids |

## Références

- `app/src/features/progress/ExerciseTrendChart.tsx`
- `app/src/domain/progress.ts` — `ExerciseSessionLift`
- `app/src/repositories/progress.repo.ts`
- Specs lots 1–3
