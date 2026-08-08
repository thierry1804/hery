import type { Mover } from '../../domain/progress';
import { formatWeightKg } from '../../domain/progress';
import styles from './MoversList.module.css';

export function MoversList({ movers }: { movers: Mover[] }) {
  if (movers.length === 0) return null;
  return (
    <ul className={styles.list}>
      {movers.map((m) => (
        <li key={m.exerciseId} className={styles.row}>
          <span className={styles.name}>{m.name}</span>
          <span className={`tabular ${styles.value}`}>
            {formatWeightKg(m.prevMaxKg)} → {formatWeightKg(m.currMaxKg)} kg
            {m.hasRecentPr ? <span className={styles.pr}> · Record</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
