# ADR-004 — Position de lecture pendant la séance stockée hors du schéma `Workout`

- **Statut** : accepté
- **Date** : 2026-08-08

## Contexte

US-14 (reprise de séance interrompue) exige qu'une séance tuée en pleine série reprenne
exactement à l'exercice et à la série en cours. Cela suppose de persister un état de
navigation : index de l'étape courante, numéro de série actif, items d'échauffement/
étirements cochés, et — depuis le test en salle du jalon J1 — un indicateur `pendingAdvance`
(le repos qui suit la dernière série d'un exercice doit s'écouler avant de basculer sur
l'exercice suivant ; l'app doit savoir, à la reprise, si ce repos était en cours).

Le modèle de données (`04-modele-de-donnees.md`) ne prévoit pas ces champs sur `Workout` :
l'entité y est décrite comme le résultat figé d'une séance (`templateSnapshot`, statut,
tonnage), pas comme un curseur de lecture.

## Options envisagées

| Option | Avantages | Inconvénients |
|---|---|---|
| Ajouter les champs de position sur `Workout` (migration de schéma) | Modèle explicite, un seul objet source de vérité | Pollue une entité de résultat avec de l'état UI éphémère ; migration Dexie pour un besoin qui ne concerne que la séance `in_progress` |
| Dériver la position depuis `setLogs`/`workoutExercises` déjà écrits | Aucun état supplémentaire | Ne couvre pas l'échauffement/étirements (items sans `WorkoutExercise`) ni le repos en cours ; logique de reconstruction non triviale |
| Table clé/valeur `settings`, clé `session-progress:<workoutId>` | Aucune migration, écriture/lecture triviale, purgée à la clôture (`clearProgress`) | État de navigation en dehors du modèle documenté ; à ne pas généraliser à d'autres écrans |

## Décision

La position de lecture pendant une séance active (`itemIndex`, `setIndex`, `checkedOrders`,
`restEndsAt`, `pendingAdvance`) est persistée dans la table `settings` sous la clé
`session-progress:<workoutId>` (`src/repositories/session-progress.repo.ts`), pas dans
`Workout`. Elle est supprimée à la clôture de la séance (`clearProgress`).

## Justification

C'est un état de navigation UI, pas une donnée métier durable : il n'a de sens que pendant
la fenêtre où `Workout.status === 'in_progress'`, n'est jamais consulté par le journal, la
progression ou l'export, et disparaît à la fin de la séance. L'écrire dans `Workout`
obligerait à distinguer en permanence les champs « résultat » des champs « curseur » sur la
même entité. Le coût d'une table clé/valeur déjà présente est nul, contre une migration
Dexie pour un besoin strictement transitoire.

## Conséquences

**Positives** — pas de migration de schéma pour US-14 ; suppression automatique à la
clôture, pas de donnée orpheline ; le modèle `Workout` reste fidèle à sa description dans
`04-modele-de-donnees.md`.

**Négatives** — deux endroits à connaître pour comprendre l'état d'une séance en cours
(`Workout` + `settings`) ; si une v1 introduit la synchronisation multi-appareils, cet état
devra être reconsidéré (RG de synchronisation dans `02-architecture-technique.md` §7 ne le
couvre pas).

**À réévaluer si** — un second écran a besoin d'un état de navigation comparable (signe
qu'il faut généraliser le patron plutôt que le dupliquer), ou si la synchronisation
multi-appareils est engagée.
