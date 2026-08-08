# ADR-003 — Coach par moteur de règles déterministe, pas par LLM

- **Statut** : accepté
- **Date** : 2026-08-08

## Contexte

Le coaching automatique — suggestion de charge, détection de plateau, proposition de
décharge — est demandé dès la V1. Deux approches sont possibles : un moteur de règles
codé en dur, ou l'appel à un modèle de langage.

## Options envisagées

| Option | Avantages | Inconvénients |
|---|---|---|
| Moteur de règles déterministe | Instantané, hors-ligne, testable unitairement, explicable, gratuit, reproductible | Rigide, ne couvre que les cas prévus |
| LLM via API | Souple, formulations naturelles, cas non prévus couverts | Réseau requis, latence, coût, non reproductible, non testable, suggestions non auditables sur un sujet à risque de blessure |
| Hybride : règles + reformulation LLM | Le meilleur des deux | Complexité supplémentaire, à ne pas engager tant que les règles ne sont pas stabilisées |

## Décision

Le coach est un **moteur de règles pur** : `evaluate(historique, contexte) → Suggestion[]`,
sans effet de bord, sans réseau. Les règles C-01 à C-07 sont définies dans l'architecture
fonctionnelle §D7.

## Justification

Les décisions d'entraînement reposent sur des heuristiques simples et bien établies —
progression double, plafond de progression, décharge après stagnation. Elles se codent
en quelques dizaines de lignes et se testent exhaustivement.

Trois arguments décisifs :

1. **Explicabilité.** « +2,5 kg car 3×12 atteint deux fois de suite » est vérifiable par
   l'utilisateur. Une réponse de LLM ne l'est pas.
2. **Sécurité.** Le sujet touche au risque de blessure chez un pratiquant de 51 ans en
   reprise. Un garde-fou codé (C-07 : jamais plus de +10 % sur 4 semaines) est une
   garantie ; une consigne dans un prompt n'en est pas une.
3. **Disponibilité.** Une suggestion doit s'afficher instantanément, hors-ligne, en salle.

## Conséquences

**Positives** — instantané, gratuit, testable, auditable, fonctionne hors-ligne,
suggestions toujours justifiées par une règle nommée.

**Négatives** — ne gère que les situations anticipées ; les formulations sont figées ;
aucune adaptation aux cas atypiques.

**À réévaluer si** — le moteur de règles est stabilisé après plusieurs mois d'usage et
qu'un besoin apparaît sur des variations d'exercices ou des reformulations. Dans ce cas,
le LLM viendrait **en complément** du moteur, jamais en remplacement : les garde-fous
resteraient codés.
