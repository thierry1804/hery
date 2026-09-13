import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { CardioModality, Exercise, PrescribedItem, PrKind, SetLog, Workout } from '../../db/schema';
import {
  addCardioLog,
  completeWorkout,
  getLastCompletedSets,
  getLastWorkRir,
  getOrCreateWorkoutExercise,
  getSetLogs,
  getWorkout,
  logSet,
  markExerciseCompleted,
  markRemainingExercisesSkipped,
  removeSet,
  skipWorkoutExercise,
  updateWorkoutExercise,
  updateWorkoutItemPrescription,
  updateWorkoutTimes,
  updateWorkoutRecovery,
} from '../../repositories/workouts.repo';
import { isImplausibleDuration, workoutDurationSec } from '../../domain/tonnage';
import type { SetKind } from '../../domain/set-kind';
import { formatPrBanner, unionPrKinds } from '../../domain/pr-labels';
import { Sheet } from '../../ui/Sheet';
import { EffortChips } from './EffortChips';
import { getAllExercises } from '../../repositories/exercises.repo';
import { ExercisePickerSheet } from '../program/ExercisePickerSheet';
import { getTemplateById } from '../../repositories/program.repo';
import { clearProgress, loadProgress, saveProgress } from '../../repositories/session-progress.repo';
import { pickAlternatives } from '../../domain/substitution';
import { BigButton } from '../../ui/BigButton';
import { Stepper } from '../../ui/Stepper';
import { ExerciseIllustration } from '../../ui/exercise-illustrations/ExerciseIllustration';
import { RestOverlay } from './RestOverlay';
import { SetInput } from './SetInput';
import { SubstituteDialog } from './SubstituteDialog';
import { NoteDialog } from './NoteDialog';
import { useWakeLock } from './useWakeLock';
import { useSessionStore } from './session.store';
import { confirmSetFeedback } from '../../lib/haptics';
import { FlameIcon, HeartIcon, PencilIcon, StretchIcon, SwapIcon, UndoIcon } from '../../ui/icons';
import styles from './ActiveSessionScreen.module.css';
import { getAcceptedCoachTarget } from '../../repositories/coach-target.repo';

type Step =
  | { kind: 'warmup'; items: PrescribedItem[] }
  | { kind: 'exercise'; item: PrescribedItem }
  | { kind: 'superset'; items: PrescribedItem[] }
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
    } else if (item.supersetGroup != null) {
      const group: PrescribedItem[] = [item];
      i++;
      while (
        i < items.length &&
        (items[i]!.kind === 'strength' || items[i]!.kind === 'core') &&
        items[i]!.supersetGroup === item.supersetGroup
      ) {
        group.push(items[i]!);
        i++;
      }
      steps.push(
        group.length > 1 ? { kind: 'superset', items: group } : { kind: 'exercise', item: group[0]! },
      );
    } else {
      steps.push({ kind: 'exercise', item });
      i++;
    }
  }
  return steps;
}

