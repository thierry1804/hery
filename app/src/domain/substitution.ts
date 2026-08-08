import type { Exercise } from '../db/schema';

const MAX_ALTERNATIVES = 3;

// F-S07 / RG-10: propose jusqu'a 3 alternatives de meme fonction, tracabilite via substitutedFromId.
export function pickAlternatives(exercise: Exercise, catalogue: Exercise[]): Exercise[] {
  const byId = new Map(catalogue.map((e) => [e.id, e]));
  return exercise.alternativeIds
    .map((id) => byId.get(id))
    .filter((e): e is Exercise => e != null)
    .slice(0, MAX_ALTERNATIVES);
}
