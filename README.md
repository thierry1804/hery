# HERY — Suivi de musculation

> *Hery* : la force, l'énergie (malgache). Nom de code de travail — à valider ou remplacer.

Application personnelle de suivi de séances de musculation. PWA installable, **100 % locale et hors-ligne**, conçue pour une seule contrainte d'usage : **saisir une série en moins de 2 secondes, d'une main, entre deux séries.**

| | |
|---|---|
| **Statut** | V0 en développement — écran de séance active fonctionnel, test en salle à venir |
| **Type** | Side project personnel (hors cadre professionnel) |
| **Utilisateur cible V0** | 1 seul (l'auteur) |
| **Stack** | React + Vite + TypeScript, PWA, Dexie/IndexedDB |
| **Backend** | Optionnel : sync Neon via `server/` (ADR-005) ; Dexie reste local-first |
| **Dernière mise à jour** | 8 août 2026 |

---

## Le problème résolu

Deux freins identifiés, dans cet ordre de priorité :

1. **Ne pas savoir quoi faire en arrivant en salle** → l'app pousse la séance du jour, prête, sans navigation.
2. **Décrocher au bout de quelques semaines** → l'app rend la progression visible et objective, y compris quand la balance ne bouge pas.

Le second point est le vrai enjeu produit. La fenêtre critique de décrochage se situe entre la semaine 4 et la semaine 8 : **la V0 doit être en service avant.**

---

## Documentation

Lire dans cet ordre.

| # | Document | Contenu |
|---|---|---|
| 00 | [Document Produit](docs/00-document-produit.md) | Vision, persona, objectifs, périmètre V0/V1/V2, métriques, risques |
| 01 | [Architecture fonctionnelle](docs/01-architecture-fonctionnelle.md) | Domaines, fonctionnalités, règles de gestion, parcours, écrans |
| 02 | [Architecture technique](docs/02-architecture-technique.md) | Stack, couches, persistance, PWA, coach, déploiement |
| 03 | [Book de développement](docs/03-bookdev.md) | Conventions, workflow Git, qualité, DoR/DoD, checklists |
| 04 | [Modèle de données](docs/04-modele-de-donnees.md) | Entités, champs, invariants, formules, migrations |
| 05 | [Design system & UX](docs/05-design-system-ux.md) | Direction visuelle, tokens, composants, micro-interactions |
| 06 | [Backlog & roadmap](docs/06-backlog-roadmap.md) | Epics, user stories, estimations, jalons |
| 07 | [Glossaire](docs/07-glossaire.md) | Vocabulaire métier et produit |
| — | [ADR](docs/adr/) | Décisions d'architecture tracées |

## Arborescence du dépôt

```
hery/
├── README.md
├── CHANGELOG.md
├── .gitignore
├── .editorconfig
├── docs/
│   ├── 00-document-produit.md
│   ├── 01-architecture-fonctionnelle.md
│   ├── 02-architecture-technique.md
│   ├── 03-bookdev.md
│   ├── 04-modele-de-donnees.md
│   ├── 05-design-system-ux.md
│   ├── 06-backlog-roadmap.md
│   ├── 07-glossaire.md
│   └── adr/
│       ├── 000-template.md
│       ├── 001-pwa-react-vite.md
│       ├── 002-local-first-dexie.md
│       └── 003-coach-moteur-de-regles.md
├── data/
│   ├── exercices.seed.json          # catalogue des exercices
│   └── programme-fullbody-3j.seed.json  # programme A/B/C, 3 mois
└── app/                             # projet React — V0 initialisée
```

## Initialiser le projet applicatif

Le code applicatif n'est volontairement pas dans ce dossier. Quand la documentation est validée :

```bash
npm create vite@latest app -- --template react-ts
cd app
npm i dexie dexie-react-hooks zustand react-router-dom
npm i -D vite-plugin-pwa vitest @testing-library/react @playwright/test
```

Les seeds de `data/` sont à importer tels quels dans `app/src/data/`.

## Sync cloud (optionnel)

Voir [ADR-005](docs/adr/005-cloud-sync-neon.md).

```bash
# API
cd server
cp .env.example .env   # DATABASE_URL Neon, JWT_SECRET, CORS_ORIGIN
npm install
npm run db:push
npm run dev            # http://localhost:8787

# App
cd ../app
cp .env.example .env   # VITE_API_URL=http://localhost:8787
npm run dev
```

Réglages → Compte → créer un compte / synchroniser. La séance active ne dépend pas du réseau.

## Principes non négociables

1. **2 secondes par série.** Toute fonctionnalité qui allonge la saisie pendant la séance est refusée ou déplacée hors séance.
2. **Hors-ligne d'abord.** L'app fonctionne intégralement sans réseau. Le réseau est un bonus, jamais une dépendance.
3. **Hors-ligne d'abord ; sync cloud optionnelle.** Les données vivent dans Dexie. Un compte peut synchroniser vers Neon (voir ci-dessous). L'export JSON reste un filet de secours.
4. **Pas de social, pas de classement.** Décision produit assumée, voir [ADR-003](docs/adr/003-coach-moteur-de-regles.md) et le document produit.
5. **Aucune mécanique de jeu qui pousse au volume.** Le repos fait partie du programme ; il n'est jamais pénalisé.
