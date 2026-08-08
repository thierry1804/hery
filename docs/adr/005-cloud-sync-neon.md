# ADR-005 — Sync bidirectionnelle via API Hono + Neon

- **Statut** : accepté
- **Date** : 2026-08-08
- **Spec** : `docs/superpowers/specs/2026-08-08-cloud-sync-design.md`

## Contexte

ADR-002 exclut tout backend en V0/V1. Le besoin de récupérer les données après
réinstall ou sur un second appareil justifie une sync cloud **optionnelle**, sans
abandonner le local-first en salle.

## Décision

- API Node (`server/`) : Hono + Drizzle + Neon Postgres
- Auth email / mot de passe, JWT (Bearer), secret serveur uniquement
- Sync push/pull LWW sur `updatedAt`, soft-delete via `deletedAt`
- Dexie reste source de vérité hors-ligne ; sync non bloquante
- Photos de progression hors sync V0
- `DATABASE_URL` jamais exposé au client (`VITE_API_URL` seulement)

## Conséquences

- Un service à déployer (Railway / Fly / Render)
- Compte optionnel : sans JWT l’app fonctionne comme avant
- ADR-002 reste valide pour le chemin local ; ce document couvre la couche sync
