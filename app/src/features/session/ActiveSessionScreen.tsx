import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { CardioModality, Exercise, PrescribedItem, SetLog, Workout } from '../../db/schema';
import {
  addCardioLog,
  completeWorkout,
  getLastCompletedSets,
  getOrCreateWorkoutExercise,
  getSetLogs,
  getWorkout,
  logSet,
  removeSet,
  updateWorkoutExercise,
} from '../../repositories/workouts.repo';
import { getExercisesByIds } from '../../repositories/exercises.repo';
import { clearProgress, loadProgress, saveProgress } from '../../repositories/session-progress.repo';
import { pickAlternatives } from '../../domain/substitution';
import { BigButton } from '../../ui/BigButton';
import { Stepper } from '../../ui/Stepper';
import { RestOverlay } from './RestOverlay';
import { SetInput } from './SetInput';
import { SubstituteDialog } from './SubstituteDialog';
import { NoteDialog } from './NoteDialog';
import { useWakeLock } from './useWakeLock';
import { useSessionStore } from './session.store';
import { confirmSetFeedback } from '../../lib/haptics';
import styles from './ActiveSessionScreen.module.css';

type Step =
  | { kind: 'warmup'; items: PrescribedItem[] }
  | { kind: 'exercise'; item: PrescribedItem }
  | { kind: 'cardio'; item: PrescribedItem }
  | { kind: 'stretch'; items: PrescribedItem[] };

function buildSteps(items: PrescribedItem[]): Step[] {
  const steps: Step[] = [];
  let i = 0;
  while (i < items.length) {
    const item = items[i]!;
    if (item.kind === 'warmup' || item.kind === 'stretch') {
      const group: PrescribedItem[] = [];
      while (i < items.length && items[i]!.kind === item.kind) group.push(items[i++]!);
      steps.push({ kind: item.kind, items: group } as Step);
    } else if (item.kind === 'cardio') {
      steps.push({ kind: 'cardio', item });
      i++;
    } else {
      steps.push({ kind: 'exercise', item });
      i++;
    }
  }
  return steps;
}

const CARDIO_MODALITIES: CardioModality[] = ['marche_inclinee', 'velo', 'rameur', 'elliptique', 'tapis'];
const MODALITY_LABEL: Record<CardioModality, string> = {
  marche_inclinee: 'Marche inclinée',
  velo: 'Vélo',
  rameur: 'Rameur',
  elliptique: 'Elliptique',
  tapis: 'Tapis',
};

