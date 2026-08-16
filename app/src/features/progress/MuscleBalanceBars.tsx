import type { MuscleVolume } from '../../domain/progress';
import { formatTonnageKg } from '../../domain/progress';
import { MUSCLE_LABEL_FR } from '../../lib/muscleLabels';
import styles from './MuscleBalanceBars.module.css';

export function MuscleBalanceBars({ balance }: { balance: MuscleVolume[] }) {
  if (balance.length === 0) {
    return <p className={styles.empty}>Aucune série cette semaine.</p>;
  }

  const max = Math.max(...balance.map((b) => b.tonnageKg), 1);

  return (
    <div className={styles.bars}>
      {balance.map((b) => (
        <div key={b.muscle} className={styles.row}>
          <span className={styles.label}>{MUSCLE_LABEL_FR[b.muscle]}</span>
          <div className={styles.track}>
            <div
              className={styles.fill}
              data-testid="muscle-fill"
              style={{
                width: `${(b.tonnageKg / max) * 100}%`,
                minWidth: b.tonnageKg > 0 ? '4px' : undefined,
              }}
            />
          </div>
          <span className={`tabular ${styles.value}`}>{formatTonnageKg(b.tonnageKg)}</span>
        </div>
      ))}
    </div>
  );
}
