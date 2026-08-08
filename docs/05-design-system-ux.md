# 05 — Design system & UX

**Projet** : HERY
**Version** : 1.0 — 8 août 2026

---

## 1. Le brief réel

L'interface est utilisée **debout, à bout de bras, une main occupée, sous une lumière artificielle, avec les doigts moites et 45 secondes de repos qui défilent.** Ce n'est pas une app qu'on consulte : c'est un outil qu'on manipule entre deux efforts.

Tout ce qui suit en découle. Une décision esthétique qui dégrade la lisibilité à un mètre est une mauvaise décision, quelle que soit sa qualité graphique.

## 2. Direction visuelle — « Fonte et magnésie »

Le vocabulaire visuel vient de la matière de la salle : la fonte des disques, le gris du sol caoutchouc, et la **magnésie** — cette poudre blanche qui marque les mains, la barre et le banc.

Le parti pris : **l'accent n'est pas une couleur vive, c'est le blanc de la magnésie.** Là où toutes les apps de fitness posent un vert acide ou un orange sur du noir, ici la donnée qui compte — la charge — est le seul élément vraiment lumineux de l'écran. Le reste est de la fonte : sombre, mat, sans éclat.

**L'élément signature** : la validation d'une série ne coche pas une case, elle **laisse une marque de craie**. Un trait de magnésie tracé à main levée sur la ligne de la série, comme sur un mur de salle. C'est le seul moment d'animation de l'application, et il arrive 25 fois par séance.

### Palette

| Token | Valeur | Usage |
|---|---|---|
| `--fonte-900` | `#131519` | Fond général |
| `--fonte-700` | `#1E222A` | Surfaces, cartes, blocs |
| `--fonte-500` | `#2E3540` | Bordures, séparateurs, états inactifs |
| `--fonte-300` | `#6B7684` | Texte secondaire, labels |
| `--magnesie` | `#F4F2EC` | Texte principal, **chiffres de charge**, marque de validation |
| `--laiton` | `#E0A33A` | Records personnels, jalons, célébration — **rare** |
| `--acier` | `#6E93B8` | Repos, états froids, cardio |
| `--sang` | `#C0453C` | Erreur, régression, alerte — **très rare** |

Mode sombre exclusif. Pas de thème clair : les salles sont sombres, les écrans OLED économisent la batterie, et un seul thème signifie moitié moins de bugs visuels.

### Typographie

| Rôle | Police | Usage |
|---|---|---|
| Chiffres & titres | **Archivo** (variable, axe *expanded*), graisse 700-800 | Charges, répétitions, tonnage. Chiffres tabulaires obligatoires |
| Interface | **Public Sans** | Labels, listes, textes |

Échelle : `12 / 14 / 16 / 20 / 28 / 48 / 72`.
La charge affichée pendant la séance est en **72 px**. Elle doit être lisible sans lunettes, à bout de bras, en une fraction de seconde. C'est le seul élément de l'écran qui a droit à cette taille.

### Espacement et formes

Grille de 4 px. Rayons : `0` pour les blocs de données (aspect « plaque »), `8 px` pour les boutons, `999 px` uniquement pour les pastilles d'état. Aucune ombre portée — les niveaux sont exprimés par la valeur de gris, comme du métal empilé.

## 3. Règles d'interaction non négociables

| # | Règle |
|---|---|
| UX-01 | **Aucun clavier pendant une séance.** Steppers uniquement |
| UX-02 | **Aucun scroll sur l'écran de séance active.** Tout tient dans la hauteur d'écran |
| UX-03 | Cible tactile ≥ **56 px** ; bouton `VALIDER` ≥ **72 px**, pleine largeur, en zone basse |
| UX-04 | Les actions destructrices sont hors de la zone du pouce |
| UX-05 | Aucun indicateur de chargement pendant la séance : l'écriture est optimiste |
| UX-06 | Toute valeur est pré-remplie ; l'utilisateur corrige, il ne saisit jamais de zéro |
| UX-07 | Un tap = un retour immédiat : visuel, haptique et sonore |
| UX-08 | La barre d'onglets disparaît en séance active |
| UX-09 | Aucune modale pendant la série en cours ; les questions sont posées entre les exercices |
| UX-10 | Toute donnée facultative est demandée **hors séance** |

## 4. Écran de séance active

