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
  const [detail, setDetail] = useState<WorkoutDetail | null>(null);
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

  if (!detail) return <div className={styles.screen} />;

  return (
    <div className={styles.screen}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--fonte-300)' }}>
        ← Retour
      </button>
      <h1 className={styles.title}>{formatDateFr(detail.workout.date)}</h1>
      <div className={styles.meta}>Tonnage total : {Math.round(detail.workout.totalTonnageKg)} kg</div>

      {detail.exercises.map(({ workoutExercise, sets }) => (
        <div key={workoutExercise.id} className={styles.row} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <strong>{exercisesById.get(workoutExercise.exerciseId)?.name}</strong>
          {sets.map((s) => (
            <div key={s.id}>
              {editingId === s.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                </div>
              ) : (
                <div
                  className="tabular"
                  style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
                  onClick={() => {
                    setEditingId(s.id);
                    setEditWeight(s.weightKg ?? 0);
                    setEditReps(s.reps ?? 0);
                  }}
                >
                  <span>
                    Série {s.index} — {s.reps} × {s.weightKg} kg {s.isPR ? '· Record' : ''}
                    {s.editedAt ? ' · corrigée' : ''}
                  </span>
                  <span>✎</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
