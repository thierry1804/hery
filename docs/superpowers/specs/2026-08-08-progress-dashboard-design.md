# Progression — snapshot factuel (Aujourd’hui + onglet)

Date : 2026-08-08  
Statut : validé produit (brainstorm)  
Approche : **A — Snapshot factuel**

## Contexte

Le jour de repos laisse un vide sur Aujourd’hui. Le produit promet une progression visible par les faits (charges, tonnage), sans gamification. L’écran Progression complet (heatmap, corps, coach) reste hors V0 ; on livre un premier dashboard utile, local et hors-ligne.

## Objectifs

1. Afficher un résumé de progression utile sur **Aujourd’hui** (repos et jour de séance).
2. Ajouter un onglet **Progression** déjà utile (pas un « Voir plus » vide).
3. Une seule couche d’agrégats partagée entre les deux vues.
4. Ton factuel ; aucun streak / XP / culpabilisation.

## Hors scope

- Heatmap corporelle
- Courbes e1RM / charts lib
- Metrics corporelles (poids, tour de taille) et photos
- Coach / suggestions de charge
- Alertes de déséquilibre push/pull
- Comparaison sociale

## Navigation

Quatre onglets BottomNav, dans cet ordre :

1. Aujourd’hui (`/`)
2. Historique (`/history`)
3. Progression (`/progress`)
4. Réglages (`/settings`)

La nav reste masquée sur `/session/*`.

## Écrans

### Aujourd’hui — bloc « Cette semaine »

Emplacement :

- **Repos** : entre le header et le footer « Séance hors programme »
- **Jour de séance** : sous la plaque des mouvements, au-dessus du CTA `DÉMARRER` / Reprendre

Contenu :

1. Ligne semaine : `{n} séances sur 3 · {tonnage} · {k} record(s)` (omettre la partie records si `k = 0`)
2. Jusqu’à **3 movers** : nom + charge précédente → charge récente ; badge `Record` (laiton) si PR sur l’exercice dans les 14 derniers jours
3. Lien texte : `Voir la progression →` → `/progress`

État vide (0 séance completed) :

> La progression apparaîtra après la première séance.

Pas de barres ni de faux chiffres.

### Onglet Progression (`/progress`)

Sections empilées, scroll autorisé :

1. Titre `Progression`
2. **WeekSummary** (mêmes chiffres que Aujourd’hui)
3. **Tonnage — 4 semaines** : barres horizontales (semaine ISO courante + 3 précédentes)
4. **Records récents** : jusqu’à ~10 PR (90 jours), plus récents d’abord
5. **Mouvements** : exercices déjà logués en charge — dernière charge × reps, delta vs séance précédente

Empty global : même message factuel que ci-dessus.

## Données

Fichier principal : `app/src/repositories/progress.repo.ts`  
Helpers domaine éventuels : `app/src/domain/progress.ts` (format tonnage, deltas, bornes de semaine ISO).

### `ProgressSnapshot`

| Champ | Règle |
|---|---|
| `week.sessionsDone` | Workouts `status === 'completed'`, `deletedAt == null`, `date >=` lundi ISO local |
| `week.sessionsTarget` | `3` (aligné Historique) |
| `week.tonnageKg` | Somme de `totalTonnageKg` sur ces séances |
| `week.prCount` | Nombre de `SetLog` avec `isPR`, non-warmup, non supprimés, liés à ces séances |
| `weekBars` | 4 entrées `{ weekStart, tonnageKg }` — semaine courante + 3 précédentes |
| `movers` | Max 3 ; voir sélection ci-dessous |
| `recentPrs` | Max 10 ; PR des 90 derniers jours |
| `lifts` | Tous exercices avec au moins une série poids non-warmup complétée |

### Movers

Candidats : exercices `loadType === 'weight'` (ou séries avec `weightKg` + `reps`) ayant **≥ 2** séances completed distinctes.

Par exercice :

- `prevMax` / `currMax` = charge max des séries non-warmup de l’avant-dernière / dernière séance completed
- `deltaKg` = `currMax - prevMax`
- `hasRecentPr` = PR sur l’exercice dans les 14 derniers jours

Tri : `hasRecentPr` d’abord, puis plus grand delta relatif `|delta|/prev`, puis plus gros tonnage de la dernière séance.

### Formats d’affichage

- Tonnage : `X,X t` si ≥ 1000 kg, sinon `N kg` (arrondi raisonnable, virgule FR)
- Charges : virgule FR, ex. `52,5 kg`
- Delta : `+2,5` / `−2,5` / `=` si inchangé (optionnel : n’afficher `=` que dans la liste lifts)

## Composants UI

| Composant | Rôle |
|---|---|
| `WeekSummary` | Ligne chiffrée partagée |
| `MoversList` | Liste des 3 movers |
| `WeekTonnageBars` | 4 barres horizontales CSS |
| `RecentPrsList` | Liste PR récents |
| `LiftsList` | Liste mouvements + delta |
| `ProgressScreen` | Assemble le tout |
| Intégration `TodayScreen` | Insère résumé + lien |

Style : plaques `--fonte-700`, radius 0 ; chiffres Archivo tabular ; meta `--fonte-300` ; `Record` en `--laiton` + libellé ; barres piste `--fonte-500` / fill `--magnesie` (largeur % du max des 4, min visible si > 0). Pas de cards KPI en grille, pas de glow.

## Routing

- `App.tsx` : `<Route path="/progress" element={<ProgressScreen />} />`
- `BottomNav.tsx` : 4e entrée Progression

## Tests

- Unitaires domaine/repo : bornes semaine ISO, agrégation tonnage, sélection movers, format tonnage, compte PR semaine
- Nav : présence de l’onglet et route `/progress`
- Smoke manuel : 0 séance / 1 séance / multi-séances avec PR

## Critères d’acceptation

1. Jour de repos : le vide est comblé par le résumé (ou empty factuel), sans casser le footer hors-programme.
2. Jour de séance : le résumé n’empêche pas d’atteindre `DÉMARRER` d’un coup d’œil / un tap.
3. Aujourd’hui et Progression affichent les **mêmes** chiffres semaine pour un même jeu de données.
4. Aucune dépendance chart ajoutée.
5. Aucune mécanique de streak / XP.
6. Hors-ligne : lecture IndexedDB uniquement.

## Suite éventuelle (non inclus)

Heatmap, corps, coach, courbes e1RM — selon backlog V1 existant (`docs/01-architecture-fonctionnelle.md` D5/D6).
