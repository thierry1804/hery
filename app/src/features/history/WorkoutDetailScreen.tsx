import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Exercise, SetLog } from '../../db/schema';
import {
  editSetLog,
  getWorkoutDetail,
  updateWorkoutTimes,
  updateWorkoutRecovery,
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

function formatSetPerformance(set: SetLog, exercise?: Exercise): string {
  if (exercise?.loadType === 'time') {
    return set.reps != null ? `${set.reps} s` : 'durée non renseignée';
  }
  if (exercise?.loadType === 'reps') {
    return set.reps != null ? `${set.reps} répétitions · poids du corps` : 'répétitions non renseignées';
  }
  if (exercise?.loadType === 'distance') {
    return set.reps != null ? `${set.reps} m` : 'distance non renseignée';
  }
  if (set.reps == null || set.weightKg == null) return 'série incomplète';
  return `${set.reps} × ${set.weightKg} kg`;
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
  const [editingRecovery, setEditingRecovery] = useState(false);
  const [editFatigue, setEditFatigue] = useState<number | null>(null);
  const [editPain, setEditPain] = useState<number | null>(null);
  const [editPainArea, setEditPainArea] = useState('');
  const [editBodyweight, setEditBodyweight] = useState<number | null>(null);
  const [editDeload, setEditDeload] = useState(false);
  const [collapsedExerciseIds, setCollapsedExerciseIds] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    if (!editingId) return;
    const frame = requestAnimationFrame(() => {
      const panel = document.querySelector<HTMLElement>(`[data-editing-set="${editingId}"]`);
      panel?.scrollIntoView({
        block: 'center',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [editingId]);

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

      <section className={styles.exerciseBlock} aria-label="Récupération">
        <h2 className={styles.exerciseName}>Récupération</h2>
        {editingRecovery ? (
          <div className={styles.timeEditPanel}>
            <label>Fatigue (1–5)<input type="number" min="1" max="5" value={editFatigue ?? ''} onChange={(event) => setEditFatigue(event.target.value ? Number(event.target.value) : null)} /></label>
            <label>Douleur (0–10)<input type="number" min="0" max="10" value={editPain ?? ''} onChange={(event) => setEditPain(event.target.value ? Number(event.target.value) : null)} /></label>
            <label>Zone douloureuse<input value={editPainArea} onChange={(event) => setEditPainArea(event.target.value)} /></label>
            <label>Poids du jour<input type="number" min="20" max="300" step="0.1" value={editBodyweight ?? ''} onChange={(event) => setEditBodyweight(event.target.value ? Number(event.target.value) : null)} /></label>
            <label><input type="checkbox" checked={editDeload} onChange={(event) => setEditDeload(event.target.checked)} /> Séance allégée / deload</label>
            <BigButton variant="primary" onClick={() => void updateWorkoutRecovery(workoutId, { fatigueLevel: editFatigue, painLevel: editPain, painArea: editPainArea, bodyweightKg: editBodyweight, isDeload: editDeload }).then(async () => { setEditingRecovery(false); await reload(); })}>Enregistrer</BigButton>
            <BigButton variant="ghost" onClick={() => setEditingRecovery(false)}>Annuler</BigButton>
          </div>
        ) : (
          <>
            <p className={styles.detailMeta}>Fatigue : {detail.workout.fatigueLevel ?? 'non renseignée'} · Douleur : {detail.workout.painLevel ?? 'non renseignée'}{detail.workout.painArea ? ` (${detail.workout.painArea})` : ''}</p>
            <p className={styles.detailMeta}>Poids : {detail.workout.bodyweightKg != null ? `${detail.workout.bodyweightKg} kg` : 'non renseigné'}{detail.workout.isDeload ? ' · séance allégée' : ''}</p>
            <button type="button" className={styles.correctTimes} onClick={() => { setEditFatigue(detail.workout.fatigueLevel ?? null); setEditPain(detail.workout.painLevel ?? null); setEditPainArea(detail.workout.painArea ?? ''); setEditBodyweight(detail.workout.bodyweightKg); setEditDeload(detail.workout.isDeload ?? false); setEditingRecovery(true); }}>Corriger la récupération</button>
          </>
        )}
      </section>

      {detail.exercises.map(({ workoutExercise, sets }) => {
        const exercise = exercisesById.get(workoutExercise.exerciseId);
        const collapsed = collapsedExerciseIds.has(workoutExercise.id);
        const status = workoutExercise.completionStatus;
        const statusLabel =
          status === 'skipped' ? 'Ignoré' : status === 'planned' && sets.length === 0 ? 'Non fait' : null;
        return (
          <section key={workoutExercise.id} className={styles.exerciseBlock}>
            <div className={styles.exerciseHeader}>
              <h2 className={styles.exerciseName}>
                {exercise?.name ?? 'Exercice'}
                {statusLabel ? <span className={styles.statusLabel}> · {statusLabel}</span> : null}
              </h2>
              <button
                type="button"
                className={styles.exerciseToggle}
                aria-expanded={!collapsed}
                aria-label={`${collapsed ? 'Déplier' : 'Replier'} ${exercise?.name ?? 'Exercice'}`}
                onClick={() =>
                  setCollapsedExerciseIds((current) => {
                    const next = new Set(current);
                    if (next.has(workoutExercise.id)) next.delete(workoutExercise.id);
                    else next.add(workoutExercise.id);
                    return next;
                  })
                }
              >
                <span className={styles.toggleIcon} aria-hidden="true">{collapsed ? '+' : '−'}</span>
              </button>
            </div>
            {!collapsed ? sets.map((s) => {
              const kind = s.setKind ?? (s.isWarmup ? 'warmup' : 'work');
              const kindLabel = setKindShortLabel(kind);
              const rirLabel = formatSetRir(s.rir);
              const incomplete =
                !s.isWarmup &&
                !setCountsTowardTonnage(s) &&
                exercise?.loadType === 'weight';
              return editingId === s.id ? (
                <div key={s.id} className={styles.editPanel} data-editing-set={s.id}>
                  {exercise?.loadType === 'weight' ? <Stepper value={editWeight} step={2.5} unit="kg" fontSizePx={28} decimals={1} onChange={setEditWeight} /> : null}
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
                    Série {s.index} — {formatSetPerformance(s, exercise)}
                    {kindLabel ? ` · ${kindLabel}` : ''}
                    {rirLabel ? ` · ${rirLabel}` : ''}
                    {s.isPR ? <span className={styles.pr}> · Record</span> : null}
                    {s.editedAt ? ' · corrigée' : null}
                    {incomplete ? ' · série incomplète (exclue des stats)' : null}
                  </span>
                  <span className={styles.editHint}>modifier</span>
                </button>
              );
            }) : null}
          </section>
        );
      })}
    </div>
  );
}
