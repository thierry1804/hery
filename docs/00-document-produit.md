# 00 — Document Produit

**Projet** : HERY — suivi de musculation
**Version du document** : 1.0
**Date** : 8 août 2026
**Statut** : validé pour lancement V0

---

## 1. Contexte

Reprise de la musculation en août 2026 après une longue interruption, à 51 ans, en salle équipée, sur un programme Full Body 3 séances par semaine (lundi / mercredi / vendredi, ~75 min par séance) prévu sur 3 mois.

Les applications existantes (Strong, Hevy, FitNotes…) répondent bien au besoin de journal, mais partagent trois défauts pour ce cas d'usage :

- elles ne trackent que les séries de musculation, alors que **30 des 75 minutes** de la séance sont de l'échauffement, du cardio et des étirements ;
- elles mettent le **poids de corps** au centre de la progression, ce qui est contre-productif en recomposition corporelle ;
- leurs mécaniques de motivation reposent sur du social et des séries de jours consécutifs, inadaptés à une pratique de 3 séances/semaine.

## 2. Utilisateur

**Persona unique — « le pratiquant qui reprend »**

| Attribut | Valeur |
|---|---|
| Âge / niveau | 51 ans, re-débutant (mémoire musculaire présente) |
| Objectif déclaré | Prise de masse musculaire + bonne condition cardio |
| Objectif réel | **Recomposition corporelle** : gain de muscle et perte de gras simultanés |
| Cadre | Salle équipée, 3 séances/semaine, programme écrit sur 3 mois |
| Contexte de saisie | Téléphone en poche, écouteurs filaires, une main libre, 60-90 s de repos |
| Compétence technique | Élevée — l'utilisateur est aussi le développeur |
| Réseau | Data disponible, mais hors-ligne souhaité |

**Conséquence produit majeure** : en recomposition, la balance ne bouge pas — ou remonte — pendant que la progression est réelle. Une app qui met le poids en avant décourage l'utilisateur **au moment précis où le programme fonctionne**. La hiérarchie visuelle de l'écran Progression est donc : charges → tour de taille → photos → poids de corps (en dernier, discret).

## 3. Objectifs

### Objectifs produit

| # | Objectif | Mesure |
|---|---|---|
| O1 | Ne jamais arriver en salle sans savoir quoi faire | 100 % des séances démarrées depuis un template |
| O2 | Ne jamais perdre l'historique d'une charge | 100 % des séries loguées |
| O3 | Rendre la progression visible même sans variation de poids | Écran Progression consulté ≥ 1×/semaine |
| O4 | Tenir au-delà de la semaine 8 | ≥ 20 séances loguées à S8, ≥ 36 à S12 |
| O5 | Ne pas ajouter de friction en salle | Temps médian de saisie d'une série < 2 s |

### Non-objectifs (V0 et V1)

- Servir d'autres utilisateurs que l'auteur.
- Fonctionner sur montre connectée.
- Proposer une dimension sociale, communautaire, ou de partage.
- Couvrir d'autres disciplines (crossfit, course, natation).
- Générer des programmes à partir de zéro (l'app **ajuste** un programme existant, elle ne l'invente pas).

## 4. Proposition de valeur et différenciateurs

| Différenciateur | Pourquoi il compte |
|---|---|
| **La séance complète, pas seulement les séries** | Échauffement, cardio (durée + FC cible), étirements font partie du même objet séance |
| **Saisie 2 secondes, sans clavier** | La qualité de l'app se joue entièrement sur les 3 secondes entre deux séries |
| **Réglages machine mémorisés** | « Siège position 4, cale-cuisses 3 » — coût de dev quasi nul, gain quotidien réel |
| **Substitution d'exercice en 1 tap** | La machine occupée est l'irritant n°1 en salle et personne ne le traite bien |
| **Hiérarchie anti-balance** | Adaptée à la recomposition, contrairement à tout le marché |
| **Coach déterministe local** | Suggestions explicables (« +2,5 kg car 3×12 atteint 2 fois »), pas une boîte noire |

## 5. Principes directeurs

