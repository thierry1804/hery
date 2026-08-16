import type { StreakStats } from '../../domain/progress';
import styles from './StreakSummary.module.css';

export function StreakSummary({ streak }: { streak: StreakStats }) {
  return (
    <div className={styles.stats}>
      <p className={styles.stat}>
        <span className={`tabular ${styles.statValue}`}>{streak.currentStreakWeeks}</span>
        <span className={styles.statLabel}>
          semaine{streak.currentStreakWeeks === 1 ? '' : 's'} d&apos;affilée
        </span>
      </p>
      <p className={styles.stat}>
        <span className={`tabular ${styles.statValue}`}>{streak.activeDaysThisMonth}</span>
        <span className={styles.statLabel}>jour{streak.activeDaysThisMonth === 1 ? '' : 's'} actifs ce mois</span>
      </p>
    </div>
  );
}
