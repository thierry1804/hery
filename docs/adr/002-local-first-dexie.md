# ADR-002 — Local-first sur Dexie, sans backend

- **Statut** : accepté
- **Date** : 2026-08-08

## Contexte

L'application a un seul utilisateur, manipule des données personnelles sensibles
(mensurations, photos de progression) et doit fonctionner sans réseau en salle.
Un backend impliquerait authentification, hébergement, sauvegardes et conformité —
pour un unique utilisateur.

## Options envisagées

| Option | Avantages | Inconvénients |
|---|---|---|
| IndexedDB via Dexie | Hors-ligne natif, requêtes indexées, migrations versionnées, réactivité, zéro coût | Données liées à l'appareil, purge possible par le navigateur, pas de multi-appareils |
| localStorage | Trivial à mettre en œuvre | Synchrone, ~5 Mo, pas d'index, inadapté aux blobs |
| Backend (Supabase, PocketBase) dès la V0 | Sauvegarde et multi-appareils immédiats | Auth, coût, latence, mode dégradé hors-ligne à écrire quand même, périmètre doublé |
| SQLite WASM (OPFS) | SQL complet, performances | Complexité de mise en œuvre disproportionnée pour 4 000 lignes/an |

## Décision

Toutes les données vivent **localement dans IndexedDB via Dexie 4**. Aucun backend en
V0 et V1. La sauvegarde se fait par **export JSON manuel**.

## Justification

Le volume est dérisoire (~4 000 séries par an, moins d'1 Mo hors photos). Le multi-appareils
n'est pas un besoin exprimé. Supprimer le backend supprime simultanément l'authentification,
l'hébergement, la latence, la gestion du mode dégradé et toute question de confidentialité
sur les photos corporelles — soit une part considérable du périmètre, pour aucune perte
fonctionnelle réelle.

Le schéma est néanmoins conçu pour accueillir une synchronisation plus tard sans migration
destructrice : ULID générés côté client, `createdAt` / `updatedAt` / `deletedAt` sur toutes
les entités, suppression logique uniquement, aucune clé auto-incrémentée.

## Conséquences

**Positives** — hors-ligne total, aucun coût récurrent, aucune donnée personnelle
transmise, périmètre V0 réduit d'environ un tiers.

**Négatives** — la perte de l'appareil ou une purge du stockage détruit l'historique
si aucun export n'a été fait. Contre-mesures obligatoires : `navigator.storage.persist()`,
export en un tap, rappel après chaque 4e séance, date du dernier export affichée en rouge
au-delà de 14 jours.

**À réévaluer si** — un second appareil entre dans l'usage, ou si le projet s'ouvre à
d'autres utilisateurs au jalon J5.
