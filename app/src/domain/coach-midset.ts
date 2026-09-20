import type { SetKind } from './set-kind';

export function midSetHint(input: {
  rir: number | null;
  reps: number;
  maxReps: number;
  setKind: SetKind;
}): string | null {
  if (input.setKind !== 'work') return null;
  if (input.rir === 0) {
    return 'Ne monte pas la charge. Prochaine série : vise la plage sans aller à l’échec.';
  }
  if (input.rir != null && input.rir >= 3 && input.reps >= input.maxReps) {
    return 'Série facile. Tu peux confirmer la charge ou augmenter légèrement en fin d’exercice.';
  }
  return null;
}
