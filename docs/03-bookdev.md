# 03 — Book de développement

**Projet** : HERY
**Version** : 1.0 — 8 août 2026

Ce document est prescriptif. Il s'applique même en solo — surtout en solo, parce qu'un side project sans discipline s'arrête au bout de trois semaines.

---

## 1. Environnement

| Outil | Version minimale |
|---|---|
| Node.js | 22 LTS |
| npm | 10 |
| Git | 2.40 |
| Navigateur de dev | Chrome/Edge (DevTools Application → IndexedDB, Service Workers) |
| Test réel | Le téléphone qui sert en salle, connecté au dev server via le réseau local |

```bash
git clone <repo> && cd hery/app
npm ci
npm run dev -- --host      # --host obligatoire pour tester depuis le téléphone
```

Scripts attendus : `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `test:e2e`, `format`.

## 2. Conventions de nommage

| Élément | Convention | Exemple |
|---|---|---|
| Fichier de composant | PascalCase | `ActiveSessionScreen.tsx` |
| Hook | camelCase préfixé `use` | `useRestTimer.ts` |
| Module de domaine | kebab-case | `session-machine.ts` |
| Repository | `<entite>.repo.ts` | `workouts.repo.ts` |
| Type / interface | PascalCase, pas de préfixe `I` | `SetLog` |
| Constante partagée | SCREAMING_SNAKE_CASE | `DEFAULT_REST_SEC` |
| Fonction booléenne | préfixe `is` / `has` / `can` | `isPersonalRecord()` |

**Langue** : le code, les types et les commentaires sont en **français** pour le vocabulaire métier (`serie`, `charge`, `repetitions`) ou en **anglais** pour le vocabulaire technique — mais jamais un mélange dans un même concept. Décision : **anglais pour le code, français pour l'interface et la documentation.** Un glossaire de correspondance est tenu dans `07-glossaire.md`.

## 3. Règles de code

### TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`. Non négociable.
- `any` interdit. `unknown` + validation explicite si nécessaire.
- Pas de type déclaré deux fois : les types de données viennent de `db/schema.ts`, point.
- Les unités sont dans le nom : `weightKg`, `restSec`, `durationMin`, `waistCm`. Aucune ambiguïté d'unité tolérée.

### React

- Composants fonctionnels uniquement.
- Un composant qui dépasse **150 lignes** est découpé.
- Un composant qui contient un calcul métier est en faute : le calcul va dans `domain/`.
- Aucun appel Dexie dans un composant : passer par un repository ou un hook.
- Pas de `useEffect` pour dériver un état — calculer pendant le rendu.
- Les listes utilisent l'`id` de l'entité comme clé, jamais l'index.

### Domaine

- `domain/` n'importe ni React, ni Dexie, ni rien du navigateur.
- Toute fonction du domaine est pure : mêmes entrées → mêmes sorties.
- Toute règle de gestion de `01-architecture-fonctionnelle.md` porte son code (`RG-xx`, `C-xx`) en commentaire au-dessus de son implémentation. C'est ce qui rend la doc et le code traçables l'un depuis l'autre.

### CSS

- Variables CSS du design system uniquement. **Aucune valeur brute** de couleur, d'espacement ou de taille de police dans un composant.
- Taille de cible tactile minimale : `56 px`. Bouton principal de séance : `72 px`.
- Mobile d'abord ; le desktop est un bonus non testé.

## 4. Git

### Branches

```
main          toujours déployable, toujours testée
feat/<sujet>  une fonctionnalité
fix/<sujet>   une correction
docs/<sujet>  documentation seule
chore/<sujet> outillage, dépendances
```

Branche courte : une branche de plus de 3 jours est un signal de découpage insuffisant.

### Commits — Conventional Commits

```
<type>(<scope>): <description à l'impératif, en français>

feat(session): pré-remplissage de la série depuis la dernière séance
fix(timer): recalcul du repos au retour au premier plan
refactor(domain): extraction du calcul d'e1RM
docs(adr): ADR-004 sur le stockage des photos
test(coach): cas de plateau sur 3 séances
chore(deps): montée de Dexie en 4.2
```

