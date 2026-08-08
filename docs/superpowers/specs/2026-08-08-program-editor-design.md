# Éditeur de programme — design

Date : 2026-08-08  
Statut : validé produit (brainstorm)  
Approche : **A — Éditeur hiérarchique dans Réglages**

## Contexte

Le programme Full Body A/B/C est préchargé via seed JSON et n’est pas modifiable dans l’UI. L’utilisateur doit pouvoir paramétrer séances, exercices, séries, répétitions, durées et pauses. Les séances actives et l’historique doivent rester stables grâce au `templateSnapshot`.

## Objectifs

1. Éditer le cycle actif et les séances A/B/C (label, jour, durée cible).
2. Éditer la structure des items (ajouter, réordonner, supprimer, remplacer l’exercice).
3. Éditer les prescriptions numériques (séries, reps / plage, `restSec`, `durationSec`, notes).
4. Persistance locale IndexedDB immédiate ; effet sur les **prochaines** séances seulement.
5. Pouvoir restaurer le programme d’origine (seed) avec confirmation.

## Hors scope

- Générateur de programme from scratch
- Créer / supprimer des séances template au-delà de A/B/C (édition des 3 existantes seulement)
- Édition des phases coach / règles de phase
- Sync cloud, multi-utilisateur
- Modification rétroactive de l’historique ou de la séance en cours

## Navigation

- Pas de 5e onglet.
- **Réglages** → section **Programme** → lien `Modifier le programme →`
- Routes :
  - `/settings/program` — hub cycle + liste des séances
  - `/settings/program/:templateId` — édition séance + items
  - `/settings/program/:templateId/items/new` — nouvel item
  - `/settings/program/:templateId/items/:itemId` — édition item

Bottom nav inchangée (4 onglets ; icônes seules sous 360px).

## Écrans

### Programme (hub)

- Affiche le cycle actif : nom, nombre de semaines (édition simple du nom autorisée).
- Liste des `SessionTemplate` non supprimés (A/B/C) : code, label, jour, durée cible.
- Tap → écran Séance.
- Action dangereuse en bas : **Restaurer le programme d’origine** (confirmation sheet).

### Séance

- Champs : `label`, `dayOfWeek` (lundi…dimanche), `targetDurationMin`.
- Contrainte : `dayOfWeek` unique parmi les templates non supprimés.
- Liste ordonnée des `PrescribedItem` : nom (ou label), prescription courte (`3×12 · 90 s`), kind.
- Actions item : ouvrir · ↑ · ↓ · (suppression dans l’écran détail).
- CTA : **Ajouter un mouvement** / consigne.

### Item

Formulaire selon `kind` :

| Kind | Champs |
|---|---|
| `strength` / `core` | exercice (picker), `sets`, `repsTarget` **ou** `repsRangeMin`/`repsRangeMax`, `restSec`, `notes`, `perSide` si pertinent |
| `cardio` | exercice/modalité (picker), `durationSec`, `restSec` optionnel, `notes` |
| `warmup` / `stretch` | `label`, `durationSec` optionnel, `notes` ; `exerciseId` nullable |

- Remplacer l’exercice → `ExercisePickerSheet` (catalogue `getAllExercises`, filtre texte).
- Supprimer → confirmation → soft-delete (`deletedAt`).
- Enregistrement : à la validation du formulaire (bouton **Enregistrer**) et/ou autosave discret sur blur des steppers — **décision d’implémentation : bouton Enregistrer** pour éviter les écritures partielles invalides.

## Données

Étendre `app/src/repositories/program.repo.ts` :

- `updateCycle(id, patch)`
- `updateSessionTemplate(id, patch)` — valide unicité `dayOfWeek`
- `createPrescribedItem(sessionTemplateId, input)`
- `updatePrescribedItem(id, patch)`
- `softDeletePrescribedItem(id)`
- `reorderPrescribedItems(sessionTemplateId, orderedIds)` — réécrit `order` (10, 20, 30…)
- `restoreProgramFromSeed()` — réapplique le seed du cycle actif (stratégie : soft-delete des prescribedItems + templates du cycle puis re-seed, **ou** replace in-place des IDs stables du seed ; préférer **IDs stables du seed** pour A/B/C afin de ne pas casser les références `sessionTemplateId` des workouts passés)

Validation (domaine `program-validation.ts`) :

- `restSec >= 0`
- force/core : `sets >= 1` ; soit `repsTarget != null`, soit plage min/max avec `min <= max`
- cardio / durée : `durationSec > 0` si le kind l’exige
- `dayOfWeek` ∈ 1..7

## Composants UI

| Composant | Rôle |
|---|---|
| `ProgramHubScreen` | Cycle + séances + restore |
| `SessionEditScreen` | Méta séance + liste items |
| `ItemEditScreen` | Formulaire item |
| `ExercisePickerSheet` | Sheet bas + recherche |
| Lien dans `SettingsScreen` | Entrée Programme |

Style : plaques `--fonte-700`, radius 0, steppers existants, `BigButton`, ton factuel.

## Effet runtime

- `startWorkout` continue de copier `templateSnapshot` au démarrage.
- Aujourd’hui lit les templates/items live → reflète les edits immédiatement.
- Séance `in_progress` et workouts `completed` : inchangés.

## Tests

- Unitaires validation + unicité jour + reorder + soft-delete
- Restore seed : après restore, templates A/B/C correspondent au seed
- Smoke manuel : edit repos → Aujourd’hui / nouvelle séance OK ; séance en cours non modifiée

## Critères d’acceptation

1. Depuis Réglages, édition label / jour / durée d’une séance A/B/C.
2. Édition séries, reps, repos, durée d’un item ; visible sur Aujourd’hui.
3. Ajout / réordonnancement / suppression d’item.
4. Remplacement d’exercice via catalogue.
5. Historique et séance en cours non réécrits.
6. Restauration seed avec confirmation.
7. Hors-ligne uniquement.

## Suite éventuelle

Création de séances D+, édition des phases, import programme JSON dédié.
