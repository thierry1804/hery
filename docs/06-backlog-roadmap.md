# 06 — Backlog & roadmap

**Projet** : HERY
**Version** : 1.0 — 8 août 2026

Unité d'estimation : la **soirée** (≈ 2 h effectives). Un side project ne s'estime pas en points.

---

## 1. Epics

| Epic | Intitulé | Version |
|---|---|---|
| E1 | Socle technique et données | V0 |
| E2 | Séance active | V0 |
| E3 | Programme et accueil | V0 |
| E4 | Journal | V0 |
| E5 | Sauvegarde et réglages | V0 |
| E6 | Mesure de l'effort (RPE, tempo, repos réel) | V1 |
| E7 | Progression et statistiques | V1 |
| E8 | Suivi corporel | V1 |
| E9 | Coach déterministe | V1 |
| E10 | Import d'historique | V1 |
| E11 | Nutrition (compteur de protéines) | V1 |

## 2. Backlog V0 — 10 soirées

### E1 — Socle technique · 2 soirées

| ID | Story | Critère d'acceptation | Est. |
|---|---|---|:--:|
| US-01 | Initialiser le projet Vite + TS strict + ESLint + Prettier + Vitest | `npm run lint/typecheck/test` verts sur un dépôt propre | 0,5 |
| US-02 | Mettre en place Dexie v1 et les repositories | Les 12 tables existent, un test d'intégration écrit et relit une entité | 0,5 |
| US-03 | Charger les seeds au premier lancement | Au 1er démarrage, 25 exercices et 3 templates sont en base ; au 2e, aucun doublon | 0,5 |
| US-04 | Configurer la PWA (manifest, SW, installation) | L'app s'installe sur le téléphone et démarre en mode avion | 0,5 |

### E2 — Séance active · 4 soirées · **priorité absolue**

| ID | Story | Critère d'acceptation | Est. |
|---|---|---|:--:|
| US-05 | Écran de séance : exercice courant, séries, ligne « dernière fois » | Aucun scroll nécessaire sur un écran de 6 pouces | 1 |
| US-06 | Saisie d'une série par steppers + `VALIDER` | Une série est enregistrée en < 2 s, sans clavier ; mesuré | 1 |
| US-07 | Pré-remplissage depuis la dernière exécution | La 1re série propose les valeurs de la dernière séance ; à défaut, la prescription | 0,5 |
| US-08 | Timer de repos résistant au verrouillage | Le décompte reste juste après 90 s écran éteint ; alerte sonore reçue | 1 |
| US-09 | Wake lock pendant la séance | L'écran ne s'éteint pas entre deux séries ; le lock est relâché en fin de séance | 0,25 |
| US-10 | Navigation entre exercices, progression « 3/9 » | Passage à l'exercice suivant en 1 tap | 0,25 |

### E3 — Programme et accueil · 1,5 soirée

| ID | Story | Critère d'acceptation | Est. |
|---|---|---|:--:|
| US-11 | Accueil « Aujourd'hui » avec la séance du jour et `DÉMARRER` | Depuis l'ouverture, la séance démarre en 1 tap | 0,5 |
| US-12 | Blocs échauffement et étirements cochables | Les 7 items d'échauffement se cochent, l'état est persisté | 0,25 |
| US-13 | Bloc cardio : chronomètre, modalité, FC | Une session cardio de 15 min est enregistrée avec sa modalité | 0,5 |
| US-14 | Reprise d'une séance interrompue | App tuée en pleine séance → réouverture → reprise à la série exacte | 0,25 |

### E4 — Journal · 1 soirée

| ID | Story | Critère d'acceptation | Est. |
|---|---|---|:--:|
| US-15 | Liste des séances passées | Date, code, durée, tonnage affichés | 0,5 |
| US-16 | Détail d'une séance et correction d'une série | Une valeur erronée est corrigeable en 3 taps | 0,5 |

### E5 — Sauvegarde et réglages · 1,5 soirée

| ID | Story | Critère d'acceptation | Est. |
|---|---|---|:--:|
| US-17 | Export JSON complet | Le fichier produit se réimporte à l'identique | 0,5 |
| US-18 | Import JSON avec choix remplacer / fusionner | Aucune fusion silencieuse possible | 0,5 |
| US-19 | Réglages : version du build, date du dernier export, `storage.persist()` | La version affichée correspond au build installé | 0,25 |
| US-20 | Substitution d'exercice : 3 alternatives proposées | Machine occupée → substitution en 2 taps, traçabilité conservée | 0,25 |