Types autorisés : `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `style`.

### Pull requests

Même en solo, passer par une PR : c'est le seul moment où l'on relit son propre code avec du recul.

Description obligatoire :
- ce que ça change ;
- comment ça a été testé — **et si ça a été testé en salle** ;
- captures avant/après pour tout changement visuel ;
- règles de gestion touchées (`RG-xx`).

## 5. Definition of Ready

Une story n'est prise que si :

- [ ] elle a un identifiant du backlog (`US-xx`) ;
- [ ] son critère d'acceptation est vérifiable sans interprétation ;
- [ ] les règles de gestion concernées sont identifiées ou créées ;
- [ ] son impact sur le temps de saisie en séance est évalué ;
- [ ] elle tient dans une soirée ; sinon elle est découpée.

## 6. Definition of Done

- [ ] Critère d'acceptation vérifié ;
- [ ] `lint`, `typecheck`, `test` verts ;
- [ ] logique métier couverte par un test unitaire ;
- [ ] fonctionne **hors-ligne** (mode avion vérifié) ;
- [ ] testé sur le téléphone réel, pas seulement en émulation ;
- [ ] aucune régression sur le temps de saisie d'une série ;
- [ ] documentation mise à jour si une règle de gestion change ;
- [ ] ADR rédigé si une décision structurante a été prise ;
- [ ] `CHANGELOG.md` complété.

## 7. Checklist de revue

**Fonctionnel**
- [ ] Est-ce que ça ajoute un tap pendant la séance ? Si oui, est-ce justifié explicitement ?
- [ ] Le cas « séance interrompue » est-il géré ?
- [ ] Le cas « premier usage, aucune donnée » est-il géré ?

**Données**
- [ ] Écriture optimiste, sans état de chargement visible ?
- [ ] `updatedAt` mis à jour ? Suppression logique et non physique ?
- [ ] Une valeur calculée est-elle stockée là où elle doit l'être (e1RM) et jamais recalculée ?

**Robustesse**
- [ ] Comportement si l'écran s'éteint au milieu de l'action ?
- [ ] Comportement si l'app est tuée par le système ?
- [ ] Une migration de schéma est-elle nécessaire, et testée ?

**Interface**
- [ ] Cibles ≥ 56 px, atteignables au pouce d'une seule main ?
- [ ] Lisible à bout de bras, en salle, écran à luminosité moyenne ?
- [ ] Aucune valeur de couleur ou d'espacement en dur ?

## 8. Gestion des dépendances

Toute nouvelle dépendance exige une réponse écrite à trois questions :
1. Combien pèse-t-elle une fois gzippée ?
2. Combien de lignes coûterait l'équivalent maison ?
3. Que se passe-t-il si elle est abandonnée ?

Si l'équivalent maison tient en moins de 100 lignes, on l'écrit. Une dépendance ajoutée sans ADR est une dette non tracée.

## 9. Gestion des migrations Dexie

1. Ne jamais modifier une `version(n)` déjà livrée sur le téléphone.
2. Toujours ajouter une `version(n+1)` avec un `upgrade()` explicite.
3. Écrire le test de migration **avant** le code de migration.
4. Exporter ses données réelles avant de tester une migration en local.
5. Un champ n'est jamais supprimé, il est déprécié et ignoré.

## 10. Rythme de travail

Ce projet est un side project mené en soirée. La discipline utile n'est pas la vélocité, c'est la **continuité**.

- Une soirée = une story livrée et fusionnée. Pas de travail à moitié qui traîne d'une semaine sur l'autre.
- Le lundi, mercredi et vendredi sont des jours de séance : ce sont des jours de **test**, pas de développement.
- Toute friction constatée en salle est notée le soir même dans le backlog, avec la date. Ce carnet de frictions prime sur toute idée de fonctionnalité imaginée au bureau.
- Si une semaine passe sans commit, relire le §10 du document produit (risques) plutôt que d'ajouter une fonctionnalité.

## 11. Journal des décisions

Toute décision qui sera difficile à revenir en arrière fait l'objet d'un ADR dans `docs/adr/`, numéroté, à partir du template fourni. Une décision non écrite sera rejouée dans trois mois — et probablement tranchée dans l'autre sens.
