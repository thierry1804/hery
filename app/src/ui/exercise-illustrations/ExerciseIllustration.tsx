import { illustrationKeyFor, type IllustrationKey } from './keys';
import styles from './ExerciseIllustration.module.css';

interface Props {
  exerciseId: string | null | undefined;
  name?: string;
  /** hero = bandeau ; heroDense = bandeau court ; compact = pastille ; thumb = liste */
  variant?: 'hero' | 'heroDense' | 'compact' | 'thumb';
  /** @deprecated utiliser variant="compact" */
  compact?: boolean;
}

const SRC: Record<IllustrationKey, string> = {
  legPress: '/exercises/leg-press.webp',
  legCurl: '/exercises/leg-curl.webp',
  legExtension: '/exercises/leg-extension.webp',
  chestPress: '/exercises/chest-press.webp',
  chestFly: '/exercises/chest-fly.webp',
  inclinePress: '/exercises/incline-press.webp',
  latPulldown: '/exercises/lat-pulldown.webp',
  seatedRow: '/exercises/seated-row.webp',
  shoulderPress: '/exercises/shoulder-press.webp',
  lateralRaise: '/exercises/lateral-raise.webp',
  facePull: '/exercises/face-pull.webp',
  bicepsCurl: '/exercises/biceps-curl.webp',
  tricepsPushdown: '/exercises/triceps-pushdown.webp',
  dips: '/exercises/dips.webp',
  plank: '/exercises/plank.webp',
  sidePlank: '/exercises/side-plank.webp',
  crunch: '/exercises/crunch.webp',
  kneeRaise: '/exercises/knee-raise.webp',
  squat: '/exercises/squat.webp',
  lunge: '/exercises/lunge.webp',
  rdl: '/exercises/rdl.webp',
  cardioWalk: '/exercises/cardio-walk.webp',
  cardioBike: '/exercises/cardio-bike.webp',
  cardioRow: '/exercises/cardio-row.webp',
  generic: '/exercises/generic.webp',
};

export function ExerciseIllustration({ exerciseId, name, variant, compact }: Props) {
  const key = illustrationKeyFor(exerciseId);
  const label = name ? `Illustration : ${name}` : 'Illustration exercice';
  const mode = variant ?? (compact ? 'compact' : 'hero');

  return (
    <div className={`${styles.wrap} ${styles[mode]}`}>
      <img className={styles.image} src={SRC[key]} alt={label} decoding="async" />
    </div>
  );
}