export function ActiveSessionScreen() {
  const { workoutId = '' } = useParams();
  const navigate = useNavigate();
  const setActiveWorkoutId = useSessionStore((s) => s.setActiveWorkoutId);

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercisesById, setExercisesById] = useState<Map<string, Exercise>>(new Map());
  const [itemIndex, setItemIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(1);
  const [checkedOrders, setCheckedOrders] = useState<Set<number>>(new Set());
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [pendingAdvance, setPendingAdvance] = useState(false);

  const [currentExerciseId, setCurrentExerciseId] = useState<string | null>(null);
  const [substitutedFromId, setSubstitutedFromId] = useState<string | null>(null);
  const [workoutExerciseId, setWorkoutExerciseId] = useState<string | null>(null);
  const [loggedSets, setLoggedSets] = useState<SetLog[]>([]);
  const [lastSetsText, setLastSetsText] = useState<string>('');
  const [machineSettings, setMachineSettings] = useState('');
  const [note, setNote] = useState('');

  const [weightKg, setWeightKg] = useState(0);
  const [reps, setReps] = useState(10);

  const [modality, setModality] = useState<CardioModality>('marche_inclinee');
  const [showSubstitute, setShowSubstitute] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [finished, setFinished] = useState(false);

  useWakeLock(!finished);

  useEffect(() => {
    setActiveWorkoutId(workoutId);
    return () => setActiveWorkoutId(null);
  }, [workoutId, setActiveWorkoutId]);

  useEffect(() => {
    void (async () => {
      const w = await getWorkout(workoutId);
      if (!w) {
        navigate('/', { replace: true });
        return;
      }
      setWorkout(w);
      const ids = Array.from(new Set(w.templateSnapshot.map((i) => i.exerciseId).filter((x): x is string => !!x)));
      const exs = await getExercisesByIds(ids);
      setExercisesById(new Map(exs.map((e) => [e.id, e])));

      const progress = await loadProgress(workoutId);
      setItemIndex(progress.itemIndex);
      setSetIndex(progress.setIndex);
      setCheckedOrders(new Set(progress.checkedOrders));
      setRestEndsAt(progress.restEndsAt);
      setPendingAdvance(progress.pendingAdvance);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutId]);

  const steps = useMemo(() => (workout ? buildSteps(workout.templateSnapshot) : []), [workout]);
  const step = steps[itemIndex];

  const persist = (
    patch: Partial<{
      itemIndex: number;
      setIndex: number;
      checkedOrders: Set<number>;
      restEndsAt: number | null;
      pendingAdvance: boolean;
    }>,
  ) => {
    const next = {
      itemIndex: patch.itemIndex ?? itemIndex,
      setIndex: patch.setIndex ?? setIndex,
      checkedOrders: Array.from(patch.checkedOrders ?? checkedOrders),
      restEndsAt: patch.restEndsAt !== undefined ? patch.restEndsAt : restEndsAt,
      pendingAdvance: patch.pendingAdvance ?? pendingAdvance,
    };
    void saveProgress(workoutId, next);
  };

  useEffect(() => {
    if (!step || step.kind !== 'exercise' || !workout) return;
    const exId = currentExerciseId ?? step.item.exerciseId;
    if (!exId) return;
    setCurrentExerciseId(exId);

    void (async () => {
      const we = await getOrCreateWorkoutExercise(workoutId, exId, step.item.order, substitutedFromId);
      setWorkoutExerciseId(we.id);
      setMachineSettings(we.machineSettings);
      setNote(we.note);
      const sets = await getSetLogs(we.id);
      setLoggedSets(sets);

      const last = await getLastCompletedSets(exId, workoutId);
      if (last.length > 0) {
        const first = last[0]!;
        setLastSetsText(`${last.length}×${first.reps} @ ${first.weightKg} kg`);
      } else {
        setLastSetsText('');
      }

      const existingAtIndex = sets.find((s) => s.index === setIndex);
      if (existingAtIndex) {
        setWeightKg(existingAtIndex.weightKg ?? 0);
        setReps(existingAtIndex.reps ?? step.item.repsTarget ?? 10);
      } else {
        const refSet = last.find((s) => s.index === setIndex) ?? last[last.length - 1];
        setWeightKg(refSet?.weightKg ?? 0);
        setReps(refSet?.reps ?? step.item.repsTarget ?? 10);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemIndex, step, workout]);

  if (finished) return <FinishedView onDone={() => navigate('/')} />;
  if (!workout || !step) return <div className={styles.screen} />;

  const totalSteps = steps.length;

  const goToNextStep = () => {
    setCurrentExerciseId(null);
    setSubstitutedFromId(null);
    setWorkoutExerciseId(null);
    setLoggedSets([]);
    setSetIndex(1);
    setPendingAdvance(false);
    const nextIndex = itemIndex + 1;
    if (nextIndex >= totalSteps) {
      void (async () => {
        await completeWorkout(workoutId);
        await clearProgress(workoutId);
        setFinished(true);
      })();
      return;
    }
    setItemIndex(nextIndex);
    persist({ itemIndex: nextIndex, setIndex: 1, restEndsAt: null, pendingAdvance: false });
    setRestEndsAt(null);
  };

  // Le repos suit toujours la validation d'une serie, y compris la derniere de l'exercice
  // (RG: le passage a l'exercice suivant n'intervient qu'a la fin du repos, jamais instantanement).
  const handleValidate = async () => {
    if (step.kind !== 'exercise' || !workoutExerciseId || !currentExerciseId) return;
    const exercise = exercisesById.get(currentExerciseId);
    const isTime = exercise?.loadType === 'time';
    await logSet({
      workoutExerciseId,
      exerciseId: currentExerciseId,
      index: setIndex,
      weightKg: isTime ? null : weightKg,
      reps: isTime ? null : reps,
      durationSec: isTime ? step.item.durationSec ?? null : null,
      isWarmup: false,
    });
    confirmSetFeedback();
    const sets = await getSetLogs(workoutExerciseId);
    setLoggedSets(sets);

    const totalSets = step.item.sets ?? 1;
    const isLastSet = setIndex >= totalSets;
    const endsAt = Date.now() + step.item.restSec * 1000;
    setRestEndsAt(endsAt);

    if (isLastSet) {
      setPendingAdvance(true);
      persist({ restEndsAt: endsAt, pendingAdvance: true });
    } else {
      const nextSetIndex = setIndex + 1;
      setSetIndex(nextSetIndex);
      persist({ setIndex: nextSetIndex, restEndsAt: endsAt, pendingAdvance: false });
    }
  };

  const finishRest = () => {
    setRestEndsAt(null);
    if (pendingAdvance) {
      setPendingAdvance(false);
      goToNextStep();
    } else {
      persist({ restEndsAt: null, pendingAdvance: false });
    }
  };

  const toggleCheck = (order: number) => {
    const next = new Set(checkedOrders);
    if (next.has(order)) next.delete(order);
    else next.add(order);
    setCheckedOrders(next);
    persist({ checkedOrders: next });
  };

  const extendRest = (extraSec: number) => {
    const endsAt = (restEndsAt ?? Date.now()) + extraSec * 1000;
    setRestEndsAt(endsAt);
    persist({ restEndsAt: endsAt });
  };

  return (
    <div className={styles.screen}>
      <div className={styles.topbar}>
        <button className={styles.exit} onClick={() => navigate('/')}>
          ← Séance {workout.sessionTemplateId ? '' : ''}
        </button>
        <span className="tabular">
          {itemIndex + 1} / {totalSteps}
        </span>
      </div>

      {step.kind === 'warmup' || step.kind === 'stretch' ? (
        <>
          <div className={styles.header}>
            <h1 className={styles.exerciseName}>{step.kind === 'warmup' ? 'Échauffement' : 'Étirements'}</h1>
          </div>
          <div className={styles.checklist}>
            {step.items.map((it) => (
              <div
                key={it.id}
                className={`${styles.checkItem} ${checkedOrders.has(it.order) ? styles.checkItemDone : ''}`}
                onClick={() => toggleCheck(it.order)}
              >
                <span>{checkedOrders.has(it.order) ? '✓' : '○'}</span>
                <span>{it.label}</span>
              </div>
            ))}
          </div>
          <div className={styles.inputZone}>
            <BigButton variant="primary" onClick={goToNextStep}>
              Continuer
            </BigButton>
          </div>
        </>
      ) : step.kind === 'cardio' ? (
        <CardioBlock
          item={step.item}
          modality={modality}
          onModalityChange={setModality}
          onFinish={async () => {
            await addCardioLog(workoutId, {
              modality,
              durationMin: Math.round((step.item.durationSec ?? 0) / 60),
              avgHrBpm: null,
              inclinePct: null,
              resistance: null,
              distanceKm: null,
            });
            goToNextStep();
          }}
        />
      ) : (
        <>
          <div className={styles.header}>
            <h1 className={styles.exerciseName}>
              {(currentExerciseId && exercisesById.get(currentExerciseId)?.name) ?? '…'}
            </h1>
            {lastSetsText && <p className={styles.lastTime}>Dernière fois : {lastSetsText}</p>}
            {machineSettings && <p className={styles.machineSettings}>{machineSettings}</p>}
          </div>

          <div className={styles.setList}>
            <SetInput
              loggedSets={loggedSets}
              totalSets={step.item.sets ?? 1}
              activeIndex={setIndex}
              unilateral={currentExerciseId ? (exercisesById.get(currentExerciseId)?.unilateral ?? false) : false}
            />
          </div>

          <div className={styles.inputZone}>
            {exercisesById.get(currentExerciseId ?? '')?.loadType !== 'time' && (
              <>
                <div className={styles.weightRow}>
                  <Stepper value={weightKg} step={2.5} unit="kg" fontSizePx={72} decimals={1} onChange={setWeightKg} />
                </div>
                <div className={styles.repsRow}>
                  <Stepper value={reps} step={1} min={1} unit="reps" fontSizePx={28} onChange={setReps} />
                </div>
              </>
            )}
            <BigButton variant="primary" onClick={() => void handleValidate()}>
              VALIDER
            </BigButton>
            <div className={styles.secondary}>
              <BigButton variant="ghost" onClick={() => setShowSubstitute(true)}>
                Remplacer
              </BigButton>
              <BigButton variant="ghost" onClick={() => setShowNote(true)}>
                Noter
              </BigButton>
              {loggedSets.length > 0 && (
                <BigButton
                  variant="ghost"
                  onClick={() =>
                    void (async () => {
                      const last = loggedSets[loggedSets.length - 1]!;
                      await removeSet(last.id);
                      if (workoutExerciseId) setLoggedSets(await getSetLogs(workoutExerciseId));
                      setSetIndex((n) => Math.max(1, n - 1));
                    })()
                  }
                >
                  Annuler série
                </BigButton>
              )}
            </div>
          </div>
        </>
      )}

      {restEndsAt != null && (
        <RestOverlay restEndsAt={restEndsAt} onExtend={extendRest} onSkip={finishRest} onComplete={finishRest} />
      )}

      {showSubstitute && currentExerciseId && (
        <SubstituteDialog
          alternatives={pickAlternatives(exercisesById.get(currentExerciseId)!, Array.from(exercisesById.values()))}
          onPick={(alt) => {
            setSubstitutedFromId(currentExerciseId);
            setCurrentExerciseId(alt.id);
            setWorkoutExerciseId(null);
            setShowSubstitute(false);
          }}
          onClose={() => setShowSubstitute(false)}
        />
      )}

      {showNote && (
        <NoteDialog
          initialNote={note}
          initialMachineSettings={machineSettings}
          onSave={(n, m) => {
            setNote(n);
            setMachineSettings(m);
            if (workoutExerciseId) void updateWorkoutExercise(workoutExerciseId, { note: n, machineSettings: m });
          }}
          onClose={() => setShowNote(false)}
        />
      )}
    </div>
  );
}

function CardioBlock({
  item,
  modality,
  onModalityChange,
  onFinish,
}: {
  item: PrescribedItem;
  modality: CardioModality;
  onModalityChange: (m: CardioModality) => void;
  onFinish: () => void;
}) {
  const minutes = Math.round((item.durationSec ?? 0) / 60);
  return (
    <div className={styles.cardioBlock}>
      <h1 className={styles.exerciseName}>Cardio — {minutes} min</h1>
      <p className={styles.lastTime}>FC cible 110-130 bpm</p>
      <div className={styles.modalityRow}>
        {CARDIO_MODALITIES.map((m) => (
          <button
            key={m}
            className={`${styles.modalityBtn} ${modality === m ? styles.modalityBtnActive : ''}`}
            onClick={() => onModalityChange(m)}
          >
            {MODALITY_LABEL[m]}
          </button>
        ))}
      </div>
      <BigButton variant="primary" onClick={onFinish}>
        Terminé
      </BigButton>
    </div>
  );
}

function FinishedView({ onDone }: { onDone: () => void }) {
  return (
    <div className={styles.screen}>
      <div className={styles.finished}>
        <h1 className={styles.exerciseName}>Séance terminée</h1>
        <BigButton variant="primary" onClick={onDone}>
          Retour à l'accueil
        </BigButton>
      </div>
    </div>
  );
}
