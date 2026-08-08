# 01 — Architecture fonctionnelle

**Projet** : HERY
**Version** : 1.0 — 8 août 2026

---

## 1. Cartographie des domaines

```
┌───────────────────────────────────────────────────────────────┐
│                        HERY                                   │
├──────────────┬──────────────┬──────────────┬──────────────────┤
│ D1 CATALOGUE │ D2 PROGRAMME │ D3 SÉANCE    │ D4 JOURNAL       │
│ Exercices    │ Cycles       │ Exécution    │ Historique       │
│ Muscles      │ Templates    │ Timer        │ Recherche        │
│ Alternatives │ Phases       │ Substitution │ Édition a post.  │
├──────────────┼──────────────┼──────────────┼──────────────────┤
│ D5 PROGRESS. │ D6 CORPS     │ D7 COACH     │ D8 DONNÉES       │
│ PR / e1RM    │ Poids        │ Suggestions  │ Export / import  │
│ Volume       │ Mensurations │ Plateau      │ Sauvegarde       │
│ Heatmap      │ Photos       │ Deload       │ Migrations       │
│ Niveaux      │ Protéines    │ Ajust. cycle │ Réglages         │
└──────────────┴──────────────┴──────────────┴──────────────────┘
```

| Domaine | V0 | V1 | V2 |
|---|:--:|:--:|:--:|
| D1 Catalogue d'exercices | ✅ lecture seule (seed) | ✅ édition | ✅ |
| D2 Programme | ✅ seed figé | ✅ éditable + phases | ✅ génération |
| D3 Séance | ✅ | ✅ + RPE, tempo, repos réel | ✅ |
| D4 Journal | ✅ liste + détail | ✅ recherche, édition | ✅ |
| D5 Progression | ❌ | ✅ | ✅ |
| D6 Corps | ❌ | ✅ hors nutrition complète | ✅ |
| D7 Coach | ❌ | ✅ règles déterministes | ✅ + LLM optionnel |
| D8 Données | ✅ export/import JSON | ✅ + import CSV | ✅ + sync |

---

## 2. Détail des domaines

### D1 — Catalogue d'exercices

**Responsabilité** : référentiel des mouvements et de leur sollicitation musculaire.

- Fiche exercice : nom, matériel, muscles primaires et secondaires (avec coefficient), unilatéral ou non, incrément de charge par défaut, consignes techniques.
- Liste d'alternatives par exercice, alimentant la substitution en séance.
- Le catalogue V0 est livré en seed (`data/exercices.seed.json`) et non modifiable dans l'interface.

**Règles**
- `RG-01` Un exercice unilatéral (fentes, gainage latéral) enregistre la charge **par côté** ; le tonnage est doublé au calcul.
- `RG-02` Le coefficient de sollicitation vaut 1,0 pour un muscle primaire et 0,5 pour un secondaire. Il sert au calcul du volume et de la heatmap.

### D2 — Programme

**Responsabilité** : ce qui est **prescrit**, par opposition à ce qui est **réalisé**.

- Cycle : nom, date de début, durée en semaines, phase courante.
- Templates de séance A / B / C, chacun rattaché à un jour de la semaine.
- Chaque template est une liste ordonnée d'items typés : `warmup`, `strength`, `cardio`, `core`, `stretch`.
- Un item porte la prescription : nombre de séries, répétitions cibles (ou durée), temps de repos, notes.

**Règles**
- `RG-03` La prescription et la réalisation sont **deux objets distincts**. Modifier un template ne modifie jamais une séance passée.
- `RG-04` Une séance réalisée conserve une copie figée de la prescription appliquée ce jour-là.
- `RG-05` Phases du cycle 3 mois : mois 1 *réadaptation* (RIR 2-3 imposé, pas de suggestion de hausse), mois 2 *progression* (+5 à 10 % autorisés, passage à 4 séries sur les exercices principaux), mois 3 *intensification* (repos 60-90 s, progression hebdomadaire recherchée).

### D3 — Séance

**Responsabilité** : l'exécution en temps réel. C'est le cœur du produit.

**Machine à états**

```
   ┌─────────┐  démarrer   ┌──────────┐
   │  PRÊTE  │────────────▶│ EN COURS │◀──────────┐
   └─────────┘             └────┬─────┘           │
        ▲                       │ valider série   │ reprendre
        │                       ▼                 │
        │                  ┌─────────┐            │
        │                  │  REPOS  │────────────┘
        │                  └─────────┘  fin du timer / passer
        │                       │
        │ (nouveau jour)        │ dernier item terminé
        │                       ▼
        │                  ┌──────────┐    ┌──────────┐
        └──────────────────│ TERMINÉE │    │ ABANDON. │
                           └──────────┘    └──────────┘
                                    ▲              ▲
                        clôture manuelle    inactivité > 6 h
```

