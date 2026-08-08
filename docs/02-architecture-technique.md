# 02 — Architecture technique

**Projet** : HERY
**Version** : 1.0 — 8 août 2026

---

## 1. Vue d'ensemble

Architecture **local-first, sans backend**. L'application est une PWA installable dont la totalité de l'état vit dans IndexedDB sur l'appareil. Aucun appel réseau n'est nécessaire au fonctionnement.

```
┌──────────────────────────── APPAREIL ────────────────────────────┐
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  UI — React 19 + TypeScript                                 │ │
│  │  écrans · composants · design tokens                        │ │
│  └──────────────────────────┬──────────────────────────────────┘ │
│                             │ hooks                               │
│  ┌──────────────────────────▼──────────────────────────────────┐ │
│  │  ÉTAT                                                        │ │
│  │  Zustand (séance active, timer)  ·  useLiveQuery (données)  │ │
│  └──────────────────────────┬──────────────────────────────────┘ │
│                             │                                     │
│  ┌──────────────────────────▼──────────────────────────────────┐ │
│  │  DOMAINE — logique métier pure, sans React, sans Dexie      │ │
│  │  progression · e1rm · volume · coach · substitution          │ │
│  └──────────────────────────┬──────────────────────────────────┘ │
│                             │                                     │
│  ┌──────────────────────────▼──────────────────────────────────┐ │
│  │  REPOSITORIES — seul endroit qui connaît Dexie              │ │
│  └──────────────────────────┬──────────────────────────────────┘ │
│                             │                                     │
│  ┌──────────────────────────▼──────────────────────────────────┐ │
│  │  PERSISTANCE — Dexie / IndexedDB   +   Blobs (photos)       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  SERVICE WORKER — cache applicatif · notifications de repos │ │
│  └─────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
        ↑ export/import JSON manuel        (aucun serveur en V0/V1)
```

## 2. Stack

| Rôle | Choix | Justification |
|---|---|---|
| Framework | React 19 | Compétence existante |
| Build | Vite 6 | Démarrage instantané, build léger, écosystème PWA mature |
| Langage | TypeScript, mode `strict` | Le modèle de données est le cœur du projet |
| Persistance | Dexie 4 sur IndexedDB | Requêtes indexées, migrations versionnées, réactivité native |
| Réactivité données | `dexie-react-hooks` (`useLiveQuery`) | Supprime le besoin d'un cache serveur type React Query |
| État éphémère | Zustand | Séance active et timer uniquement — pas d'état métier |
| Routage | React Router 7, mode data | Routes typées, gestion propre du plein écran de séance |
| PWA | `vite-plugin-pwa` (Workbox) | Manifest, précache, stratégie offline |
| Styles | CSS Modules + variables CSS | Aucun runtime, tokens du design system directement exploitables |
| Graphes | Recharts (V1) | Suffisant, léger ; à charger en `lazy` |
| Tests | Vitest + Testing Library + Playwright | Unitaire sur le domaine, e2e sur le parcours de séance |
| Qualité | ESLint 9 flat config + Prettier | |
| CI/CD | GitHub Actions → hébergement statique | Build + tests + déploiement |

**Dépendances refusées en V0** : toute librairie de composants UI, tout ORM, tout state manager serveur, toute librairie de dates lourde (`Intl` + helpers maison suffisent), toute solution d'authentification.

## 3. Arborescence du code

Organisation **par fonctionnalité**, pas par type technique.

```
app/
├── public/
│   ├── manifest.webmanifest
│   └── icons/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes.tsx
│   │
│   ├── db/
│   │   ├── db.ts                  # instance Dexie + versions
│   │   ├── schema.ts              # types des tables
│   │   ├── migrations.ts
│   │   └── seed.ts                # chargement des seeds au 1er lancement
│   │
│   ├── domain/                    # ⚠ zéro import React, zéro import Dexie
│   │   ├── e1rm.ts
│   │   ├── volume.ts
│   │   ├── records.ts
│   │   ├── coach/
│   │   │   ├── rules.ts
│   │   │   └── evaluate.ts
│   │   ├── substitution.ts
│   │   └── session-machine.ts     # machine à états de la séance
│   │
│   ├── repositories/              # seuls fichiers qui parlent à Dexie
│   │   ├── workouts.repo.ts
│   │   ├── exercises.repo.ts
│   │   ├── program.repo.ts
│   │   └── body.repo.ts
│   │
│   ├── features/
│   │   ├── today/
│   │   ├── session/               # ← 80 % de la valeur du produit
│   │   │   ├── ActiveSessionScreen.tsx
│   │   │   ├── SetInput.tsx
│   │   │   ├── RestOverlay.tsx
│   │   │   ├── SubstituteDialog.tsx
│   │   │   ├── useRestTimer.ts
│   │   │   ├── useWakeLock.ts
│   │   │   └── session.store.ts
│   │   ├── history/
│   │   ├── progress/
│   │   ├── body/
│   │   └── settings/
│   │
│   ├── ui/                        # composants génériques
│   │   ├── Stepper.tsx
│   │   ├── BigButton.tsx
│   │   ├── Sheet.tsx
│   │   └── tokens.css
│   │
│   ├── lib/
│   │   ├── id.ts                  # ULID
│   │   ├── date.ts
│   │   ├── haptics.ts             # vibration + fallback son
│   │   └── image.ts               # compression des photos
│   │
│   └── data/                      # seeds copiés depuis /data
└── tests/
    ├── domain/
    └── e2e/
```