1. **La séance active est sacrée.** Aucune fonctionnalité n'y ajoute de tap. Tout ce qui peut être demandé avant ou après l'est.
2. **Le pré-remplissage est la règle.** L'app propose toujours une valeur ; l'utilisateur corrige, il ne saisit pas.
3. **Rien ne se perd.** Une séance interrompue reprend où elle s'est arrêtée. Une donnée écrite n'est jamais recalculée a posteriori.
4. **Le repos n'est jamais pénalisé.** Objectif hebdomadaire, jamais de série de jours consécutifs.
5. **La motivation vient des chiffres réels.** Pas d'XP artificiel, pas de badge décoratif ; uniquement des jalons objectivement mérités.

## 6. Périmètre

### V0 — « Mon programme dans ma poche » · cible : fin août 2026 · ~10 soirées

| Inclus | Exclu volontairement |
|---|---|
| Programme A/B/C pré-chargé (seed) | Éditeur de programme |
| Écran de séance active, saisie 2 s | RPE, tempo, temps de repos réel |
| Ligne « dernière fois » par exercice | Graphes et statistiques |
| Timer de repos 60-90 s | Nutrition, sommeil, photos |
| Substitution d'exercice | Coach IA |
| Blocs échauffement / cardio / étirements | Import d'historique |
| Réglages machine par exercice | Sync, comptes, backend |
| Historique brut consultable | Heatmap musculaire |
| Reprise de séance interrompue | |
| 100 % hors-ligne (IndexedDB) | |
| Export / import JSON (sauvegarde) | |

**Critère de sortie V0** : 3 séances complètes loguées en salle sans frustration ni contournement papier.

### V1 — « Je vois que je progresse » · +4 à 5 semaines

