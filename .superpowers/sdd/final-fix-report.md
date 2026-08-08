# Final fix report — program editor

## Correctifs

- Les éléments seed avec un `exerciseId` et un libellé vide récupèrent le nom du catalogue au chargement, dans le bouton du sélecteur et à l’enregistrement.
- Le gainage accepte désormais des séries avec une durée positive, propose un mode de prescription en secondes et conserve cette durée à l’enregistrement.
- Les prescriptions `sets + durationSec` sont affichées sous la forme `3×45 s`, suivie du repos éventuel.
- Le prochain ordre ignore les éléments réservés à partir de `1000`, afin d’insérer les nouveaux exercices avant les étirements.

## Vérification

- `npm run test` : 12 fichiers, 67 tests réussis.
- `npm run typecheck` : réussi.
