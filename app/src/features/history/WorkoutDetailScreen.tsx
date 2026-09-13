import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Exercise } from '../../db/schema';
import {
  editSetLog,
  getWorkoutDetail,
  updateWorkoutTimes,
  type WorkoutDetail,
} from '../../repositories/workouts.repo';
import { getExercisesByIds } from '../../repositories/exercises.repo';
import { formatDateFr } from '../../lib/date';
import { isImplausibleDuration, setCountsTowardTonnage, workoutDurationSec } from '../../domain/tonnage';
import { formatSetRir, setKindShortLabel, type SetKind } from '../../domain/set-kind';
import { Stepper } from '../../ui/Stepper';
import { BigButton } from '../../ui/BigButton';
import { EffortChips } from '../session/EffortChips';
import styles from './HistoryScreen.module.css';

function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(local: string): string {
  return new Date(local).toISOString();
}

export function WorkoutDetailScreen() {
  const { workoutId = '' } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<WorkoutDetail | null | undefined>(undefined);
  const [exercisesById, setExercisesById] = useState<Map<string, Exercise>>(new Map());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState(0);
  const [editReps, setEditReps] = useState(0);
  const [editSetKind, setEditSetKind] = useState<SetKind>('work');
  const [editRir, setEditRir] = useState<number | null>(null);
  const [editingTimes, setEditingTimes] = useState(false);
  const [editStartedLocal, setEditStartedLocal] = useState('');
  const [editEndedLocal, setEditEndedLocal] = useState('');
  const [timeError, setTimeError] = useState<string | null>(null);

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

  const durationSec = workoutDurationSec(detail.workout.startedAt, detail.workout.endedAt);
  const suspect = durationSec != null && isImplausibleDuration(durationSec);

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
        <p className={styles.detailMeta}>
          {durationSec == null
            ? 'Durée inconnue'
            : `Durée : ${Math.round(durationSec / 60)} min`}
          {suspect ? <span className={styles.suspect}> · durée suspecte</span> : null}
        </p>
        {editingTimes ? (
          <div className={styles.timeEditPanel}>
            <label>
              Début
              <input
                type="datetime-local"
                value={editStartedLocal}
                onChange={(e) => setEditStartedLocal(e.target.value)}
              />
            </label>
            <label>
              Fin
              <input
                type="datetime-local"
                value={editEndedLocal}
                onChange={(e) => setEditEndedLocal(e.target.value)}
              />
            </label>
            {timeError ? <p className={styles.timeError}>{timeError}</p> : null}
            <BigButton
              variant="primary"
              onClick={() =>
                void (async () => {
                  try {
                    setTimeError(null);
                    await updateWorkoutTimes(
                      workoutId,
                      localInputToIso(editStartedLocal),
                      localInputToIso(editEndedLocal),
                    );
                    setEditingTimes(false);
                    await reload();
                  } catch {
                    setTimeError('La fin doit être après le début.');
                  }
                })()
              }
            >
              Enregistrer
            </BigButton>
            <BigButton variant="ghost" onClick={() => setEditingTimes(false)}>
              Annuler
            </BigButton>
          </div>
        ) : (
          <button
            type="button"
            className={styles.correctTimes}
            onClick={() => {
              setEditStartedLocal(
                isoToLocalInput(detail.workout.startedAt ?? new Date().toISOString()),
              );
              setEditEndedLocal(isoToLocalInput(detail.workout.endedAt ?? new Date().toISOString()));
              setEditingTimes(true);
            }}
          >
            Corriger les heures
          </button>
        )}
      </header>

      {detail.exercises.map(({ workoutExercise, sets }) => {
        const status = workoutExercise.completionStatus;
        const statusLabel =
          status === 'skipped' ? 'Ignoré' : status === 'planned' && sets.length === 0 ? 'Non fait' : null;
        return (
          <section key={workoutExercise.id} className={styles.exerciseBlock}>
            <h2 className={styles.exerciseName}>
              {exercisesById.get(workoutExercise.exerciseId)?.name ?? 'Exercice'}
              {statusLabel ? <span className={styles.statusLabel}> · {statusLabel}</span> : null}
            </h2>
            {sets.map((s) => {
              const kind = s.setKind ?? (s.isWarmup ? 'warmup' : 'work');
              const kindLabel = setKindShortLabel(kind);
              const rirLabel = formatSetRir(s.rir);
              const incomplete =
                !s.isWarmup &&
                !setCountsTowardTonnage(s) &&
                exercisesById.get(workoutExercise.exerciseId)?.loadType === 'weight';
              return editingId === s.id ? (
                <div key={s.id} className={styles.editPanel}>
                  <Stepper value={editWeight} step={2.5} unit="kg" fontSizePx={28} decimals={1} onChange={setEditWeight} />
                  <Stepper value={editReps} step={1} unit="reps" fontSizePx={20} onChange={setEditReps} />
                  <EffortChips
                    setKind={editSetKind}
                    onSetKindChange={setEditSetKind}
                    rir={editRir}
                    onRirChange={setEditRir}
                  />
                  <BigButton
                    variant="primary"
                    onClick={() =>
                      void editSetLog(s.id, {
                        weightKg: editWeight,
                        reps: editReps,
                        setKind: editSetKind,
                        rir: editRir,
                      }).then(() => {
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
                    setEditSetKind(kind);
                    setEditRir(s.rir);
                  }}
                >
                  <span className={styles.setText}>
                    Série {s.index} — {s.reps} × {s.weightKg} kg
                    {kindLabel ? ` · ${kindLabel}` : ''}
                    {rirLabel ? ` · ${rirLabel}` : ''}
                    {s.isPR ? <span className={styles.pr}> · Record</span> : null}
                    {s.editedAt ? ' · corrigée' : null}
                    {incomplete ? ' · série incomplète (exclue des stats)' : null}
                  </span>
                  <span className={styles.editHint}>modifier</span>
                </button>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