- RPE simplifié (3 boutons, **demandé une seule fois en fin d'exercice**), RIR dérivé
- Tempo et temps de repos réel mesuré
- Détection automatique des PR (charge, reps, volume, e1RM)
- Courbes par mouvement, tonnage, volume hebdomadaire par groupe musculaire
- Heatmap musculaire animée
- Niveaux de force relatifs au poids de corps
- Suivi corporel : poids, **tour de taille**, mensurations, photos de progression comparables
- Coach déterministe : suggestion de charge, détection de plateau, proposition de deload, ajustement mensuel (mois 1 réadaptation → mois 2 progression → mois 3 intensification)
- Import CSV / Excel d'historique
- Compteur de protéines à préréglages (voir §7)
- Carte de séance partageable (image générée localement)

### V2 — ouverture

Journal alimentaire complet, sommeil, synchronisation multi-appareils, montre connectée, multi-utilisateurs, ouverture produit.

## 7. Décisions produit assumées

Ces décisions sont contre-intuitives ou vont contre une demande initiale. Elles sont documentées ici pour ne pas être rejouées.

| Décision | Justification | Alternative écartée |
|---|---|---|
| **Pas de journal alimentaire avant la V2** | 5 saisies/jour × 7 jours contre 3 séances/semaine : le journal alimentaire est la première cause d'abandon des apps fitness et casse la boucle de rétention au lieu de la renforcer | Base alimentaire complète en V1 |
| **Compteur de protéines à préréglages en V1** | 8 boutons personnels (1 œuf = 6 g, 1 dose de whey = 24 g…) + jauge vers la cible : 95 % de la valeur, 5 % du coût, 1 tap par prise | Scan de code-barres, base CIQUAL |
| **RPE une fois par exercice, pas par série** | Demander le RPE à chaque série détruit la cible des 2 s ; 3 boutons (`Facile` / `Correct` / `À fond` → RPE 6 / 8 / 9,5) conservent ~90 % du signal utile au coach | RPE numérique 1-10 par série |
| **Poids de corps déprioritisé visuellement** | Recomposition corporelle : la balance ment pendant les 8 premières semaines | Poids en indicateur principal |
| **Objectif hebdomadaire, jamais de série de jours** | Le repos fait partie du programme ; le pénaliser est un contresens physiologique | Streak quotidienne type Duolingo |
| **Coach déterministe avant coach LLM** | Une règle explicable est auditable, testable, instantanée et hors-ligne. Voir [ADR-003](adr/003-coach-moteur-de-regles.md) | Appel LLM dès la V1 |
| **Aucune donnée ne quitte l'appareil** | Photos corporelles et mensurations : le local-first supprime toute question de confidentialité | Backend dès la V1 |

## 8. Parcours clés

**P1 — Faire sa séance (le parcours qui compte)**
Ouvrir l'app → la séance du jour est déjà là → `DÉMARRER` → cocher l'échauffement → série 1 pré-remplie → `VALIDER` → repos automatique → … → bloc cardio (chrono + FC) → étirements → carte de résumé.
*Cible : 0 saisie clavier, 0 scroll pendant la séance, < 2 s par série.*

**P2 — La machine est occupée**
Sur l'exercice courant → `Remplacer` → 3 alternatives proposées (même groupe musculaire, matériel disponible) → 1 tap → la prescription et l'historique suivent.

**P3 — Consulter sa progression (hebdomadaire)**
Onglet Progression → heatmap de la semaine → courbe du mouvement principal → tour de taille → photos comparées.

**P4 — Ajuster le programme (mensuel)**
Le coach signale la fin du mois 1 → propose les charges du mois 2 (+5 à 10 % sur les exercices où toutes les répétitions sont atteintes) → l'utilisateur valide exercice par exercice.

**P5 — Sauvegarder**
Réglages → `Exporter mes données` → fichier JSON daté, déposé où l'utilisateur veut.

## 9. Métriques de succès

| Métrique | Cible | Mesure |
|---|---|---|
| Temps médian de saisie d'une série | < 2 s | instrumenté localement (timestamp entre deux `VALIDER`) |
| Séances loguées / séances réalisées | 100 % | déclaratif |
| Séances à S8 | ≥ 20 | compteur |
| Séances à S12 | ≥ 36 | compteur |
| Séances abandonnées en cours | 0 | statut `abandoned` |
| Consultations de l'écran Progression | ≥ 1/semaine | compteur local |

## 10. Risques et contre-mesures

| Risque | Prob. | Impact | Contre-mesure |
|---|---|---|---|
| **Le développement dure plus longtemps que la motivation** | Élevée | Critique | Périmètre V0 volontairement pauvre, critère de sortie à 3 séances, deadline fin août |
| Sur-ingénierie (sync, comptes, multi-users) | Élevée | Élevé | Aucun backend avant V2, ADR obligatoire pour toute dépendance externe |
| L'app ralentit la séance → abandon de l'app | Moyenne | Critique | Prototype de l'écran de séance testé en salle **avant** tout autre développement |
| Le timer de repos ne sonne pas (écran verrouillé) | Élevée | Élevé | Timestamp de fin + Service Worker + son (écouteurs filaires) ; ne jamais dépendre de `setInterval` |
| Perte de données (IndexedDB effacé) | Faible | Critique | Export JSON hebdomadaire, rappel automatique |
| Blessure liée à une suggestion de charge trop agressive | Faible | Élevé | Progression plafonnée à +10 %/mois, RIR 2-3 imposé le mois 1, deload proposé au bout de 2 séances sans progression |
| Le programme évolue et casse l'historique | Moyenne | Moyen | Séparation stricte prescription / réalisation (voir modèle de données) |

## 11. Jalons

| Jalon | Contenu | Cible |
|---|---|---|
| J0 | Documentation validée | 8 août 2026 |
| J1 | Prototype écran « Séance active », testé en salle | 12 août 2026 |
| J2 | V0 complète en service | 31 août 2026 |
| J3 | 3 semaines d'usage réel, backlog de frictions constitué | 21 septembre 2026 |
| J4 | V1 en service | fin octobre 2026 |
| J5 | Bilan des 3 mois de programme, décision d'ouverture produit | fin novembre 2026 |

> **Le carnet de frictions du jalon J3 est le vrai document de cadrage de la V1.** Le backlog V1 ci-dessus est une hypothèse ; l'usage réel arbitrera.
