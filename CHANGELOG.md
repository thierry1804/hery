# Journal des modifications

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/).
Versionnement sémantique `MAJOR.MINOR.PATCH`.

---

## [Non publié]

### Ajouté
- Documentation initiale du projet : document produit, architecture fonctionnelle,
  architecture technique, book de développement, modèle de données, design system,
  backlog et glossaire.
- Seeds du catalogue d'exercices et du programme Full Body 3 séances / semaine.
- ADR-001 (PWA React + Vite), ADR-002 (local-first Dexie), ADR-003 (coach déterministe).
- `app/` : projet Vite + React 19 + TypeScript strict initialisé (US-01).
- Dexie v1 (12 tables) + repositories (US-02) ; chargement des seeds au premier lancement (US-03).
- Domaine pur : e1RM (RG-13), détection de PR (RG-16), machine à états de séance (RG-09),
  substitution d'exercice — testés unitairement (Vitest, 14 tests verts).
- Écran de séance active complet : liste de séries avec marque de magnésie, steppers
  charge/reps sans clavier, pré-remplissage, timer de repos piloté par timestamp (RG-08),
  wake lock, bloc échauffement/étirements cochable, bloc cardio, substitution d'exercice,
  note/réglages machine, reprise de séance interrompue (US-05 à US-14).
- Accueil « Aujourd'hui », Historique + détail/correction de série, Réglages
  (export/import JSON, `storage.persist()`) (US-11, US-15 à US-20).
- PWA : manifest, service worker (Workbox, `generateSW`) (US-04).
- Design system « Fonte et magnésie » en variables CSS.

### Corrigé — frictions du test en salle (jalon J1, 08/08/2026)
- Le passage à l'exercice suivant sautait le repos sur la dernière série de chaque
  exercice (2 ou 3 selon la prescription) : le repos suit désormais toujours la
  validation d'une série, y compris la dernière, et l'avancée n'intervient qu'à la fin
  du repos (`pendingAdvance`, persisté pour survivre à une fermeture pendant ce repos).
- Un exercice en durée (gainage) affichait « Série 1 × kg » : l'affichage distingue
  maintenant les séries en durée (`Xs`) des séries en charge (`reps × poids`).
- L'écran Étirements restait bloqué sur « Continuer » : la fin de séance ne prenait
  jamais la main car elle était testée après une condition toujours vraie ; corrigé.
- ADR-004 : position de lecture de séance stockée dans `settings`, pas dans `Workout`
  (justifie la simplification déjà en place, formalisée après le test en salle).

### Ajouté — clôture jalon J2 (V0 en service)
- Écran « Aujourd'hui » : sélection manuelle d'une séance A/B/C hors jour prescrit
  (rattrapage / test), en plus de l'auto-détection du jour de la semaine.
- Suite e2e Playwright (`tests/e2e/seance-complete.spec.ts`) : parcours complet
  démarrage → échauffement → force → cardio → étirements → clôture → historique,
  vert (bookdev §9, scénario bloquant).
- Pipeline CI GitHub Actions (`.github/workflows/ci.yml`) : lint → typecheck → test →
  e2e → build.
- Vérifié : fonctionnement 100 % hors-ligne (Service Worker + IndexedDB, serveur coupé
  pendant le test), idempotence du seed au rechargement, `lint`/`typecheck`/`test`/
  `test:e2e`/`build` tous verts.

### Connu — limitations V0 actuelles
- Icônes PWA en SVG provisoire (pas encore de jeu de PNG multi-tailles).
- Notification de fin de repos limitée au son/vibration au premier plan ; pas encore de
  notification programmée via le Service Worker pour l'écran verrouillé (§5.1/§5.3).
- Pas encore déployé (pas de dépôt Git ni d'hébergement configurés) — `main` n'est donc
  pas encore « toujours déployable » au sens de `02-architecture-technique.md` §10.
- Dev server HTTPS auto-signé abandonné (cassait l'enregistrement du Service Worker) ;
  test Wake Lock/PWA sur téléphone via réseau local nécessite
  `chrome://flags/#unsafely-treat-insecure-origin-as-secure` (Android) — non applicable
  tel quel sur iOS Safari.

### À venir — V0
- Choix d'hébergement + initialisation Git + premier déploiement (jalon J2).
- Icônes PWA définitives, notification de repos écran verrouillé.
- 3 séances complètes loguées en salle sans contournement papier (critère de sortie V0).

---

## [0.1.0] — non daté
Première version en service (V0). À compléter à la livraison.
