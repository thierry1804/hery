# Lot 2 — Saisie effort (RIR par série + setKind)

Date : 2026-09-13  
Statut : validé produit (brainstorm)  
Approche programme : **A — Cascade stricte** (lots 1→6)  
Lot : **2 / 6**  
Approche UX : **A — Chips inline au-dessus de VALIDER**

## Contexte

Le lot 1 a fiabilisé tonnage, durées et statut d’exercice. L’export montrait **0 RIR** sur 362 séries : impossible d’analyser la proximité de l’échec.

Le schéma avait déjà `SetLog.rir` et `isWarmup`, mais la saisie n’était pas branchée (`rir` toujours `null`, `isWarmup` forcé à `false` à la validation).

RG-11 prévoyait un RPE unique en fin d’exercice. Pour la progression **charge × reps × RIR**, le produit adopte le **RIR par série**.

## Objectifs

1. Permettre un RIR optionnel sur chaque série de travail, sans ajouter de tap si préremplissage OK.
2. Distinguer explicitement échauffement / approche / travail.
3. Exclure échauffement et approche des agrégats (tonnage, volume, PR).
4. Aligner docs (RG-11) et modèle de données.

## Décisions produit

| Sujet | Choix |
|---|---|
| Modèle d’effort | **A** — RIR par série (pas RPE obligatoire en fin d’exercice) |
| Obligation RIR | **B** — Optionnel, dernière valeur préremplie |
| Types de série | **B** — `setKind` à 3 états |
| Cardio / poids du jour | **B** — Reportés au lot 6 |
| UX | **A** — Chips inline au-dessus de `VALIDER` |

## Hors scope

- Cardio FC / distance / inclinaison
- Poids du jour / `BodyMetric`
- PR v2, courbes, coach (lots 3–5)
- Tempo, repos réel mesuré
- Suppression du champ `sessionRpe` (reste nullable, non saisi dans ce lot)

## 1. Modèle de données

### `SetLog`

| Champ | Type | Règle |
|---|---|---|
| `setKind` | `'warmup' \| 'approach' \| 'work'` | Nouveau ; défaut à l’écriture : `work` |
| `rir` | `number \| null` | Pour `work` : `0 \| 1 \| 2 \| 3` ou `null`. UI `3+` → `3`. Sinon toujours `null` |
| `isWarmup` | `boolean` | **Dérivé** : `setKind === 'warmup' \|\| setKind === 'approach'` |

Invariant d’écriture :

```
isWarmup = setKind !== 'work'
rir = setKind === 'work' ? rir : null
```

Les agrégats existants qui filtrent `isWarmup` excluent automatiquement les approches. À terme, préférer `setKind === 'work'` dans le nouveau code domaine.

### Migration Dexie v3

Pour chaque `SetLog` :

- `isWarmup === true` → `setKind = 'warmup'`
- sinon → `setKind = 'work'`
- `rir` inchangé

Idempotente (upgrade Dexie + éventuellement setting `effortCaptureMigratedV1`).

## 2. UX séance active

### Placement

Sous steppers charge/reps, au-dessus de `VALIDER` :

1. **Kind** — segment `Échauff.` · `Approche` · `Travail`
2. **RIR** — `0` · `1` · `2` · `3+` (visible seulement si `Travail`)

### Comportement

| Règle | Détail |
|---|---|
| Défaut kind à l’entrée d’exercice | `Travail` |
| Après validation | Conserver le kind courant (enchaîner approches sans retap) |
| Préremplissage RIR | Dernier `rir` non nul d’une série `work` du même exercice (séance courante puis historique) |
| Pas d’historique | Aucune sélection forcée (`null`) |
| Retap sur RIR sélectionné | Désélection → `null` |
| VALIDER | Écrit `setKind`, `isWarmup` dérivé, `rir` ; tonnage (lot 1) ; PR seulement si `work` |

Aucun écran intermédiaire. Si préremplissage OK : **0 tap supplémentaire**.

### Liste des séries

Suffixe discret : `É` / `A` pour warmup/approach ; `RIR n` si présent.

## 3. Édition a posteriori

Sur `WorkoutDetailScreen` : corriger charge, reps, **kind** et **RIR**.  
Après édition : `isWarmup` / `rir` resynchronisés + `recomputeWorkoutTonnage`.

## 4. Domaine et docs

- Helper `domain/set-kind.ts` : labels FR, `isWarmupFromKind`, `normalizeRir`, éventuellement `countsAsWorkingSet`.
- Mettre à jour `docs/01-architecture-fonctionnelle.md` **RG-11** : RIR par série de travail, optionnel, prérempli ; RPE fin d’exercice non requis en V1 effort.
- Mettre à jour `docs/04-modele-de-donnees.md` : `setKind`, sémantique `rir`.

## 5. Critères d’acceptation

1. Série travail + RIR prérempli → validation en un tap `VALIDER`.
2. `Approche` → `isWarmup === true`, hors tonnage et PR.
3. Kind ≠ `work` → `rir === null` en base.
4. Chip `3+` → `rir === 3`.
5. Retap RIR sélectionné → `null`.
6. Migration : warmups historiques → `warmup`, reste → `work`.
7. Édition historique kind/RIR → tonnage cohérent.
8. Tests domaine + repo verts.

## 6. Programme global (rappel)

| Lot | Contenu |
|---|---|
| 1 | Fiabilité — **fait** |
| **2** | Saisie effort (cette spec) |
| 3 | PR v2 |
| 4 | Progression (consomme RIR) |
| 5 | Coach |
| 6 | Récupération, cardio détaillé, poids |

## Références

- Spec lot 1 : `docs/superpowers/specs/2026-09-13-data-reliability-design.md`
- `app/src/db/schema.ts` — `SetLog`
- `app/src/repositories/workouts.repo.ts` — `logSet`
- `app/src/features/session/ActiveSessionScreen.tsx`
- `docs/01-architecture-fonctionnelle.md` — RG-11 (à réviser)