// L'exercice actif d'un step 'exercise' ou 'superset' (dans un superset, celui pointe par subIndex).
function activeItem(step: Step | undefined, subIndex: number): PrescribedItem | null {
  if (!step) return null;
  if (step.kind === 'exercise') return step.item;
  if (step.kind === 'superset') return step.items[subIndex] ?? step.items[0] ?? null;
  return null;
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
  const [subIndex, setSubIndex] = useState(0);
  const [checkedOrders, setCheckedOrders] = useState<Set<number>>(new Set());
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restTotalSec, setRestTotalSec] = useState(90);
  const [restNextLoadKg, setRestNextLoadKg] = useState<number | null>(null);
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
  const [setKind, setSetKind] = useState<SetKind>('work');
  const [rir, setRir] = useState<number | null>(null);
  const [prBannerKinds, setPrBannerKinds] = useState<PrKind[]>([]);

  const [modality, setModality] = useState<CardioModality>('marche_inclinee');
  const [showSubstitute, setShowSubstitute] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [finished, setFinished] = useState(false);
  const [sessionLabel, setSessionLabel] = useState('Séance');
  const [durationConfirm, setDurationConfirm] = useState<{
    durationSec: number;
    markSkipped: boolean;
  } | null>(null);
  const [correctingTimes, setCorrectingTimes] = useState(false);
  const [editStartedLocal, setEditStartedLocal] = useState('');
  const [editEndedLocal, setEditEndedLocal] = useState('');
  const [timeError, setTimeError] = useState<string | null>(null);

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
      if (w.sessionTemplateId) {
        const tpl = await getTemplateById(w.sessionTemplateId);
        if (tpl) setSessionLabel(tpl.label);
      }
      // Catalogue complet (pas seulement les exercices prescrits) : necessaire pour
      // afficher correctement un exercice substitue via "Tous les exercices" ou une
      // alternative suggeree, qui ne fait pas forcement partie de cette seance.
      const exs = await getAllExercises();
      setExercisesById(new Map(exs.map((e) => [e.id, e])));

      const progress = await loadProgress(workoutId);
      setItemIndex(progress.itemIndex);
      setSetIndex(progress.setIndex);
      setSubIndex(progress.subIndex);
      setCheckedOrders(new Set(progress.checkedOrders));
      setRestEndsAt(progress.restEndsAt);
      if (progress.restEndsAt != null) {
        const remainingSec = Math.max(1, Math.ceil((progress.restEndsAt - Date.now()) / 1000));
        setRestTotalSec(remainingSec);
      }
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
      subIndex: number;
      checkedOrders: Set<number>;
      restEndsAt: number | null;
      pendingAdvance: boolean;
    }>,
  ) => {
    const next = {
      itemIndex: patch.itemIndex ?? itemIndex,
      setIndex: patch.setIndex ?? setIndex,
      subIndex: patch.subIndex ?? subIndex,
      checkedOrders: Array.from(patch.checkedOrders ?? checkedOrders),
      restEndsAt: patch.restEndsAt !== undefined ? patch.restEndsAt : restEndsAt,
      pendingAdvance: patch.pendingAdvance ?? pendingAdvance,
    };
    void saveProgress(workoutId, next);
  };

  useEffect(() => {
    if (!step || (step.kind !== 'exercise' && step.kind !== 'superset') || !workout) return;
    const item = activeItem(step, subIndex);
    if (!item) return;
    const exId = currentExerciseId ?? item.exerciseId;
    if (!exId) return;
    if (currentExerciseId !== exId) {
      // Se contente de fixer l'id ici ; le corps ci-dessous s'execute au rendu
      // suivant (currentExerciseId === exId) pour eviter un double appel
      // concurrent a getOrCreateWorkoutExercise sur l'entree dans l'exercice.
      setCurrentExerciseId(exId);
      return;
    }

    void (async () => {
      const we = await getOrCreateWorkoutExercise(workoutId, exId, item.order, substitutedFromId);
      setWorkoutExerciseId(we.id);
      setMachineSettings(we.machineSettings);
      setNote(we.note);
      const sets = await getSetLogs(we.id);
      setLoggedSets(sets);
      setSetKind('work');
      setRir(await getLastWorkRir(exId));
      setPrBannerKinds([]);

      const exercise = exercisesById.get(exId);
      const isWeight = !exercise || exercise.loadType === 'weight';

      const last = await getLastCompletedSets(exId, workoutId);
      const coachTargetKg = await getAcceptedCoachTarget(exId);
      if (last.length > 0) {
        const first = last[0]!;
        setLastSetsText(
          isWeight
            ? `${last.length}×${first.reps} @ ${first.weightKg} kg`
            : `${last.length}×${first.durationSec ?? 0} s`,
        );
      } else {
        setLastSetsText('');
      }

      const increment = exercise?.defaultIncrementKg && exercise.defaultIncrementKg > 0 ? exercise.defaultIncrementKg : 2.5;
      const starterWeight = isWeight ? Math.max(increment * 8, 10) : 0;

      const existingAtIndex = sets.find((s) => s.index === setIndex);
      if (existingAtIndex) {
        setWeightKg(existingAtIndex.weightKg ?? starterWeight);
        setReps(existingAtIndex.reps ?? item.repsTarget ?? 10);
      } else {
        const refSet =
          last.find((s) => s.index === setIndex) ?? last[last.length - 1] ?? sets[sets.length - 1];
        setWeightKg(coachTargetKg ?? refSet?.weightKg ?? starterWeight);
        setReps(refSet?.reps ?? item.repsTarget ?? 10);
      }
    })();
    // step/workout volontairement absents des deps : editer la duree/le repos en cours
    // d'exercice (updateItemPrescription) change l'identite de `workout` mais ne doit pas
    // relancer ce chargement (qui ecraserait poids/reps en cours de saisie).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemIndex, setIndex, subIndex, currentExerciseId, exercisesById]);

  useEffect(() => {
    if (restEndsAt == null) {
      setRestNextLoadKg(null);
      return;
    }

    if (!pendingAdvance && step?.kind === 'exercise') {
      setRestNextLoadKg(weightKg);
      return;
    }

    const targetStep = pendingAdvance ? steps[itemIndex + 1] : step;
    const targetItem = targetStep?.kind === 'exercise'
      ? targetStep.item
      : targetStep?.kind === 'superset'
        ? targetStep.items[0]
        : null;
    const exerciseId = targetItem?.exerciseId ?? null;
    if (!exerciseId || exercisesById.get(exerciseId)?.loadType !== 'weight') {
      setRestNextLoadKg(null);
      return;
    }

    let cancelled = false;
    void Promise.all([
      getAcceptedCoachTarget(exerciseId),
      getLastCompletedSets(exerciseId, workoutId),
    ]).then(([coachTarget, previousSets]) => {
      if (cancelled) return;
      const previous = previousSets.find((set) => set.index === 1) ?? previousSets[0];
      setRestNextLoadKg(coachTarget ?? previous?.weightKg ?? null);
    });
    return () => { cancelled = true; };
  }, [restEndsAt, pendingAdvance, step, steps, itemIndex, exercisesById, weightKg, workoutId]);

  if (finished) return <FinishedView workoutId={workoutId} onDone={() => navigate('/')} />;
  if (!workout || !step) {
    return (
      <div className={styles.screen} aria-busy="true">
        <div className={styles.topbar}>
          <span className={styles.exit}>…</span>
        </div>
      </div>
    );
  }

  const totalSteps = steps.length;
  const currentItem = activeItem(step, subIndex);
  const forceTotalSets = currentItem ? (currentItem.sets ?? 1) : 0;
  const forceDenseHero = forceTotalSets >= 4;
  const forceExerciseTitle = currentItem
    ? ((currentExerciseId && exercisesById.get(currentExerciseId)?.name) ??
      (currentItem.exerciseId && exercisesById.get(currentItem.exerciseId)?.name) ??
      currentItem.label)
    : '';

  const restNextHint = (() => {
    if (!pendingAdvance) return `Série ${setIndex}`;
    const next = steps[itemIndex + 1];
    if (!next) return 'fin de séance';
    if (next.kind === 'exercise') {
      return exercisesById.get(next.item.exerciseId ?? '')?.name ?? next.item.label ?? 'exercice suivant';
    }
    if (next.kind === 'superset') {
      const first = next.items[0]!;
      return exercisesById.get(first.exerciseId ?? '')?.name ?? first.label ?? 'superset suivant';
    }
    if (next.kind === 'cardio') return 'Cardio';
    if (next.kind === 'warmup') return 'Échauffement';
    return 'Étirements';
  })();

  const finishWorkout = async (opts?: { markSkipped?: boolean; startedAt?: string; endedAt?: string }) => {
    if (opts?.startedAt && opts?.endedAt) {
      await updateWorkoutTimes(workoutId, opts.startedAt, opts.endedAt);
    }
    if (opts?.markSkipped) {
      await markRemainingExercisesSkipped(workoutId);
    }
    await completeWorkout(workoutId);
    await clearProgress(workoutId);
    setDurationConfirm(null);
    setCorrectingTimes(false);
    setFinished(true);
  };

  const requestFinishWorkout = () => {
    const startedAt = workout?.startedAt ?? null;
    const provisionalEnd = new Date().toISOString();
    const durationSec = workoutDurationSec(startedAt, provisionalEnd);
    if (durationSec != null && isImplausibleDuration(durationSec)) {
      setDurationConfirm({ durationSec, markSkipped: false });
      return;
    }
    void finishWorkout();
  };

  const goToNextStep = () => {
    void (async () => {
      if (workoutExerciseId) {
        await markExerciseCompleted(workoutExerciseId);
      }
      setCurrentExerciseId(null);
      setSubstitutedFromId(null);
      setWorkoutExerciseId(null);
      setLoggedSets([]);
      setPrBannerKinds([]);
      setSetIndex(1);
      setSubIndex(0);
      setPendingAdvance(false);
      const nextIndex = itemIndex + 1;
      if (nextIndex >= totalSteps) {
        requestFinishWorkout();
        return;
      }
      setItemIndex(nextIndex);
      persist({ itemIndex: nextIndex, setIndex: 1, subIndex: 0, restEndsAt: null, pendingAdvance: false });
      setRestEndsAt(null);
    })();
  };

  const handleSkip = async () => {
    if ((step.kind !== 'exercise' && step.kind !== 'superset') || !currentExerciseId) return;
    const current = activeItem(step, subIndex);
    if (!current) return;
    let weId = workoutExerciseId;
    if (!weId) {
      const we = await getOrCreateWorkoutExercise(
        workoutId,
        currentExerciseId,
        current.order,
        substitutedFromId,
      );
      weId = we.id;
      setWorkoutExerciseId(weId);
    }
    await skipWorkoutExercise(weId);
    // Ne pas appeler markExerciseCompleted : déjà skipped
    setCurrentExerciseId(null);
    setSubstitutedFromId(null);
    setWorkoutExerciseId(null);
    setLoggedSets([]);
    setPrBannerKinds([]);
    setSetIndex(1);
    setSubIndex(0);
    setPendingAdvance(false);
    const nextIndex = itemIndex + 1;
    if (nextIndex >= totalSteps) {
      requestFinishWorkout();
      return;
    }
    setItemIndex(nextIndex);
    persist({ itemIndex: nextIndex, setIndex: 1, subIndex: 0, restEndsAt: null, pendingAdvance: false });
    setRestEndsAt(null);
  };

  // Le repos suit toujours la validation d'une serie, y compris la derniere de l'exercice
  // (RG: le passage a l'exercice suivant n'intervient qu'a la fin du repos, jamais instantanement).
  // Dans un superset, les exercices s'enchainent sans repos ; le repos suit la fin d'un tour complet.
  const handleValidate = async () => {
    if ((step.kind !== 'exercise' && step.kind !== 'superset') || !currentExerciseId) return;
    const currentItem = activeItem(step, subIndex);
    if (!currentItem) return;
    let weId = workoutExerciseId;
    if (!weId) {
      const we = await getOrCreateWorkoutExercise(workoutId, currentExerciseId, currentItem.order, substitutedFromId);
      weId = we.id;
      setWorkoutExerciseId(weId);
    }
    const exercise = exercisesById.get(currentExerciseId);
    const isTime = exercise?.loadType === 'time';
    const logged = await logSet({
      workoutExerciseId: weId,
      exerciseId: currentExerciseId,
      index: setIndex,
      weightKg: isTime ? null : weightKg,
      reps: isTime ? null : reps,
      durationSec: isTime ? currentItem.durationSec ?? null : null,
      setKind,
      rir,
    });
    if (logged.prKinds.length > 0) {
      setPrBannerKinds((prev) => unionPrKinds(prev, logged.prKinds));
    }
    confirmSetFeedback();
    const sets = await getSetLogs(weId);
    setLoggedSets(sets);

    if (step.kind === 'superset' && subIndex + 1 < step.items.length) {
      setCurrentExerciseId(null);
      setWorkoutExerciseId(null);
      setLoggedSets([]);
      const nextSub = subIndex + 1;
      setSubIndex(nextSub);
      persist({ subIndex: nextSub });
      return;
    }

    const totalRounds =
      step.kind === 'superset' ? Math.max(...step.items.map((i) => i.sets ?? 1)) : (currentItem.sets ?? 1);
    const isLastRound = setIndex >= totalRounds;
    const restSec = currentItem.restSec;
    const endsAt = Date.now() + restSec * 1000;
    setRestTotalSec(restSec);
    setRestEndsAt(endsAt);
    setSubIndex(0);
    if (step.kind === 'superset') {
      // Le tour suivant reprend au premier exercice du superset : sans ce reset,
      // currentExerciseId resterait bloque sur le dernier exercice du tour precedent.
      setCurrentExerciseId(null);
      setWorkoutExerciseId(null);
      setLoggedSets([]);
    }

    if (isLastRound) {
      setPendingAdvance(true);
      persist({ subIndex: 0, restEndsAt: endsAt, pendingAdvance: true });
    } else {
      const nextSetIndex = setIndex + 1;
      setSetIndex(nextSetIndex);
      persist({ setIndex: nextSetIndex, subIndex: 0, restEndsAt: endsAt, pendingAdvance: false });
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

  const updateItemPrescription = (itemId: string, patch: Partial<Pick<PrescribedItem, 'durationSec' | 'restSec'>>) => {
    setWorkout((current) => {
      if (!current) return current;
      return {
        ...current,
        templateSnapshot: current.templateSnapshot.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
      };
    });
    void updateWorkoutItemPrescription(workoutId, itemId, patch);
  };

  const extendRest = (extraSec: number) => {
    const endsAt = (restEndsAt ?? Date.now()) + extraSec * 1000;
    setRestTotalSec((n) => n + extraSec);
    setRestEndsAt(endsAt);
    persist({ restEndsAt: endsAt });
  };

  return (
    <div className={styles.screen}>
      <div className={styles.topbar}>
        <button type="button" className={styles.exit} onClick={() => navigate('/')}>
          ← {sessionLabel}
        </button>
        <span className={`tabular ${styles.progress}`}>
          {itemIndex + 1} / {totalSteps}
        </span>
      </div>

      {step.kind === 'warmup' || step.kind === 'stretch' ? (
        <>
          <div className={styles.header}>
            <h1 className={styles.exerciseName}>
              {step.kind === 'warmup' ? (
                <FlameIcon className={`icon-inline ${styles.headerIcon}`} />
              ) : (
                <StretchIcon className={`icon-inline ${styles.headerIcon}`} />
              )}
              {step.kind === 'warmup' ? 'Échauffement' : 'Étirements'}
            </h1>
          </div>
          <div className={styles.checklist}>
            {step.items.map((it) => {
              const done = checkedOrders.has(it.order);
              return (
                <div key={it.id} className={styles.checkRow}>
                  <button
                    type="button"
                    className={`${styles.checkItem} ${done ? styles.checkItemDone : ''}`}
                    aria-pressed={done}
                    onClick={() => toggleCheck(it.order)}
                  >
                    <span aria-hidden="true">{done ? '✓' : '○'}</span>
                    <span>{it.label}</span>
                  </button>
                  {it.durationSec != null && (
                    <div className={styles.checkItemDuration}>
                      <Stepper
                        value={it.durationSec}
                        step={15}
                        min={15}
                        unit="s"
                        fontSizePx={16}
                        onChange={(durationSec) => updateItemPrescription(it.id, { durationSec })}
                      />
                    </div>
                  )}
                </div>
              );
            })}
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
          onDurationChange={(durationSec) => updateItemPrescription(step.item.id, { durationSec })}
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
          <div className={`${styles.hero} ${forceDenseHero ? styles.heroDense : ''}`}>
            <ExerciseIllustration
              variant={forceDenseHero ? 'heroDense' : 'hero'}
              exerciseId={currentExerciseId ?? currentItem?.exerciseId ?? null}
              name={forceExerciseTitle}
            />
            <div className={styles.heroScrim}>
              <h1 className={styles.exerciseName}>{forceExerciseTitle}</h1>
              <div className={styles.metaRow}>
                {step.kind === 'superset' && (
                  <p className={styles.supersetHint}>
                    Superset {subIndex + 1}/{step.items.length}
                  </p>
                )}
                <p className={styles.lastTime}>
                  {lastSetsText ? `Dernière fois : ${lastSetsText}` : 'Première saisie'}
                </p>
                {machineSettings ? <p className={styles.machineSettings}>{machineSettings}</p> : null}
                <span className={`tabular ${styles.setBadge}`}>
                  Série {setIndex}/{forceTotalSets}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.setList}>
            <SetInput
              loggedSets={loggedSets}
              totalSets={forceTotalSets}
              activeIndex={setIndex}
              unilateral={
                currentExerciseId ? (exercisesById.get(currentExerciseId)?.unilateral ?? false) : false
              }
            />
          </div>

          {prBannerKinds.length > 0 ? (
            <p className={styles.prBanner}>{formatPrBanner(prBannerKinds)}</p>
          ) : null}

          <div className={styles.controls}>
            {exercisesById.get(currentExerciseId ?? '')?.loadType !== 'time' ? (
              <>
                <div className={styles.weightRow}>
                  <Stepper
                    value={weightKg}
                    step={Math.max(exercisesById.get(currentExerciseId ?? '')?.defaultIncrementKg ?? 2.5, 1.25)}
                    unit="kg"
                    fontSizePx={72}
                    decimals={1}
                    onChange={setWeightKg}
                  />
                </div>
                <div className={styles.repsRow}>
                  <Stepper value={reps} step={1} unit="reps" fontSizePx={28} onChange={setReps} />
                </div>
              </>
            ) : (
              <div className={styles.timeRow}>
                <Stepper
                  value={currentItem?.durationSec ?? 30}
                  step={5}
                  min={5}
                  unit="s"
                  fontSizePx={48}
                  onChange={(durationSec) => currentItem && updateItemPrescription(currentItem.id, { durationSec })}
                />
              </div>
            )}
            {(step.kind !== 'superset' || subIndex === step.items.length - 1) && (
              <div className={styles.restRow}>
                <span className={styles.restLabel}>Repos</span>
                <Stepper
                  value={currentItem?.restSec ?? 90}
                  step={15}
                  min={0}
                  unit="s"
                  fontSizePx={16}
                  onChange={(restSec) => currentItem && updateItemPrescription(currentItem.id, { restSec })}
                />
              </div>
            )}
          </div>

          <EffortChips
            setKind={setKind}
            onSetKindChange={setSetKind}
            rir={rir}
            onRirChange={setRir}
          />

          <div className={styles.actions}>
            <BigButton variant="primary" onClick={() => void handleValidate()}>
              VALIDER
            </BigButton>
            <div className={styles.secondary}>
              <BigButton variant="ghost" onClick={() => setShowSubstitute(true)}>
                <SwapIcon className="icon-inline" /> Remplacer
              </BigButton>
              <BigButton variant="ghost" onClick={() => setShowNote(true)}>
                <PencilIcon className="icon-inline" /> Noter
              </BigButton>
              <BigButton variant="ghost" onClick={() => void handleSkip()}>
                Ignorer
              </BigButton>
            </div>
            {loggedSets.length > 0 && (
              <button
                type="button"
                className={styles.undoSet}
                onClick={() =>
                  void (async () => {
                    const last = loggedSets[loggedSets.length - 1]!;
                    await removeSet(last.id);
                    if (workoutExerciseId) setLoggedSets(await getSetLogs(workoutExerciseId));
                    setSetIndex((n) => Math.max(1, n - 1));
                  })()
                }
              >
                <UndoIcon className="icon-inline" /> Annuler la dernière série
              </button>
            )}
          </div>
        </>
      )}

      {restEndsAt != null && (
        <RestOverlay
          restEndsAt={restEndsAt}
          totalSec={restTotalSec}
          nextHint={restNextHint}
          nextLoadKg={restNextLoadKg}
          onExtend={extendRest}
          onSkip={finishRest}
          onComplete={finishRest}
        />
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
          onBrowseAll={() => {
            setShowSubstitute(false);
            setShowExercisePicker(true);
          }}
          onClose={() => setShowSubstitute(false)}
        />
      )}

      {showExercisePicker && currentExerciseId && (
        <ExercisePickerSheet
          onPick={(alt) => {
            setSubstitutedFromId(currentExerciseId);
            setCurrentExerciseId(alt.id);
            setWorkoutExerciseId(null);
            setShowExercisePicker(false);
          }}
          onClose={() => setShowExercisePicker(false)}
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

      {durationConfirm && (
        <Sheet title="Durée inhabituelle" onClose={() => setDurationConfirm(null)}>
          <p className={styles.durationHint}>
            Durée inhabituelle ({Math.round(durationConfirm.durationSec / 60)} min). Confirmer ou corriger les
            heures.
          </p>
          <label className={styles.durationCheck}>
            <input
              type="checkbox"
              checked={durationConfirm.markSkipped}
              onChange={(e) =>
                setDurationConfirm({ ...durationConfirm, markSkipped: e.target.checked })
              }
            />
            Marquer les exercices non faits comme ignorés
          </label>
          {correctingTimes ? (
            <div className={styles.timeEdit}>
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
                      const startedAt = localInputToIso(editStartedLocal);
                      const endedAt = localInputToIso(editEndedLocal);
                      await finishWorkout({
                        markSkipped: durationConfirm.markSkipped,
                        startedAt,
                        endedAt,
                      });
                    } catch {
                      setTimeError('La fin doit être après le début.');
                    }
                  })()
                }
              >
                Enregistrer et terminer
              </BigButton>
            </div>
          ) : (
            <div className={styles.durationActions}>
              <BigButton
                variant="primary"
                onClick={() => void finishWorkout({ markSkipped: durationConfirm.markSkipped })}
              >
                Confirmer
              </BigButton>
              <BigButton
                variant="ghost"
                onClick={() => {
                  setCorrectingTimes(true);
                  setEditStartedLocal(isoToLocalInput(workout?.startedAt ?? new Date().toISOString()));
                  setEditEndedLocal(isoToLocalInput(new Date().toISOString()));
                }}
              >
                Corriger
              </BigButton>
            </div>
          )}
        </Sheet>
      )}
    </div>
  );
}

