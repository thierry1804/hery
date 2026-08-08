import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Workout } from '../../db/schema';
import { listWorkouts } from '../../repositories/workouts.repo';
import { formatDateFr } from '../../lib/date';
import styles from './HistoryScreen.module.css';

export function HistoryScreen() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  useEffect(() => {
    void listWorkouts().then(setWorkouts);
  }, []);

  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>Historique</h1>
      {workouts.length === 0 && <div className={styles.empty}>Aucune séance enregistrée pour l'instant.</div>}
      {workouts.map((w) => (
        <Link key={w.id} to={`/history/${w.id}`} className={styles.row} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div>
            <div className={styles.date}>{formatDateFr(w.date)}</div>
            <div className={styles.meta}>{w.status === 'abandoned' ? 'Abandonnée' : 'Terminée'}</div>
          </div>
          <div className="tabular">{Math.round(w.totalTonnageKg)} kg</div>
        </Link>
      ))}
    </div>
  );
}