```
┌──────────────────────────────────────┐
│  ← Séance A            Exo 3 / 9  ⏱  │  40px  contexte minimal
├──────────────────────────────────────┤
│  PRESSE À CUISSES                    │  28px  Archivo 800
│  Dernière fois : 3×12 @ 80 kg        │  14px  fonte-300
│  Siège 4 · cale-cuisses 3            │  12px  fonte-300
├──────────────────────────────────────┤
│  ╱ Série 1        12 × 80 kg         │  ← marque de magnésie
│  ╱ Série 2        12 × 80 kg         │
│  ▸ Série 3                           │  ← ligne active, magnésie
├──────────────────────────────────────┤
│                                      │
│        −2,5   82,5 kg   +2,5         │  72px  la charge domine
│         −1     12 reps   +1          │  28px
│                                      │
│   ┌──────────────────────────────┐   │
│   │          VALIDER             │   │  72px de haut
│   └──────────────────────────────┘   │
│   [ Remplacer ]        [ Noter ]     │  actions secondaires
└──────────────────────────────────────┘
```

**Séquence de validation** (≤ 400 ms perçus) :
`tap` → vibration 15 ms → trait de magnésie tracé sur la ligne (180 ms) → la ligne suivante devient active, pré-remplie → l'overlay de repos monte depuis le bas.

### Overlay de repos

Chiffre de décompte en 72 px, couleur `--acier`, cercle de progression. Deux actions : `+30 s` et `Passer`. À zéro : son + notification + vibration, et l'overlay se retire de lui-même.

Reste lisible écran verrouillé via la notification — le décompte n'est **jamais** calculé par un compteur en mémoire (voir architecture technique §5.1).

## 5. Motivation — ce qui est retenu et ce qui est écarté

| Retenu | Pourquoi ça tient dans la durée |
|---|---|
| **Heatmap corporelle** du volume sur 7 jours | Lecture instantanée de l'effort réel, purement factuelle |
| **Niveaux de force** relatifs au poids de corps | Objectif atteignable, objectivement mérité, non comparatif |
| **Records personnels** signalés en `--laiton` | Rareté = valeur ; un PR reste un événement |
| **Objectif hebdomadaire** 3 séances | Compatible avec le repos, qui fait partie du programme |
| **Jalons concrets** : premier 100 kg à la presse, 50e séance, 1 tonne dans une séance | Ancrés dans la réalité de la pratique |
| **Tonnage en équivalents** : « 1,8 tonne cette semaine » | Absurde, mémorable, sans effet pervers |
| **Carte de séance** générée en fin de parcours | Clôture rituelle, 3 secondes, aucune obligation |

| Écarté | Pourquoi |
|---|---|
| Série de jours consécutifs | Pénalise le repos — contresens physiologique |
| XP, niveaux génériques, avatars | Motivation artificielle épuisée en 3 semaines |
| Classements, comparaison sociale | Pousse mécaniquement au volume et à la blessure |
| Badges décoratifs sans contrepartie réelle | Dévalue les jalons qui, eux, comptent |
| Notification quotidienne d'engagement | Seul le timer de repos a le droit de notifier |

## 6. Ton de l'interface

Verbes à l'infinitif ou à l'impératif, phrases courtes, aucun enthousiasme de commande.

| Contexte | À écrire | À ne pas écrire |
|---|---|---|
| Bouton principal | `VALIDER` | `Enregistrer ma série` |
| Record battu | `Record — 82,5 kg` | `Bravo, incroyable performance !` |
| Écran vide | `Aucune séance. La prochaine est mercredi.` | `Oups, rien à afficher ici…` |
| Suggestion du coach | `+2,5 kg — 3×12 atteint deux fois de suite` | `L'IA recommande d'augmenter` |
| Séance manquée | `2 séances cette semaine sur 3` | `Tu as manqué ta séance !` |

Aucun message ne culpabilise, aucun message ne félicite au-delà du fait constaté. Le chiffre parle mieux que l'adjectif.

## 7. Accessibilité et robustesse

- Contraste minimum 7:1 pour tout texte de données (`--magnesie` sur `--fonte-900` : ~15:1).
- Focus clavier visible partout — utile au développement, indispensable en cas d'usage tablette.
- `prefers-reduced-motion` respecté : la marque de magnésie apparaît sans être tracée.
- Aucune information portée par la couleur seule (un PR porte un libellé, pas seulement la teinte `--laiton`).
- Interface fonctionnelle avec la police système si les webfonts ne chargent pas.