**Règle de dépendance** : `features` → `repositories` → `db`, et `features` → `domain`. Le domaine ne dépend de rien. Un test du domaine ne doit jamais avoir besoin d'un navigateur.

## 4. Persistance

### Instance Dexie

```ts
export class HeryDB extends Dexie {
  exercises!: Table<Exercise, string>;
  cycles!: Table<ProgramCycle, string>;
  sessionTemplates!: Table<SessionTemplate, string>;
  prescribedItems!: Table<PrescribedItem, string>;
  workouts!: Table<Workout, string>;
  workoutExercises!: Table<WorkoutExercise, string>;
  setLogs!: Table<SetLog, string>;
  cardioLogs!: Table<CardioLog, string>;
  bodyMetrics!: Table<BodyMetric, string>;
  progressPhotos!: Table<ProgressPhoto, string>;
  proteinEntries!: Table<ProteinEntry, string>;
  settings!: Table<Setting, string>;

  constructor() {
    super('hery');
    this.version(1).stores({
      exercises:        'id, name, *primaryMuscles, equipment, updatedAt',
      cycles:           'id, startDate, updatedAt',
      sessionTemplates: 'id, cycleId, code, dayOfWeek, updatedAt',
      prescribedItems:  'id, sessionTemplateId, [sessionTemplateId+order], exerciseId',
      workouts:         'id, date, status, sessionTemplateId, updatedAt',
      workoutExercises: 'id, workoutId, exerciseId, [workoutId+order]',
      setLogs:          'id, workoutExerciseId, [workoutExerciseId+index], completedAt, isPR',
      cardioLogs:       'id, workoutId, date',
      bodyMetrics:      'id, date',
      progressPhotos:   'id, date, pose',
      proteinEntries:   'id, date',
      settings:         'key',
    });
  }
}
```

### Index critiques

| Requête | Index utilisé |
|---|---|
| Dernière exécution d'un exercice (pré-remplissage) | `workoutExercises.exerciseId` puis `setLogs.[workoutExerciseId+index]` |
| Séance du jour | `workouts.date` |
| Volume hebdomadaire par muscle | `exercises.*primaryMuscles` + parcours des séries sur la période |
| Historique d'un mouvement | `workoutExercises.exerciseId` |

### Migrations

Toute évolution de schéma passe par une nouvelle `version(n)` avec `upgrade()` explicite. **Aucune donnée n'est supprimée par une migration** ; un champ obsolète est marqué et ignoré, pas retiré. Chaque migration est couverte par un test qui charge un export de la version précédente.

### Volumétrie

3 séances/semaine × ~25 séries × 52 semaines ≈ **4 000 séries/an**, soit < 1 Mo. Les photos dominent : 3 poses × 52 semaines × 250 ko ≈ 40 Mo/an. Prévoir un archivage des photos anciennes en V2.

## 5. Points techniques sensibles

Ces quatre points sont les causes d'échec les plus probables du projet. Ils sont traités en priorité.

### 5.1 Timer de repos

`setInterval` est gelé dès que l'onglet passe en arrière-plan ou que l'écran s'éteint. **Ne jamais s'y fier pour la mesure du temps.**

```
1. À la validation d'une série :
     restEndsAt = Date.now() + restSec * 1000
     → persisté dans le store ET dans IndexedDB
2. Affichage : requestAnimationFrame recalcule depuis restEndsAt
3. Retour au premier plan (visibilitychange) : recalcul immédiat
4. Alerte : Notification programmée via le Service Worker
             + son court (écouteurs filaires branchés)
             + navigator.vibrate si disponible
```

### 5.2 Écran qui s'éteint

