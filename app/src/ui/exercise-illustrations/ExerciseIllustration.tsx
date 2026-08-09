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
  legPress: `${import.meta.env.BASE_URL}exercises/leg-press.webp`,
  legCurl: `${import.meta.env.BASE_URL}exercises/leg-curl.webp`,
  legExtension: `${import.meta.env.BASE_URL}exercises/leg-extension.webp`,
  chestPress: `${import.meta.env.BASE_URL}exercises/chest-press.webp`,
  chestFly: `${import.meta.env.BASE_URL}exercises/chest-fly.webp`,
  inclinePress: `${import.meta.env.BASE_URL}exercises/incline-press.webp`,
  latPulldown: `${import.meta.env.BASE_URL}exercises/lat-pulldown.webp`,
  seatedRow: `${import.meta.env.BASE_URL}exercises/seated-row.webp`,
  shoulderPress: `${import.meta.env.BASE_URL}exercises/shoulder-press.webp`,
  lateralRaise: `${import.meta.env.BASE_URL}exercises/lateral-raise.webp`,
  facePull: `${import.meta.env.BASE_URL}exercises/face-pull.webp`,
  bicepsCurl: `${import.meta.env.BASE_URL}exercises/biceps-curl.webp`,
  tricepsPushdown: `${import.meta.env.BASE_URL}exercises/triceps-pushdown.webp`,
  dips: `${import.meta.env.BASE_URL}exercises/dips.webp`,
  plank: `${import.meta.env.BASE_URL}exercises/plank.webp`,
  sidePlank: `${import.meta.env.BASE_URL}exercises/side-plank.webp`,
  crunch: `${import.meta.env.BASE_URL}exercises/crunch.webp`,
  kneeRaise: `${import.meta.env.BASE_URL}exercises/knee-raise.webp`,
  squat: `${import.meta.env.BASE_URL}exercises/squat.webp`,
  lunge: `${import.meta.env.BASE_URL}exercises/lunge.webp`,
  rdl: `${import.meta.env.BASE_URL}exercises/rdl.webp`,
  cardioWalk: `${import.meta.env.BASE_URL}exercises/cardio-walk.webp`,
  cardioBike: `${import.meta.env.BASE_URL}exercises/cardio-bike.webp`,
  cardioRow: `${import.meta.env.BASE_URL}exercises/cardio-row.webp`,
  generic: `${import.meta.env.BASE_URL}exercises/generic.webp`,
};

export function ExerciseIllustration({ exerciseId, name, variant, compact }: Props) {
  const key = illustrationKeyFor(exerciseId);
  const mode = variant ?? (compact ? 'compact' : 'hero');
  // thumb/compact : image décorative à côté du libellé (évite de polluer le nom accessible)
  const alt =
    mode === 'thumb' || mode === 'compact'
      ? ''
      : name
        ? `Illustration : ${name}`
        : 'Illustration exercice';

  return (
    <div className={`${styles.wrap} ${styles[mode]}`}>
      <img className={styles.image} src={SRC[key]} alt={alt} decoding="async" />
    </div>
  );
}
