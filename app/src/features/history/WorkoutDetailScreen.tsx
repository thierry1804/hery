import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Exercise } from '../../db/schema';
import { editSetLog, getWorkoutDetail, type WorkoutDetail } from '../../repositories/workouts.repo';
import { getExercisesByIds } from '../../repositories/exercises.repo';
import { formatDateFr } from '../../lib/date';
import { Stepper } from '../../ui/Stepper';
import { BigButton } from '../../ui/BigButton';
import styles from './HistoryScreen.module.css';

export function WorkoutDetailScreen() {
  const { workoutId = '' } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<WorkoutDetail | null | undefined>(undefined);
  const [exercisesById, setExercisesById] = useState<Map<string, Exercise>>(new Map());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState(0);
  const [editReps, setEditReps] = useState(0);

  const reload = async () => {
    const d = await getWorkoutDetail(workoutId);
    setDetail(d ?? null);
    if (d) {
      const ids = d.exercises.map((e) => e.workoutExercise.exerciseId);
      const exs = await getExercisesByIds(ids);
      setExercisesById(new Map(exs.map((e) => [e.id, e])));
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutId]);

  if (detail === undefined) {
    return (
      <div className={styles.screen} aria-busy="true">
        <div className={styles.skeletonTitle} />
        <div className={styles.skeletonRow} />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className={styles.screen}>
        <button type="button" className={styles.back} onClick={() => navigate(-1)}>
          ← Retour
        </button>
        <p className={styles.empty}>Séance introuvable.</p>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <button type="button" className={styles.back} onClick={() => navigate(-1)}>
        ← Retour
      </button>
      <header className={styles.header}>
        <h1 className={styles.title}>{formatDateFr(detail.workout.date)}</h1>
        <p className={styles.detailMeta}>
          Tonnage total : <span className="tabular">{Math.round(detail.workout.totalTonnageKg)}</span> kg
        </p>
      </header>

      {detail.exercises.map(({ workoutExercise, sets }) => (
        <section key={workoutExercise.id} className={styles.exerciseBlock}>
          <h2 className={styles.exerciseName}>
            {exercisesById.get(workoutExercise.exerciseId)?.name ?? 'Exercice'}
          </h2>
          {sets.map((s) =>
            editingId === s.id ? (
              <div key={s.id} className={styles.editPanel}>
                <Stepper value={editWeight} step={2.5} unit="kg" fontSizePx={28} decimals={1} onChange={setEditWeight} />
                <Stepper value={editReps} step={1} unit="reps" fontSizePx={20} onChange={setEditReps} />
                <BigButton
                  variant="primary"
                  onClick={() =>
                    void editSetLog(s.id, { weightKg: editWeight, reps: editReps }).then(() => {
                      setEditingId(null);
                      void reload();
                    })
                  }
                >
                  Enregistrer
                </BigButton>
                <BigButton variant="ghost" onClick={() => setEditingId(null)}>
                  Annuler
                </BigButton>
              </div>
            ) : (
              <button
                key={s.id}
                type="button"
                className={`tabular ${styles.setRow}`}
                onClick={() => {
                  setEditingId(s.id);
                  setEditWeight(s.weightKg ?? 0);
                  setEditReps(s.reps ?? 0);
                }}
              >
                <span className={styles.setText}>
                  Série {s.index} — {s.reps} × {s.weightKg} kg
                  {s.isPR ? <span className={styles.pr}> · Record</span> : null}
                  {s.editedAt ? ' · corrigée' : null}
                </span>
                <span className={styles.editHint}>Modifier</span>
              </button>
            ),
          )}
        </section>
      ))}
    </div>
  );
}
