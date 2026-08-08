import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ProgressSnapshot } from '../../domain/progress';
import { getProgressSnapshot } from '../../repositories/progress.repo';
import { MoversList } from './MoversList';
import { WeekSummary } from './WeekSummary';
import styles from './TodayProgressCard.module.css';

export function TodayProgressCard() {
  const [snapshot, setSnapshot] = useState<ProgressSnapshot | null>(null);

  useEffect(() => {
    void getProgressSnapshot().then(setSnapshot);
  }, []);

  if (!snapshot) return null;

  return (
    <section className={styles.plate} aria-label="Progression">
      <p className={styles.label}>Cette semaine</p>
      {!snapshot.hasAnyCompletedWorkout ? (
        <p className={styles.empty}>La progression apparaîtra après la première séance.</p>
      ) : (
        <>
          <WeekSummary week={snapshot.week} />
          <MoversList movers={snapshot.movers} />
          <Link to="/progress" className={styles.more}>
            Voir la progression →
          </Link>
        </>
      )}
    </section>
  );
}