`Screen Wake Lock API` maintenue pendant toute la séance active, réacquise sur `visibilitychange`. Sans cela, l'appareil est déverrouillé plusieurs dizaines de fois par séance. Libération obligatoire à la fin de la séance (batterie).

### 5.3 Notifications selon la plateforme

| Plateforme | Notifications PWA | Vibration | Décision |
|---|---|---|---|
| Android / Chrome | ✅ | ✅ | Nominal |
| iOS ≥ 16.4 | ✅ **uniquement si installée sur l'écran d'accueil** | ❌ | Écran d'installation obligatoire au premier lancement |
| Navigateur non installé | Dégradé | variable | Alerte visuelle plein écran + son |

Le **son** est le canal le plus fiable dans ce contexte : les écouteurs filaires sont déjà branchés. Il est traité comme le canal principal, la notification et la vibration comme des renforts.

### 5.4 Perte de données

IndexedDB peut être purgé par le navigateur (pression de stockage, effacement de site). Contre-mesures :

- `navigator.storage.persist()` demandé au premier lancement ;
- export JSON complet en un tap depuis les réglages ;
- rappel de sauvegarde après chaque 4e séance ;
- date du dernier export affichée dans les réglages, en rouge au-delà de 14 jours.

## 6. Le coach

Implémenté comme un **moteur de règles pur** : une fonction `evaluate(historique, contexte) → Suggestion[]`, sans effet de bord, sans réseau, testable unitairement.

```ts
type Suggestion = {
  ruleId: 'C-01' | 'C-02' | 'C-03' | 'C-04' | 'C-05' | 'C-06' | 'C-07';
  exerciseId?: string;
  action: 'increase' | 'decrease' | 'deload' | 'vary' | 'inform';
  payload: { deltaKg?: number; volumeFactor?: number };
  rationale: string;   // phrase affichée à l'utilisateur
  confidence: 'high' | 'medium';
};
```

Chaque règle du domaine D7 est une fonction isolée avec son jeu de tests. Un éventuel appel LLM (V2) ne remplacera pas ce moteur : il ne servira qu'à reformuler les explications et à proposer des variations d'exercices. Voir [ADR-003](adr/003-coach-moteur-de-regles.md).

## 7. Identifiants et préparation de la synchronisation

Aucune synchronisation en V0/V1, mais le schéma est conçu pour l'accueillir sans migration destructrice :

- identifiants **ULID générés côté client** (triables chronologiquement, sans collision) ;
- `createdAt`, `updatedAt` sur toutes les entités ;
- `deletedAt` en suppression logique, jamais de `delete` physique ;
- aucune clé auto-incrémentée ;
- horodatages en UTC ISO 8601, affichage en heure locale.

## 8. Performance

| Budget | Cible |
|---|---|
| Bundle initial (gzip) | < 150 ko |
| Time to Interactive, 4G, Android milieu de gamme | < 2 s |
| Latence perçue d'une validation de série | 0 ms (écriture optimiste) |
| Ouverture de l'écran de séance depuis l'accueil | < 300 ms |

Écrans Progression et graphes chargés en `React.lazy` — ils ne doivent jamais peser sur le démarrage.

## 9. Tests

| Niveau | Périmètre | Outil | Exigence |
|---|---|---|---|
| Unitaire | `domain/` — e1RM, volume, PR, règles du coach, machine à états | Vitest | Couverture ≥ 90 %, obligatoire |
| Intégration | `repositories/` sur `fake-indexeddb` | Vitest | Chemins nominaux |
| Migration | Chargement d'un export de version n-1 | Vitest | 1 test par version |
| E2E | Parcours « faire une séance complète » | Playwright | 1 scénario, bloquant en CI |
| Manuel | En salle, appareil réel | — | Avant chaque livraison |

## 10. Déploiement

Hébergement statique (Netlify, Vercel ou GitHub Pages). Pipeline GitHub Actions : `lint` → `typecheck` → `test` → `build` → `deploy`. La branche `main` est toujours déployable.

Versionnement `MAJOR.MINOR.PATCH`, numéro de version et hash du build affichés dans les réglages — indispensable pour savoir quelle version tourne sur le téléphone lors d'un test en salle.

## 11. Évolutions envisagées (non engagées)

| Évolution | Impact | Prérequis |
|---|---|---|
| Synchronisation multi-appareils | Backend + auth | ULID et soft delete déjà en place |
| Montre connectée | Application compagnon native | Sortie du modèle PWA |
| Multi-utilisateurs / produit | Backend, comptes, RGPD | Décision produit du jalon J5 |
| Coach LLM | API externe, gestion de coût et de latence, mode dégradé hors-ligne | Moteur de règles stabilisé |
