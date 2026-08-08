export type IllustrationKey =
  | 'legPress'
  | 'legCurl'
  | 'legExtension'
  | 'chestPress'
  | 'chestFly'
  | 'inclinePress'
  | 'latPulldown'
  | 'seatedRow'
  | 'shoulderPress'
  | 'lateralRaise'
  | 'facePull'
  | 'bicepsCurl'
  | 'tricepsPushdown'
  | 'dips'
  | 'plank'
  | 'sidePlank'
  | 'crunch'
  | 'kneeRaise'
  | 'squat'
  | 'lunge'
  | 'rdl'
  | 'cardioWalk'
  | 'cardioBike'
  | 'cardioRow'
  | 'generic';

/** Mapping stable exerciseId → illustration. Fallback: generic. */
export const ILLUSTRATION_BY_EXERCISE: Record<string, IllustrationKey> = {
  'ex-presse-cuisses': 'legPress',
  'ex-leg-curl': 'legCurl',
  'ex-leg-curl-assis': 'legCurl',
  'ex-leg-extension': 'legExtension',
  'ex-developpe-couche-machine': 'chestPress',
  'ex-developpe-couche-halteres': 'chestPress',
  'ex-developpe-incline-halteres': 'inclinePress',
  'ex-ecartes-machine': 'chestFly',
  'ex-tirage-poitrine': 'latPulldown',
  'ex-tirage-nuque': 'latPulldown',
  'ex-tirage-horizontal': 'seatedRow',
  'ex-rowing-assis-poulie': 'seatedRow',
  'ex-developpe-epaules-machine': 'shoulderPress',
  'ex-developpe-epaules-halteres': 'shoulderPress',
  'ex-elevations-laterales': 'lateralRaise',
  'ex-elevations-laterales-poulie': 'lateralRaise',
  'ex-face-pull': 'facePull',
  'ex-oiseau-halteres': 'facePull',
  'ex-curl-biceps': 'bicepsCurl',
  'ex-curl-poulie': 'bicepsCurl',
  'ex-curl-marteau': 'bicepsCurl',
  'ex-curl-pupitre': 'bicepsCurl',
  'ex-extension-triceps-poulie': 'tricepsPushdown',
  'ex-extension-corde': 'tricepsPushdown',
  'ex-dips-assistes': 'dips',
  'ex-gainage': 'plank',
  'ex-gainage-lateral': 'sidePlank',
  'ex-crunch-cable': 'crunch',
  'ex-crunch-machine': 'crunch',
  'ex-releves-genoux': 'kneeRaise',
  'ex-squat-smith': 'squat',
  'ex-goblet-squat': 'squat',
  'ex-fentes-marchees': 'lunge',
  'ex-fentes-statiques': 'lunge',
  'ex-souleve-terre-roumain': 'rdl',
  'ex-souleve-terre-halteres': 'rdl',
  'ex-marche-inclinee': 'cardioWalk',
  'ex-tapis': 'cardioWalk',
  'ex-velo': 'cardioBike',
  'ex-elliptique': 'cardioBike',
  'ex-rameur': 'cardioRow',
};

export function illustrationKeyFor(exerciseId: string | null | undefined): IllustrationKey {
  if (!exerciseId) return 'generic';
  return ILLUSTRATION_BY_EXERCISE[exerciseId] ?? 'generic';
}
