import type { LiftRow } from '../../domain/progress';
import { formatDeltaKg, formatWeightKg } from '../../domain/progress';
import styles from './LiftsList.module.css';

export function LiftsList({ lifts }: { lifts: LiftRow[] }) {
  if (lifts.length === 0) {
    return <p className={styles.empty}>Aucun mouvement chargé.</p>;
  }

  return (
    <ul className={styles.list}>
      {lifts.map((lift) => (
        <li key={lift.exerciseId} className={styles.row}>
          <span className={styles.name}>{lift.name}</span>
          <span className={`tabular ${styles.value}`}>
            {lift.lastReps} × {formatWeightKg(lift.lastWeightKg)} kg
          </span>
          <span className={`tabular ${styles.delta}`}>
            {lift.deltaKg == null ? '—' : formatDeltaKg(lift.deltaKg)}
          </span>
        </li>
      ))}
    </ul>
  );
}
