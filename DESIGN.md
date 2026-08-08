# Design System — HERY

## Visual Theme

**Direction:** Fonte et magnésie. Fond sombre mat (fonte), accent principal = blanc cassé de la magnésie. Mode sombre exclusif. Signature : marque de craie à la validation d’une série.

**Mood:** Direct, mat, agréable. Outil de salle lisible à bout de bras, une main, lumière artificielle.

## Colors

| Role | Token | Value | Usage |
|---|---|---|---|
| Background | `--fonte-900` | `#131519` | Fond app |
| Surface | `--fonte-700` | `#1E222A` | Plaques, nav, sheets |
| Border / inactive | `--fonte-500` | `#2E3540` | Séparateurs, états inactifs |
| Secondary text | `--fonte-300` | `#6B7684` | Labels, meta |
| Primary / data | `--magnesie` | `#F4F2EC` | Texte principal, charges, CTA |
| Rare accent | `--laiton` | `#E0A33A` | Records, jalons |
| Cold state | `--acier` | `#6E93B8` | Repos, cardio |
| Danger | `--sang` | `#C0453C` | Erreur, alerte, import destructif |

Color strategy: **Restrained** (neutrals tinted + magnésie as light carrier; laiton/acier/sang rare).

## Typography

- **Display / chiffres:** Archivo (expanded ~112), weight 700–800, tabular nums. Charges en séance : 72px.
- **UI:** Public Sans, 400–700.
- Scale: 12 / 14 / 16 / 20 / 28 / 48 / 72.
- Fallback: system-ui if webfonts fail.

## Layout

- Grid 4px (`--space-1` … `--space-8`).
- Data plates: `border-radius: 0` (`--radius-block`).
- Buttons: 8px. Status pills: 999px only for true status chips.
- No drop shadows; elevation via gray stack.
- Bottom nav fixed; hidden on `/session/*`.
- Safe areas respected (`env(safe-area-inset-*)`).
- Active session: no scroll on strength input screen; everything fits the viewport.

## Components

- **BigButton:** full width, min 56px (primary 72px). Variants: default, primary (magnésie), ghost, danger.
- **Stepper:** ± controls, no keyboard in session.
- **BottomNav:** 3 tabs, active = magnésie + inset top bar.
- **Sheet:** bottom sheet, radius 8px top only.
- **ChalkMark:** SVG path on validated sets; instant if `prefers-reduced-motion`.
- **RestOverlay:** full-screen, acier countdown + progress ring, +30s / Passer.

## Interaction

- Tap targets ≥ 56px; VALIDER ≥ 72px thumb zone.
- Optimistic writes in session; no spinners mid-set.
- Feedback: visual + haptic on validate.
- Focus-visible: 2px magnésie outline.
- Motion: 150–220ms, ease-out expo; no bounce; respect reduced motion.

## Do / Don’t

**Do:** pré-remplir; verbes courts; plaques plates; charge dominante en 72px; faits sans culpabilité.

**Don’t:** neon fitness accents; XP/streaks; cards empilées décoratives; glassmorphism; gradient text; side-stripe accents; keyboard during sets; modals mid-set.
