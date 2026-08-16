import { useEffect, useState } from 'react';
import type { ProgressSnapshot } from '../../domain/progress';
import { getProgressSnapshot } from '../../repositories/progress.repo';
import { ExerciseTrendChart } from './ExerciseTrendChart';
import { LiftsList } from './LiftsList';
import { MuscleBalanceBars } from './MuscleBalanceBars';
import { MuscleFatigueBars } from './MuscleFatigueBars';
import { RecentPrsList } from './RecentPrsList';
import { StreakSummary } from './StreakSummary';
import { WeekSummary } from './WeekSummary';
import { WeekTonnageBars } from './WeekTonnageBars';
import styles from './ProgressScreen.module.css';

const EMPTY_SNAPSHOT: ProgressSnapshot = {
  hasAnyCompletedWorkout: false,
  week: { sessionsDone: 0, sessionsTarget: 3, tonnageKg: 0, prCount: 0 },
  weekBars: [],
  movers: [],
  recentPrs: [],
  lifts: [],
  muscleBalance: [],
  muscleFatigue: [],
  streak: { currentStreakWeeks: 0, activeDaysThisMonth: 0 },
  exerciseHistories: [],
};

export function ProgressScreen() {
  const [snapshot, setSnapshot] = useState<ProgressSnapshot | null>(null);

  useEffect(() => {
    void getProgressSnapshot()
      .then(setSnapshot)
      .catch(() => setSnapshot(EMPTY_SNAPSHOT));
  }, []);

  return (
    <main className={`${styles.screen} calm-bg`}>
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
            <h2 className={styles.sectionTitle}>Régularité</h2>
            <StreakSummary streak={snapshot.streak} />
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Tonnage — 4 semaines</h2>
            <WeekTonnageBars bars={snapshot.weekBars} />
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Équilibre musculaire — cette semaine</h2>
            <MuscleBalanceBars balance={snapshot.muscleBalance} />
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Fatigue musculaire</h2>
            <MuscleFatigueBars fatigue={snapshot.muscleFatigue} />
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Progression par exercice</h2>
            <ExerciseTrendChart histories={snapshot.exerciseHistories} />
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
