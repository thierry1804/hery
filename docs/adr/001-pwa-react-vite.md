# ADR-001 — PWA React + Vite plutôt qu'une application native

- **Statut** : accepté
- **Date** : 2026-08-08

## Contexte

L'application doit tourner sur un téléphone, en salle, dans la poche, avec un timer
fiable et une saisie très rapide. Le développeur est l'unique utilisateur et travaille
en soirée, sur un temps contraint. La compétence disponible est React / TypeScript.

## Options envisagées

| Option | Avantages | Inconvénients |
|---|---|---|
| PWA React + Vite | Compétence existante, déploiement en 2 min, pas de store, itération en salle le soir même | Notifications limitées sur iOS, pas de vibration sur Safari, pas d'accès natif à la santé |
| React Native / Expo | Meilleure intégration système, notifications et haptique fiables, accès HealthKit | Chaîne de build plus lourde, cycle de livraison plus long, apprentissage supplémentaire |
| Native (Kotlin / Swift) | Expérience optimale | Hors de portée en side project du soir |

## Décision

Le produit est développé comme une **PWA installable, en React 19 + Vite + TypeScript**.

## Justification

Le risque numéro un du projet est temporel : la V0 doit être en service avant la fenêtre
de décrochage (semaines 4 à 8). Le facteur décisif est donc le **délai jusqu'au premier
usage réel**, pas la qualité maximale de l'intégration système. La PWA permet de tester
une modification en salle le soir même, sans build de store ni recompilation.

Les limites de la PWA sont réelles mais contournables dans ce cas précis : les écouteurs
filaires sont déjà branchés pendant les séances, ce qui fait du **son** un canal d'alerte
plus fiable que la vibration.

## Conséquences

**Positives** — livraison rapide, itération quotidienne, aucun coût de distribution,
une seule base de code, installation depuis un simple lien.

**Négatives** — pas d'accès à la santé du téléphone, notifications iOS conditionnées à
l'installation sur l'écran d'accueil, pas d'application de montre possible sans changer
de modèle.

**À réévaluer si** — le timer de repos s'avère non fiable en usage réel malgré les
contournements décrits dans l'architecture technique §5.1, ou si une montre connectée
devient un besoin réel.