**Total V0 : 10 soirées.**

## 3. Ordre d'exécution imposé

```
US-01 ─ US-02 ─ US-03
                  │
                  ▼
   US-05 ─ US-06 ─────────────▶ ⚑ TEST EN SALLE (jalon J1)
                  │              valider la cible des 2 s
                  ▼              AVANT tout autre développement
        US-07 ─ US-08 ─ US-09 ─ US-10
                  │
                  ▼
        US-11 ─ US-12 ─ US-13 ─ US-14 ─ US-04
                  │
                  ▼
        US-15 ─ US-16 ─ US-17 ─ US-18 ─ US-19 ─ US-20
                  │
                  ▼
              ⚑ V0 EN SERVICE (jalon J2)
```

**US-05 et US-06 passent avant tout le reste, y compris la configuration PWA.** Si la saisie n'est pas assez rapide, le reste du projet n'a pas d'intérêt. Le prototype doit être testé en salle avant que 8 soirées de développement ne soient engagées.

## 4. Backlog V1 — hypothèse, à arbitrer par l'usage réel

| ID | Story | Epic | Est. |
|---|---|---|:--:|
| US-21 | RPE en fin d'exercice (3 boutons) et RIR dérivé | E6 | 0,5 |
| US-22 | Mesure du temps de repos réel | E6 | 0,25 |
| US-23 | Tempo prescrit et saisi | E6 | 0,5 |
| US-24 | Détection automatique des PR et signalement | E7 | 1 |
| US-25 | Courbes de charge et d'e1RM par mouvement | E7 | 1 |
| US-26 | Volume hebdomadaire par groupe musculaire | E7 | 1 |
| US-27 | Heatmap corporelle animée | E7 | 1,5 |
| US-28 | Niveaux de force relatifs au poids de corps | E7 | 1 |
| US-29 | Alerte de déséquilibre push/pull | E7 | 0,5 |
| US-30 | Saisie poids, tour de taille, mensurations | E8 | 0,5 |
| US-31 | Photos de progression et comparaison côte à côte | E8 | 1,5 |
| US-32 | Moteur de règles du coach (C-01 à C-07) | E9 | 2 |
| US-33 | Affichage des suggestions avec justification | E9 | 0,5 |
| US-34 | Passage de phase mensuel assisté | E9 | 0,5 |
| US-35 | Import CSV / Excel avec mapping de colonnes | E10 | 1,5 |
| US-36 | Compteur de protéines à préréglages | E11 | 1 |
| US-37 | Carte de séance générée localement | E7 | 1 |

**Total V1 estimé : ~16 soirées.** Cette liste est une hypothèse : **le carnet de frictions constitué pendant les 3 semaines d'usage réel (jalon J3) la réordonnera.**

## 5. Carnet de frictions

Tableau à remplir après chaque séance. Une friction constatée en salle prime sur toute idée de fonctionnalité.

| Date | Séance | Friction constatée | Contournement utilisé | Story créée |
|---|---|---|---|---|
| | | | | |

## 6. Roadmap

```
Août 2026        │ V0 ████████████ · 10 soirées
                 │ J1 prototype testé en salle (12/08)
                 │ J2 V0 en service (31/08)
Septembre 2026   │ Usage réel, carnet de frictions
                 │ J3 backlog V1 réordonné (21/09)
Octobre 2026     │ V1 ████████████████ · ~16 soirées
                 │ J4 V1 en service (fin octobre)
Novembre 2026    │ Usage, fin du cycle de 3 mois
                 │ J5 bilan et décision d'ouverture produit
```

## 7. Hors périmètre — ne pas ouvrir avant le jalon J5

Synchronisation multi-appareils · comptes utilisateurs · backend · montre connectée · journal alimentaire complet · sommeil · fonctions sociales · générateur de programme · coach LLM · publication sur les stores.

Chacune de ces lignes est un projet à part entière. Les inscrire ici sert à ne plus y penser jusqu'à ce que la V1 tourne.
