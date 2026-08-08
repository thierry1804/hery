import { formatMmSs } from '../../lib/date';
import { useRestTimer } from './useRestTimer';
import { BigButton } from '../../ui/BigButton';
import styles from './RestOverlay.module.css';

interface Props {
  restEndsAt: number;
  onExtend: (extraSec: number) => void;
  onSkip: () => void;
  onComplete: () => void;
}

export function RestOverlay({ restEndsAt, onExtend, onSkip, onComplete }: Props) {
  const remaining = useRestTimer(restEndsAt, onComplete);

  return (
    <div className={styles.overlay}>
      <span className={styles.label}>Repos</span>
      <span className={`${styles.countdown} tabular`}>{formatMmSs(remaining)}</span>
      <div className={styles.actions}>
        <BigButton variant="ghost" onClick={() => onExtend(30)}>
          +30 s
        </BigButton>
        <BigButton variant="ghost" onClick={onSkip}>
          Passer
        </BigButton>
      </div>
    </div>
  );
}
