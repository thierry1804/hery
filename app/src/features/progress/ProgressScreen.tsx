import { useEffect, useState } from 'react';
import type { ProgressSnapshot } from '../../domain/progress';
import { getProgressSnapshot } from '../../repositories/progress.repo';
import { LiftsList } from './LiftsList';
import { RecentPrsList } from './RecentPrsList';
import { WeekSummary } from './WeekSummary';
import { WeekTonnageBars } from './WeekTonnageBars';
import styles from './ProgressScreen.module.css';

export function ProgressScreen() {
  const [snapshot, setSnapshot] = useState<ProgressSnapshot | null>(null);

  useEffect(() => {
    void getProgressSnapshot()
      .then(setSnapshot)
      .catch(() =>
        setSnapshot({
          hasAnyCompletedWorkout: false,
          week: { sessionsDone: 0, sessionsTarget: 3, tonnageKg: 0, prCount: 0 },
          weekBars: [],
          movers: [],
          recentPrs: [],
          lifts: [],
        }),
      );
  }, []);

  return (
    <main className={styles.screen}>
      <h1 className={styles.title}>Progression</h1>

      {snapshot == null ? (
        <p className={styles.status}>Chargement…</p>
      ) : !snapshot.hasAnyCompletedWorkout ? (
        <p className={styles.empty}>
          La progression apparaîtra après la première séance.
        </p>
      ) : (
        <>
          <section className={styles.summary} aria-label="Cette semaine">
            <WeekSummary week={snapshot.week} />
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Tonnage — 4 semaines</h2>
            <WeekTonnageBars bars={snapshot.weekBars} />
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Records récents</h2>
            <RecentPrsList prs={snapshot.recentPrs} />
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Mouvements</h2>
            <LiftsList lifts={snapshot.lifts} />
          </section>
        </>
      )}
    </main>
  );
}
