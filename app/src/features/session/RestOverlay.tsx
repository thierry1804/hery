import { formatMmSs } from '../../lib/date';
import { useRestTimer } from './useRestTimer';
import { BigButton } from '../../ui/BigButton';
import styles from './RestOverlay.module.css';

interface Props {
  restEndsAt: number;
  totalSec: number;
  nextHint?: string;
  onExtend: (extraSec: number) => void;
  onSkip: () => void;
  onComplete: () => void;
}

const SIZE = 300;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2 - 4;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function RestOverlay({ restEndsAt, totalSec, nextHint, onExtend, onSkip, onComplete }: Props) {
  const { remainingSec, remainingMs } = useRestTimer(restEndsAt, onComplete);
  const totalMs = Math.max(totalSec, 0.001) * 1000;
  const progress = Math.min(1, Math.max(0, remainingMs / totalMs));
  const elapsed = 1 - progress;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const urgent = remainingSec > 0 && remainingSec <= 10;
  const [min, sec] = formatMmSs(remainingSec).split(':');

  // Plus le repos avance, plus le fond s'anime (durée plus courte = tempo plus vif).
  const breathSec = urgent ? 1.4 : 2.2 + progress * 1.6;
  const driftSec = urgent ? 6 : 10 + progress * 6;
  const pulseSec = urgent ? 1.6 : 2.4 + progress * 1.2;

  return (
    <div
      className={`${styles.overlay} ${urgent ? styles.overlayUrgent : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Repos ${formatMmSs(remainingSec)}${nextHint ? `, ensuite ${nextHint}` : ''}`}
    >
      <div className={styles.backdrop} aria-hidden="true">
        <div
          className={styles.wash}
          style={{
            opacity: 0.35 + elapsed * 0.35,
            animationDuration: `${driftSec}s`,
          }}
        />
        <div
          className={styles.glowTrack}
          style={{
            opacity: 0.45 + progress * 0.5,
            transform: `translate(-50%, -10%) scale(${0.65 + progress * 0.5})`,
          }}
        >
          <div className={styles.glowFloat} style={{ animationDuration: `${breathSec}s` }}>
            <div className={styles.glow} style={{ animationDuration: `${breathSec}s` }} />
          </div>
        </div>
        <div
          className={styles.glowTrackDrift}
          style={{
            opacity: 0.25 + elapsed * 0.4,
            animationDuration: `${driftSec}s`,
          }}
        >
          <div className={styles.glowDrift} style={{ animationDuration: `${breathSec * 1.2}s` }} />
        </div>
        <div
          className={styles.glowTrackSecondary}
          style={{
            opacity: 0.5 + elapsed * 0.4,
            transform: `translateX(-50%) scale(${0.85 + elapsed * 0.35})`,
          }}
        >
          <div className={styles.glowSecondary} style={{ animationDuration: `${breathSec * 1.4}s` }} />
        </div>
        <div className={styles.pulseField}>
          <span className={styles.pulseRing} style={{ animationDuration: `${pulseSec}s` }} />
          <span
            className={`${styles.pulseRing} ${styles.pulseRingDelay}`}
            style={{ animationDuration: `${pulseSec}s`, animationDelay: `${pulseSec / 2}s` }}
          />
        </div>
      </div>

      <div className={styles.stage}>
        {nextHint ? <p className={styles.nextHint}>Ensuite : {nextHint}</p> : null}

        <div className={styles.ringWrap}>
          <div className={styles.ringPlate} aria-hidden="true" />
          <svg className={styles.ring} width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
            <circle
              className={styles.ringTrack}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              strokeWidth={STROKE}
            />
            <circle
              className={styles.ringProgress}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              strokeWidth={STROKE}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className={styles.ringCenter}>
            <span className={styles.label}>Repos</span>
            <div className={`tabular ${styles.countdown}`} aria-live="polite">
              <span className={styles.minutes}>{min}</span>
              <span className={styles.colon}>:</span>
              <span className={styles.seconds}>{sec}</span>
            </div>
            <span className={styles.total}>sur {formatMmSs(totalSec)}</span>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <BigButton variant="primary" onClick={() => onExtend(30)}>
          +30 s
        </BigButton>
        <BigButton variant="ghost" onClick={onSkip}>
          Passer
        </BigButton>
      </div>
    </div>
  );
}
