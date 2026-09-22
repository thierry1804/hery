import { useState } from 'react';
import type { LiftRow } from '../../domain/progress';
import { formatDeltaKg, formatWeightKg } from '../../domain/progress';
import styles from './LiftsList.module.css';

const COLLAPSED_COUNT = 8;

export function LiftsList({ lifts }: { lifts: LiftRow[] }) {
  const [expanded, setExpanded] = useState(false);

  if (lifts.length === 0) {
    return <p className={styles.empty}>Aucun mouvement chargé.</p>;
  }

  const visible = expanded ? lifts : lifts.slice(0, COLLAPSED_COUNT);
  const hidden = lifts.length - visible.length;

  return (
    <>
      <ul className={styles.list}>
        {visible.map((lift) => (
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
      {hidden > 0 ? (
        <button type="button" className={styles.more} onClick={() => setExpanded(true)}>
          Voir tout ({lifts.length})
        </button>
      ) : null}
    </>
  );
}
