import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SessionTemplate, Workout } from '../../db/schema';
import { listWorkouts } from '../../repositories/workouts.repo';
import { getAllTemplates } from '../../repositories/program.repo';
import { formatDateFr, toDateStr } from '../../lib/date';
import styles from './HistoryScreen.module.css';

function startOfIsoWeek(d: Date): Date {
  const day = d.getDay() || 7;
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (day - 1));
  return start;
}

function statusLabel(status: Workout['status']): string {
  if (status === 'abandoned') return 'Abandonnée';
  if (status === 'in_progress') return 'En cours';
  return 'Terminée';
}

export function HistoryScreen() {
  const [workouts, setWorkouts] = useState<Workout[] | null>(null);
  const [templatesById, setTemplatesById] = useState<Map<string, SessionTemplate>>(new Map());

  useEffect(() => {
    void (async () => {
      const [list, templates] = await Promise.all([listWorkouts(), getAllTemplates()]);
      setWorkouts(list);
      setTemplatesById(new Map(templates.map((t) => [t.id, t])));
    })();
  }, []);

  const weekCount = useMemo(() => {
    if (!workouts) return 0;
    const weekStart = startOfIsoWeek(new Date());
    const weekStartStr = toDateStr(weekStart);
    return workouts.filter((w) => w.status === 'completed' && w.date >= weekStartStr).length;
  }, [workouts]);

  if (workouts === null) {
    return (
      <div className={`${styles.screen} calm-bg`} aria-busy="true">
        <div className={styles.skeletonTitle} />
        <div className={styles.skeletonRow} />
        <div className={styles.skeletonRow} />
      </div>
    );
  }

  return (
    <div className={`${styles.screen} calm-bg`}>
      <header className={styles.header}>
        <h1 className={styles.title}>Historique</h1>
        <p className={styles.weekLine}>
          <span className="tabular">{weekCount}</span> séance{weekCount === 1 ? '' : 's'} cette semaine sur{' '}
          <span className="tabular">3</span>
        </p>
      </header>

      {workouts.length === 0 ? (
        <p className={styles.empty}>Aucune séance enregistrée. Démarre depuis Aujourd&apos;hui.</p>
      ) : (
        <ul className={styles.list}>
          {workouts.map((w) => {
            const tpl = w.sessionTemplateId ? templatesById.get(w.sessionTemplateId) : undefined;
            const label = tpl?.label ?? 'Séance';
            return (
              <li key={w.id}>
                <Link to={`/history/${w.id}`} className={styles.row}>
                  <div className={styles.rowMain}>
                    <div className={styles.date}>{formatDateFr(w.date)}</div>
                    <div className={styles.meta}>
                      {label}
                      <span className={styles.metaSep}>·</span>
                      {statusLabel(w.status)}
                    </div>
                  </div>
                  <div className={`tabular ${styles.tonnage}`}>{Math.round(w.totalTonnageKg)} kg</div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
