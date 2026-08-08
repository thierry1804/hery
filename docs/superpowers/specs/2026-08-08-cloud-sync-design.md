# Sync bidirectionnelle Dexie ↔ Neon (approche A)

Date : 2026-08-08  
Statut : validé produit (brainstorm)  
Approche : **A — API Hono + Drizzle + Neon**

## Contexte

HERY est une PWA local-first (Dexie / IndexedDB) conçue pour la salle hors-ligne
(ADR-002). Le besoin évolue : sauvegarde cloud et récupération multi-appareils /
après réinstall, sans sacrifier la séance hors-ligne.

Le navigateur ne doit jamais recevoir `DATABASE_URL`. L’accès Postgres passe par
une API authentifiée.

## Objectifs

1. Garder Dexie comme source de vérité pendant la séance (hors-ligne intact).
2. Synchroniser bidirectionnellement vers Neon quand le réseau est disponible.
3. Auth email / mot de passe (un utilisateur au départ, schéma multi-tenant prêt).
4. Ne jamais bloquer ni ralentir la saisie de série à cause du sync.

## Hors scope (V0)

- Packaging APK / Capacitor
- Sync des `progressPhotos` (blobs)
- Auth OAuth / magic link
- Merge champ par champ / CRDT
- Compte multi-utilisateurs UI (partage foyer)
- Remplacer l’export JSON manuel (il reste un filet de secours)

## Architecture

```
[PWA React] ←→ Dexie (vérité en séance)
      │
      │ HTTPS + JWT (online)
      ▼
[API Hono]  ←→  Neon Postgres (Drizzle)
```

- Nouveau package `server/` à la racine du monorepo.
- Module client `app/src/sync/` (API HTTP, merge, orchestration).
- Repositories Dexie inchangés pour la lecture/écriture UI ; le sync lit/écrit
  les tables Dexie en batch après coup.

## Auth

### Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/auth/register` | email + password → user + JWT |
| POST | `/auth/login` | email + password → JWT |
| GET | `/auth/me` | profil si JWT valide |

### Règles

- Mot de passe hashé (bcrypt ou argon2).
- JWT signé avec `JWT_SECRET` (serveur uniquement).
- Client : JWT en `localStorage` uniquement (jamais dans `settings` syncées) ;
  header `Authorization: Bearer <jwt>`.
- Sans token : l’app fonctionne 100 % local ; sync désactivée.
- 401 : invalider le token local, continuer offline, message discret.

### UI

- Routes `/login` et `/register` (email + mot de passe).
- Réglages : état compte, bouton « Synchroniser », déconnexion.
- La nav séance (`/session/*`) ne montre jamais d’écran auth.

## Collections synchronisées

| Table Dexie | Sync V0 |
|-------------|---------|
| exercises | oui |
| cycles | oui |
| sessionTemplates | oui |
| prescribedItems | oui |
| workouts | oui |
| workoutExercises | oui |
| setLogs | oui |
| cardioLogs | oui |
| bodyMetrics | oui |
| proteinEntries | oui |
| settings | oui (clés non sensibles ; pas de secrets) |
| progressPhotos | **non** (local + export JSON) |

Toutes les entités syncées portent côté serveur un `user_id` + les champs
`id`, `created_at`, `updated_at`, `deleted_at` (soft delete, aligné schéma client).

## Protocole sync

### État local

Setting `lastSyncedAt` (ISO) + éventuellement `syncCursor` par table si besoin.
V0 : un seul `lastSyncedAt` global suffit.

### Push — `POST /sync/push`

Body :

```json
{
  "changes": {
    "exercises": [ /* rows */ ],
    "workouts": [ /* rows */ ]
  }
}
```

Règles serveur :

1. Authentifier → `userId`.
2. Pour chaque row : upsert si absente, ou remplacer si
   `incoming.updatedAt >= stored.updatedAt` (LWW).
3. Ignorer / ne pas écraser si la version serveur est plus récente.
4. Réponse : `{ accepted: number, rejected: number }` (compteurs suffisent en V0).

### Pull — `GET /sync/pull?since=<ISO>`

1. Authentifier → `userId`.
2. Retourner toutes les rows de toutes les tables syncées où
   `updated_at > since` et `user_id = userId` (y compris soft-deleted).
3. Client merge LWW dans Dexie (même règle `updatedAt`).
4. Avancer `lastSyncedAt` au max des timestamps reçus / horloge sync.

### Déclencheurs client

- Après login réussi
- Événement `online`
- Fin de séance (`completed` / `abandoned`)
- Bouton manuel Réglages « Synchroniser »
- Optionnel V0.1 : intervalle périodique en foreground

### Conflits

Un seul utilisateur attendu → LWW sur `updatedAt` suffit.
Pas de merge champ par champ en V0.

## Schéma serveur (Drizzle)

- Table `users` : `id`, `email` unique, `password_hash`, timestamps.
- Une table SQL par collection syncée.
- Colonnes miroir pour les champs stables ; `jsonb` pour structures variables
  (`phases`, `template_snapshot`, tableaux muscles, etc.).
- Index : `(user_id, updated_at)` sur chaque table syncée.
- Migrations Drizzle versionnées dans `server/drizzle/`.

## Config & secrets

| Variable | Où | Contenu |
|----------|-----|---------|
| `DATABASE_URL` | `server/.env` | Neon (jamais commitée) |
| `JWT_SECRET` | `server/.env` | secret fort |
| `CORS_ORIGIN` | `server/.env` | origine PWA |
| `VITE_API_URL` | `app/.env` | URL publique de l’API |

- `.env*` gitignorés sauf `.env.example` sans secrets.
- **Rotation obligatoire** du mot de passe Neon s’il a été exposé (chat / logs).

## Déploiement V0

- API Node (Hono) sur Railway, Fly.io ou Render.
- PWA : hébergement actuel / Vite preview ; pointe vers `VITE_API_URL`.
- CORS strict sur l’origine PWA.

## Erreurs & UX

- Sync non bloquante : jamais de spinner global pendant une série.
- Échec réseau : état « sync en attente », retry avec backoff léger.
- Toast / ligne discrète dans Réglages (succès / échec / dernière sync).
- La séance active ignore les erreurs sync.

## ADR

Cette feature **amène** un backend : mettre à jour / superseder ADR-002
(local-first inchangé pour l’UI ; backend ajouté pour sync optionnelle).
Nouvel ADR : « Sync bidirectionnelle via API + Neon ».

## Critères d’acceptation

1. Register + login fonctionnels ; JWT refusé si mdp faux.
2. Séance complète hors-ligne sans appel réseau.
3. Après login + sync : rows présentes dans Neon.
4. Sur second profil navigateur (ou après clear site data) : login + pull
   restaure workouts / sets / programme.
5. Soft-delete local propagé (row serveur avec `deleted_at`).
6. Aucun secret DB dans le bundle client (`VITE_*` only).
7. Photo de progression reste locale uniquement.

## Décisions figées

- Approche A (Hono + Drizzle + Neon)
- Sync bidirectionnelle LWW
- Auth email/mot de passe
- Photos hors sync V0
- App utilisable sans compte