function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(local: string): string {
  return new Date(local).toISOString();
}

function CardioBlock({
  item,
  modality,
  onModalityChange,
  onDurationChange,
  onFinish,
}: {
  item: PrescribedItem;
  modality: CardioModality;
  onModalityChange: (m: CardioModality) => void;
  onDurationChange: (durationSec: number) => void;
  onFinish: () => void;
}) {
  const minutes = Math.round((item.durationSec ?? 0) / 60);
  const modalityExerciseId =
    modality === 'velo'
      ? 'ex-velo'
      : modality === 'rameur'
        ? 'ex-rameur'
        : modality === 'marche_inclinee'
          ? 'ex-marche-inclinee'
          : modality === 'elliptique'
            ? 'ex-elliptique'
            : 'ex-tapis';
  return (
    <div className={styles.cardioBlock}>
      <div className={styles.cardioHero}>
        <ExerciseIllustration
          variant="hero"
          exerciseId={item.exerciseId ?? modalityExerciseId}
          name="Cardio"
        />
        <div className={styles.heroScrim}>
          <h1 className={styles.exerciseName}>
            <HeartIcon className={`icon-inline ${styles.headerIcon}`} />
            Cardio — {minutes} min
          </h1>
          <p className={styles.lastTime}>FC cible 110-130 bpm</p>
        </div>
      </div>
      <div className={styles.cardioDuration}>
        <Stepper
          value={minutes}
          step={1}
          min={1}
          unit="min"
          fontSizePx={28}
          onChange={(nextMinutes) => onDurationChange(nextMinutes * 60)}
        />
      </div>
      <div className={styles.modalityRow}>
        {CARDIO_MODALITIES.map((m) => (
          <button
            key={m}
            type="button"
            className={`${styles.modalityBtn} ${modality === m ? styles.modalityBtnActive : ''}`}
            onClick={() => onModalityChange(m)}
          >
            {MODALITY_LABEL[m]}
          </button>
        ))}
      </div>
      <div className={styles.cardioActions}>
        <BigButton variant="primary" onClick={onFinish}>
          Terminé
        </BigButton>
      </div>
    </div>
  );
}