**Fonctionnalités**

| Code | Fonctionnalité | V |
|---|---|:--:|
| F-S01 | Démarrage de la séance du jour en 1 tap depuis l'accueil | V0 |
| F-S02 | Bloc échauffement cochable (7 items, ~10 min) | V0 |
| F-S03 | Saisie d'une série : steppers charge/reps + `VALIDER`, zéro clavier | V0 |
| F-S04 | Pré-remplissage depuis la dernière exécution du même exercice | V0 |
| F-S05 | Ligne « dernière fois » persistante sous l'exercice courant | V0 |
| F-S06 | Timer de repos automatique, résistant à l'écran verrouillé | V0 |
| F-S07 | Substitution d'exercice (3 alternatives proposées) | V0 |
| F-S08 | Réglages machine mémorisés et rappelés | V0 |
| F-S09 | Bloc cardio : chronomètre, modalité, FC cible 110-130 | V0 |
| F-S10 | Bloc étirements cochable | V0 |
| F-S11 | Reprise de séance interrompue | V0 |
| F-S12 | Note libre par exercice (douleur, sensation) | V0 |
| F-S13 | Ajout d'une série hors prescription / suppression d'une série | V0 |
| F-S14 | RPE en fin d'exercice — 3 boutons | V1 |
| F-S15 | Mesure du temps de repos réel | V1 |
| F-S16 | Carte de résumé de séance en fin de parcours | V1 |
| F-S17 | Tempo prescrit et saisi | V1 |

**Règles**
- `RG-06` Le pré-remplissage prend la **dernière exécution réussie** du même exercice, tous templates confondus.
- `RG-07` La validation d'une série est **optimiste** : écriture locale immédiate, aucun état de chargement affiché.
- `RG-08` Le timer de repos est piloté par un **timestamp de fin** persisté, jamais par un compteur en mémoire.
- `RG-09` Une séance sans activité depuis plus de 6 h passe automatiquement en `abandonnée` mais reste consultable et reprenable pendant 24 h.
- `RG-10` Une substitution conserve la traçabilité : `substitutedFromId` référence l'exercice initialement prescrit.
- `RG-11` Le RPE est demandé **une seule fois par exercice**, après la dernière série. Mapping : `Facile` → 6, `Correct` → 8, `À fond` → 9,5. Le RIR est dérivé : `RIR = 10 − RPE`.

### D4 — Journal

- Liste chronologique des séances (date, code A/B/C, durée, tonnage, nombre de PR).
- Détail d'une séance : tous les items, séries, notes, cardio.
- Édition a posteriori d'une série (correction de saisie).
- Recherche par exercice : historique complet d'un mouvement.

**Règles**
- `RG-12` Toute correction a posteriori est journalisée (`editedAt`) et déclenche un recalcul des PR postérieurs.

### D5 — Progression

| Code | Fonctionnalité | V |
|---|---|:--:|
| F-P01 | Détection automatique des PR (charge max, reps à charge donnée, e1RM, tonnage sur un exercice) | V1 |
| F-P02 | Courbe de charge et d'e1RM par mouvement | V1 |
| F-P03 | Tonnage hebdomadaire et mensuel | V1 |
| F-P04 | Volume par groupe musculaire (séries pondérées / semaine) | V1 |
| F-P05 | Heatmap corporelle animée sur 7 jours glissants | V1 |
| F-P06 | Niveaux de force relatifs au poids de corps | V1 |
| F-P07 | Alerte de déséquilibre (push/pull, quadriceps/ischios) | V1 |

**Règles**
- `RG-13` e1RM = **Epley** : `charge × (1 + reps / 30)`. Non calculé au-delà de 12 répétitions (fiabilité insuffisante).
- `RG-14` L'e1RM est calculé **au moment du log** et stocké sur la série. Il n'est jamais recalculé.
- `RG-15` Volume d'un groupe musculaire = somme, sur la période, des séries effectives × coefficient de sollicitation. Les séries d'échauffement sont exclues.
- `RG-16` Un PR n'est validé que sur une série non-échauffement d'au moins 1 répétition complète.
- `RG-17` Alerte de déséquilibre si le ratio de volume entre deux groupes antagonistes sort de l'intervalle [0,7 ; 1,4] sur 4 semaines glissantes.

### D6 — Corps

- Poids de corps, tour de taille, tour de poitrine, bras, cuisse, hanches.
- Photos de progression : 3 poses (face, profil, dos), comparaison côte à côte à date.
- Compteur de protéines à préréglages personnels + jauge vers la cible quotidienne.

