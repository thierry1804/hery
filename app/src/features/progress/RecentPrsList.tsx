import type { RecentPr } from '../../domain/progress';
import { formatWeightKg } from '../../domain/progress';
import styles from './RecentPrsList.module.css';

export function RecentPrsList({ prs }: { prs: RecentPr[] }) {
  if (prs.length === 0) {
    return <p className={styles.empty}>Aucun record récent.</p>;
  }

  return (
    <ul className={styles.list}>
      {prs.map((pr) => (
        <li key={pr.setLogId} className={styles.row}>
          <span className={styles.name}>{pr.name}</span>
          <span className={`tabular ${styles.value}`}>
            {pr.reps} × {formatWeightKg(pr.weightKg)} kg
          </span>
          <span className={styles.record}>Record</span>
        </li>
      ))}
    </ul>
  );
}
