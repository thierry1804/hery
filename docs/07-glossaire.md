# 07 — Glossaire

**Projet** : HERY — 8 août 2026

Règle du projet : **anglais dans le code, français dans l'interface et la documentation.** Ce glossaire est la table de correspondance officielle. Un terme absent d'ici ne doit pas apparaître dans le code.

---

## 1. Vocabulaire métier

| Français (interface) | Anglais (code) | Définition |
|---|---|---|
| Série | `set` | Une exécution continue de N répétitions d'un exercice |
| Répétition | `rep` | Un mouvement complet |
| Charge | `weightKg` | Poids soulevé, toujours en kilogrammes |
| Tonnage | `tonnage` | Charge × répétitions, cumulé. Unité de volume brut |
| Volume | `volume` | Nombre de séries effectives pondérées par la sollicitation musculaire |
| Séance | `workout` | Une session d'entraînement réalisée |
| Séance type | `sessionTemplate` | Le modèle prescrit (A, B ou C) |
| Programme / cycle | `programCycle` | Ensemble de séances types sur une période (ici 12 semaines) |
| Exercice | `exercise` | Un mouvement du catalogue |
| Échauffement | `warmup` | Bloc préparatoire, ~10 min, non compté dans le volume |
| Étirements | `stretch` | Bloc de fin de séance, ~5 min |
| Gainage | `core` (`loadType: time`) | Exercice isométrique mesuré en secondes |
| Repos | `rest` | Temps entre deux séries, 60 à 90 s |
| Récupération / décharge | `deload` | Semaine allégée (−40 % de volume) destinée à récupérer |
| Palier / plateau | `plateau` | Absence de progression sur 3 séances |
| Record personnel | `personalRecord`, `PR` | Meilleure performance historique sur un exercice |
| Progression double | `doubleProgression` | Augmenter les répétitions jusqu'à la cible, puis la charge |
| Répétitions en réserve | `RIR` | Nombre de répétitions qu'on aurait encore pu faire |
| Effort perçu | `RPE` | Échelle d'intensité de 1 à 10. Ici simplifiée à 3 niveaux |
| Unilatéral | `unilateral` | Exercice exécuté un côté à la fois (fentes, gainage latéral) |
| Substitution | `substitution` | Remplacement d'un exercice prescrit par un équivalent |
| Réglages machine | `machineSettings` | Position du siège, des cales, des poignées |
| Recomposition corporelle | `recomposition` | Gain de muscle et perte de gras simultanés |
| Prise de masse | — | Objectif de gain de masse musculaire |
| Full Body | — | Séance sollicitant l'ensemble du corps |
| Antagonistes | `antagonists` | Groupes musculaires opposés (quadriceps/ischios, pectoraux/dorsaux) |

## 2. Grandeurs calculées

| Terme | Code | Formule |
|---|---|---|
| 1RM estimé | `e1rm` | Epley : `charge × (1 + reps / 30)`, non calculé au-delà de 12 reps |
| Coefficient de sollicitation | `muscleCoefficient` | 1,0 muscle primaire · 0,5 muscle secondaire |
| Série effective | `workingSet` | Série non-échauffement, comptée dans le volume |
| Ratio d'équilibre | `balanceRatio` | Volume d'un groupe / volume de son antagoniste, sur 4 semaines |
| Niveau de force | `strengthLevel` | Charge rapportée au poids de corps, sur un barème par mouvement |

## 3. Groupes musculaires (`MuscleGroup`)

`quadriceps` · `ischios` · `fessiers` · `mollets` · `pectoraux` · `dorsaux` · `trapezes` · `deltoides_ant` · `deltoides_lat` · `deltoides_post` · `biceps` · `triceps` · `avant_bras` · `abdominaux` · `obliques` · `lombaires`

## 4. Vocabulaire produit

| Terme | Sens dans ce projet |
|---|---|
| **Séance active** | L'écran plein écran utilisé pendant l'entraînement. Le cœur du produit |
| **Carnet de frictions** | Registre des irritants constatés en salle. Prime sur toute idée de fonctionnalité |
| **Prescription** | Ce qui est prévu par le programme |
| **Réalisation** | Ce qui a effectivement été fait. Toujours distinct de la prescription |
| **Snapshot de prescription** | Copie figée du programme au jour de la séance |
| **Écriture optimiste** | L'interface se met à jour avant confirmation de la persistance |
| **Local-first** | Les données vivent sur l'appareil ; le réseau n'est jamais requis |
| **Marque de magnésie** | L'animation de validation d'une série. Élément signature de l'interface |
| **Coach** | Moteur de règles déterministe. Jamais un modèle de langage en V0/V1 |

## 5. Codes de référence

| Préfixe | Signification | Défini dans |
|---|---|---|
| `RG-xx` | Règle de gestion | `01-architecture-fonctionnelle.md` |
| `C-xx` | Règle du coach | `01-architecture-fonctionnelle.md` §D7 |
| `F-Sxx`, `F-Pxx` | Fonctionnalité | `01-architecture-fonctionnelle.md` |
| `UX-xx` | Règle d'interaction | `05-design-system-ux.md` |
| `US-xx` | User story | `06-backlog-roadmap.md` |
| `I-xx` | Invariant de données | `04-modele-de-donnees.md` |
| `O-x` | Objectif produit | `00-document-produit.md` |
| `ADR-xxx` | Décision d'architecture | `adr/` |
