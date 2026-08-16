import type { MuscleFatigue } from '../../domain/progress';
import { MUSCLE_LABEL_FR } from '../../lib/muscleLabels';
import styles from './MuscleFatigueBars.module.css';

function dayLabel(days: number): string {
  return days === 0 ? "aujourd'hui" : `il y a ${days} j`;
}

export function MuscleFatigueBars({ fatigue }: { fatigue: MuscleFatigue[] }) {
  if (fatigue.length === 0) {
    return <p className={styles.empty}>Pas encore assez de séances pour estimer la fatigue.</p>;
  }

  return (
    <div className={styles.bars}>
      {fatigue.map((f) => (
        <div key={f.muscle} className={styles.row}>
          <span className={styles.label}>{MUSCLE_LABEL_FR[f.muscle]}</span>
          <div className={styles.track}>
            <div
              className={styles.fill}
              data-testid="fatigue-fill"
              style={{ width: `${f.fatiguePct ?? 0}%` }}
            />
          </div>
          <span className={styles.value}>
            {f.fatiguePct != null && <span className="tabular">{f.fatiguePct}% · </span>}
            <span className={styles.valueMeta}>{dayLabel(f.daysSinceLastTrained)}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
