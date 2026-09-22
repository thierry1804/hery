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
import { CoachSuggestions } from './CoachSuggestions';
import { MuscleVolumeWindows } from './MuscleVolumeWindows';
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
  muscleVolumeWindows: [],
  coachSuggestions: [],
  streak: { currentStreakWeeks: 0, activeDaysThisMonth: 0 },
  exerciseHistories: [],
};

const TABS = [
  { id: 'apercu', label: 'Aperçu' },
  { id: 'muscles', label: 'Muscles' },
  { id: 'exercices', label: 'Exercices' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function ProgressScreen() {
  const [snapshot, setSnapshot] = useState<ProgressSnapshot | null>(null);
  const [tab, setTab] = useState<TabId>('apercu');

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
          <div className={styles.tabs} role="tablist" aria-label="Sections de la progression">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`progress-tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`progress-panel-${t.id}`}
                className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'apercu' && (
            <div
              className={styles.panel}
              role="tabpanel"
              id="progress-panel-apercu"
              aria-labelledby="progress-tab-apercu"
            >
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
                <h2 className={styles.sectionTitle}>Coach — prochaine séance</h2>
                <CoachSuggestions suggestions={snapshot.coachSuggestions} />
              </section>
            </div>
          )}

          {tab === 'muscles' && (
            <div
              className={styles.panel}
              role="tabpanel"
              id="progress-panel-muscles"
              aria-labelledby="progress-tab-muscles"
            >
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Volume musculaire — 7 / 28 jours</h2>
                <MuscleVolumeWindows volumes={snapshot.muscleVolumeWindows} />
              </section>

              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Équilibre musculaire — cette semaine</h2>
                <MuscleBalanceBars balance={snapshot.muscleBalance} />
              </section>

              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Fatigue musculaire</h2>
                <MuscleFatigueBars fatigue={snapshot.muscleFatigue} />
              </section>
            </div>
          )}

          {tab === 'exercices' && (
            <div
              className={styles.panel}
              role="tabpanel"
              id="progress-panel-exercices"
              aria-labelledby="progress-tab-exercices"
            >
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
            </div>
          )}
        </>
      )}
    </main>
  );
}