function FinishedView({ workoutId, onDone }: { workoutId: string; onDone: () => void }) {
  const [fatigueLevel, setFatigueLevel] = useState<number | null>(null);
  const [painLevel, setPainLevel] = useState<number | null>(null);
  const [painArea, setPainArea] = useState('');
  const [bodyweightKg, setBodyweightKg] = useState<number | null>(null);
  const [isDeload, setIsDeload] = useState(false);

  const saveAndClose = async () => {
    await updateWorkoutRecovery(workoutId, { fatigueLevel, painLevel, painArea, bodyweightKg, isDeload });
    onDone();
  };
  return (
    <div className={styles.screen}>
      <div className={styles.finished}>
        <h1 className={styles.exerciseName}>Séance terminée</h1>
        <p className={styles.lastTime}>Enregistrée sur cet appareil.</p>
        <div className={styles.recoveryForm}>
          <p>Fatigue ressentie</p>
          <ChoiceRow values={[1, 2, 3, 4, 5]} selected={fatigueLevel} onSelect={setFatigueLevel} />
          <p>Douleur</p>
          <ChoiceRow values={[0, 2, 5, 8]} selected={painLevel} onSelect={setPainLevel} />
          {painLevel != null && painLevel > 0 ? (
            <input aria-label="Zone douloureuse" placeholder="Zone douloureuse (optionnel)" value={painArea} onChange={(event) => setPainArea(event.target.value)} />
          ) : null}
          <label>Poids du jour (optionnel)<input type="number" min="20" max="300" step="0.1" value={bodyweightKg ?? ''} onChange={(event) => setBodyweightKg(event.target.value ? Number(event.target.value) : null)} /></label>
          <label><input type="checkbox" checked={isDeload} onChange={(event) => setIsDeload(event.target.checked)} /> Séance allégée / deload</label>
        </div>
        <BigButton variant="primary" onClick={() => void saveAndClose()}>
          Retour à l&apos;accueil
        </BigButton>
      </div>
    </div>
  );
}

function ChoiceRow({ values, selected, onSelect }: { values: number[]; selected: number | null; onSelect: (value: number | null) => void }) {
  return <div className={styles.recoveryChoices}>{values.map((value) => <button type="button" key={value} aria-pressed={selected === value} onClick={() => onSelect(selected === value ? null : value)}>{value}</button>)}</div>;
}