**Règles**
- `RG-18` Le poids de corps est affiché **en dernier** sur l'écran Progression et sans mise en valeur graphique. Le tour de taille est l'indicateur principal de composition.
- `RG-19` Les photos sont stockées localement en blob compressé (≤ 250 ko), jamais transmises.
- `RG-20` Un rappel de mesure hebdomadaire est proposé, jamais imposé ; aucune notification culpabilisante.

### D7 — Coach (moteur de règles déterministe)

**Responsabilité** : transformer l'historique en une suggestion **explicable**.

| Code | Règle | Déclencheur | Suggestion |
|---|---|---|---|
| C-01 | Double progression | Toutes les répétitions cibles atteintes sur toutes les séries, 2 séances consécutives | +1 incrément de charge (2,5 kg barre/machine, 1,25 kg haltère) |
| C-02 | Régression de charge | Échec de plus de 2 répétitions sous la cible, 2 séances consécutives | −1 incrément |
| C-03 | Plateau | e1RM stable à ±2 % sur 3 séances | Proposer variation d'exercice ou deload |
| C-04 | Deload | 2 séances consécutives sans progression **ou** RPE ≥ 9 sur plus de la moitié des exercices | Semaine à −40 % de volume |
| C-05 | Passage de phase | Fin du mois calendaire du cycle | Appliquer les règles de la phase suivante (`RG-05`) |
| C-06 | Volume insuffisant | Groupe musculaire < 8 séries pondérées/semaine sur 2 semaines | Signaler dans l'écran Progression |
| C-07 | Garde-fou | Toute suggestion cumulée > +10 % de charge sur 4 semaines | Suggestion bloquée et expliquée |

**Règles**
- `RG-21` Toute suggestion est accompagnée de sa justification en une phrase, dérivée de la règle appliquée.
- `RG-22` Aucune suggestion n'est appliquée automatiquement : l'utilisateur valide toujours.
- `RG-23` Aucune suggestion de hausse pendant la phase *réadaptation* (mois 1).

### D8 — Données

- Export JSON complet (données + photos en base64 dans une archive).
- Import JSON (restauration).
- Import CSV / Excel d'historique externe, avec mapping de colonnes (V1).
- Rappel de sauvegarde hebdomadaire.
- Migrations de schéma versionnées.

**Règles**
- `RG-24` Un export est toujours complet, jamais partiel ou incrémental.
- `RG-25` Un import remplace ou fusionne selon choix explicite de l'utilisateur ; jamais de fusion silencieuse.

---

## 3. Arborescence des écrans

```
[Aujourd'hui]  ← accueil, onglet par défaut
   ├─ [Séance active]        (plein écran, navigation masquée)
   │     ├─ overlay [Repos]
   │     ├─ modale [Remplacer l'exercice]
   │     ├─ modale [Note / réglages machine]
   │     └─ [Résumé de séance]
   └─ [Détail du programme du jour]  (lecture seule)

[Historique]
   └─ [Détail d'une séance]
         └─ [Historique d'un exercice]

[Progression]                        V1
   ├─ [Heatmap & volume]
   ├─ [Courbes par mouvement]
   ├─ [Mesures corporelles]
   └─ [Photos comparées]

[Réglages]
   ├─ [Programme & phases]
   ├─ [Préréglages protéines]        V1
   ├─ [Sauvegarde / restauration]
   └─ [À propos & version]
```

**Navigation** : 4 onglets en barre basse. La séance active **masque la barre d'onglets** — on ne quitte pas une séance par erreur.

## 4. Matrice écrans × domaines

| Écran | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Aujourd'hui | | ● | ○ | ○ | ○ | | ● | |
| Séance active | ● | ● | ●●● | | | | ○ | |
| Résumé de séance | | | ● | ● | ● | | ○ | |
| Historique | | | | ●●● | ○ | | | |
| Progression | ● | | | ● | ●●● | ●● | ○ | |
| Réglages | ○ | ● | | | | ○ | | ●●● |

`●●●` responsabilité principale · `●` usage direct · `○` lecture secondaire

## 5. Ce qui est explicitement refusé

| Demande | Décision | Motif |
|---|---|---|
| Classement, comparaison avec d'autres | Refusé | Aucune valeur pour un usage strictement personnel ; pousse au volume |
| XP, niveaux génériques, avatars | Refusé | Motivation artificielle qui s'épuise en 3 semaines |
| Série de jours consécutifs | Refusé | Pénalise le repos, qui fait partie du programme |
| Notification quotidienne d'engagement | Refusé | Seules les notifications de timer de repos sont autorisées |
| Chronomètre de série (temps sous tension) | Reporté V2 | Coût de friction supérieur à la valeur pour ce niveau de pratique |
