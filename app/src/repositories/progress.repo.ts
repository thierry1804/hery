import { db } from '../db/db';
import type { MuscleGroup, SetLog, Workout } from '../db/schema';
import {
  buildLifts,
  buildMuscleBalance,
  buildMuscleFatigue,
  buildStreakStats,
  buildWeekBars,
  selectMovers,
  selectRecentPrs,
  startOfIsoWeek,
  summarizeWeek,
  type ExerciseSessionLift,
  type ProgressSnapshot,
  type RecentPr,
} from '../domain/progress';
import { toDateStr } from '../lib/date';
import { evaluateCoach, type MuscleWeekVolume } from '../domain/coach';

interface ExerciseLiftHistory {
  exerciseId: string;
  name: string;
  sessions: ExerciseSessionLift[];
}

function compareWorkouts(a: Workout, b: Workout): number {
  if (a.date !== b.date) return a.date.localeCompare(b.date);

  const aTimestamp = a.endedAt ?? a.startedAt ?? a.updatedAt;
  const bTimestamp = b.endedAt ?? b.startedAt ?? b.updatedAt;
  if (aTimestamp !== bTimestamp) return aTimestamp.localeCompare(bTimestamp);
  return a.id.localeCompare(b.id);
}

export async function getProgressSnapshot(now: Date = new Date()): Promise<ProgressSnapshot> {
  const [allWorkouts, allWorkoutExercises, allSetLogs, allExercises] = await Promise.all([
    db.workouts.toArray(),
    db.workoutExercises.toArray(),
    db.setLogs.toArray(),
    db.exercises.toArray(),
  ]);

  const workouts = allWorkouts.filter((workout) => workout.deletedAt == null);
  const completedWorkouts = workouts.filter((workout) => workout.status === 'completed');
  const completedWorkoutById = new Map(
    completedWorkouts.map((workout) => [workout.id, workout]),
  );
  const workoutExerciseById = new Map(
    allWorkoutExercises
      .filter(
        (workoutExercise) =>
          workoutExercise.deletedAt == null &&
          completedWorkoutById.has(workoutExercise.workoutId),
      )
      .map((workoutExercise) => [workoutExercise.id, workoutExercise]),
  );
  const exerciseById = new Map(
    allExercises
      .filter((exercise) => exercise.deletedAt == null)
      .map((exercise) => [exercise.id, exercise]),
  );
  const setLogs = allSetLogs.filter(
    (setLog) =>
      setLog.deletedAt == null && workoutExerciseById.has(setLog.workoutExerciseId),
  );

  const setsByExerciseAndWorkout = new Map<string, Map<string, SetLog[]>>();
  for (const setLog of setLogs) {
    const workoutExercise = workoutExerciseById.get(setLog.workoutExerciseId)!;
    let setsByWorkout = setsByExerciseAndWorkout.get(workoutExercise.exerciseId);
    if (!setsByWorkout) {
      setsByWorkout = new Map();
      setsByExerciseAndWorkout.set(workoutExercise.exerciseId, setsByWorkout);
    }

    const workoutSets = setsByWorkout.get(workoutExercise.workoutId) ?? [];
    workoutSets.push(setLog);
    setsByWorkout.set(workoutExercise.workoutId, workoutSets);
  }

  const histories: ExerciseLiftHistory[] = [];
  for (const [exerciseId, setsByWorkout] of setsByExerciseAndWorkout) {
    const exercise = exerciseById.get(exerciseId);
    if (!exercise) continue;

    const multiplier = exercise.unilateral ? 2 : 1;
    const sessions: ExerciseSessionLift[] = [];
    const orderedWorkouts = [...setsByWorkout.keys()]
      .map((workoutId) => completedWorkoutById.get(workoutId)!)
      .sort(compareWorkouts);

    for (const workout of orderedWorkouts) {
      const weightSets = setsByWorkout
        .get(workout.id)!
        .filter(
          (setLog) =>
            !setLog.isWarmup && setLog.weightKg != null && setLog.reps != null,
        );
      if (weightSets.length === 0) continue;

      const maxSet = weightSets.reduce((best, setLog) => {
        if (setLog.weightKg! > best.weightKg!) return setLog;
        if (setLog.weightKg === best.weightKg && setLog.reps! > best.reps!) return setLog;
        return best;
      });
      const prSets = weightSets.filter((setLog) => setLog.isPR);
      const latestPrAt = prSets.reduce<string | null>(
        (latest, setLog) =>
          latest == null || setLog.completedAt > latest ? setLog.completedAt : latest,
        null,
      );

      sessions.push({
        workoutDate: workout.date,
        workoutId: workout.id,
        maxWeightKg: maxSet.weightKg!,
        repsAtMax: maxSet.reps!,
        tonnageKg: weightSets.reduce(
          (total, setLog) => total + setLog.weightKg! * setLog.reps! * multiplier,
          0,
        ),
        maxE1rm: (() => {
          const e1rms = weightSets.map((s) => s.e1rm).filter((v): v is number => v != null);
          return e1rms.length > 0 ? Math.max(...e1rms) : null;
        })(),
        workSetReps: weightSets.map((setLog) => setLog.reps!),
        repsTarget:
          workout.templateSnapshot.find((item) => item.exerciseId === exerciseId)?.repsTarget ?? null,
        setsTarget:
          workout.templateSnapshot.find((item) => item.exerciseId === exerciseId)?.sets ?? null,
        averageRir: (() => {
          const values = weightSets.map((setLog) => setLog.rir).filter((value): value is number => value != null);
          return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
        })(),
        isDeload: workout.isDeload ?? false,
        hadPr: prSets.length > 0,
        latestPrAt,
      });
    }

    if (sessions.length > 0) {
      histories.push({ exerciseId, name: exercise.name, sessions });
    }
  }

  const weekStart = toDateStr(startOfIsoWeek(now));
  const previousWeekDate = new Date(startOfIsoWeek(now));
  previousWeekDate.setDate(previousWeekDate.getDate() - 7);
  const previousWeekStart = toDateStr(previousWeekDate);
  const twoWeeksAgoDate = new Date(previousWeekDate);
  twoWeeksAgoDate.setDate(twoWeeksAgoDate.getDate() - 7);
  const twoWeeksAgoStart = toDateStr(twoWeeksAgoDate);
  const cutoff7 = new Date(now);
  cutoff7.setDate(cutoff7.getDate() - 6);
  const cutoff28 = new Date(now);
  cutoff28.setDate(cutoff28.getDate() - 27);
  const cutoff7Str = toDateStr(cutoff7);
  const cutoff28Str = toDateStr(cutoff28);

  const muscleContributions: { muscle: MuscleGroup; tonnageKg: number }[] = [];
  const weightedSetContributions: { muscle: MuscleGroup; date: string; weight: number }[] = [];
  for (const setLog of setLogs) {
    const isEffectiveWorkSet =
      !setLog.isWarmup &&
      ((setLog.reps != null && setLog.reps >= 1) || (setLog.durationSec != null && setLog.durationSec > 0));
    if (!isEffectiveWorkSet) continue;
    const workoutExercise = workoutExerciseById.get(setLog.workoutExerciseId)!;
    const workout = completedWorkoutById.get(workoutExercise.workoutId)!;
    const exercise = exerciseById.get(workoutExercise.exerciseId);
    if (!exercise) continue;
    if (workout.date >= weekStart && setLog.weightKg != null && setLog.reps != null) {
      const multiplier = exercise.unilateral ? 2 : 1;
      const tonnageKg = setLog.weightKg * setLog.reps * multiplier;
      for (const muscle of exercise.primaryMuscles) {
        muscleContributions.push({ muscle, tonnageKg });
      }
    }
    for (const muscle of exercise.primaryMuscles) {
      weightedSetContributions.push({ muscle, date: workout.date, weight: 1 });
    }
    for (const muscle of exercise.secondaryMuscles) {
      weightedSetContributions.push({ muscle, date: workout.date, weight: 0.5 });
    }
  }

  const fatigueContributions: { muscle: MuscleGroup; workoutId: string; tonnageKg: number; hoursAgo: number }[] = [];
  for (const setLog of setLogs) {
    if (setLog.isWarmup || setLog.weightKg == null || setLog.reps == null) continue;
    const workoutExercise = workoutExerciseById.get(setLog.workoutExerciseId)!;
    const exercise = exerciseById.get(workoutExercise.exerciseId);
    if (!exercise) continue;
    const multiplier = exercise.unilateral ? 2 : 1;
    const tonnageKg = setLog.weightKg * setLog.reps * multiplier;
    const hoursAgo = (now.getTime() - new Date(setLog.completedAt).getTime()) / (1000 * 60 * 60);
    for (const muscle of exercise.primaryMuscles) {
      fatigueContributions.push({ muscle, workoutId: workoutExercise.workoutId, tonnageKg, hoursAgo });
    }
  }

  const prCount = setLogs.filter((setLog) => {
    if (!setLog.isPR || setLog.isWarmup) return false;
    const workoutExercise = workoutExerciseById.get(setLog.workoutExerciseId)!;
    return completedWorkoutById.get(workoutExercise.workoutId)!.date >= weekStart;
  }).length;
  const recentPrs: RecentPr[] = setLogs.flatMap((setLog) => {
    if (
      !setLog.isPR ||
      setLog.isWarmup ||
      setLog.weightKg == null ||
      setLog.reps == null
    ) {
      return [];
    }

    const workoutExercise = workoutExerciseById.get(setLog.workoutExerciseId)!;
    const exercise = exerciseById.get(workoutExercise.exerciseId);
    if (!exercise) return [];

    return [{
      setLogId: setLog.id,
      exerciseId: exercise.id,
      name: exercise.name,
      weightKg: setLog.weightKg,
      reps: setLog.reps,
      completedAt: setLog.completedAt,
      prKinds: setLog.prKinds,
    }];
  });

  const activeCycle = (await db.cycles.filter((cycle) => cycle.deletedAt == null && cycle.active).first()) ?? null;
  const activeTemplateIds = activeCycle
    ? new Set((await db.sessionTemplates.where('cycleId').equals(activeCycle.id).toArray()).filter((template) => template.deletedAt == null).map((template) => template.id))
    : new Set<string>();
  const activeExerciseIds = new Set(
    (await db.prescribedItems.toArray())
      .filter((item) => item.deletedAt == null && item.exerciseId != null && activeTemplateIds.has(item.sessionTemplateId))
      .map((item) => item.exerciseId!),
  );
  const programMuscles = allExercises
    .filter((exercise) => activeExerciseIds.has(exercise.id))
    .flatMap((exercise) => [...exercise.primaryMuscles, ...exercise.secondaryMuscles]);
  const muscleIds = [...new Set([...programMuscles, ...weightedSetContributions.map((row) => row.muscle)])];
  const muscleVolumeWindows = muscleIds.map((muscle) => {
    const rows = weightedSetContributions.filter((row) => row.muscle === muscle);
    const sets7d = rows.filter((row) => row.date >= cutoff7Str).reduce((sum, row) => sum + row.weight, 0);
    const sets28d = rows.filter((row) => row.date >= cutoff28Str).reduce((sum, row) => sum + row.weight, 0);
    const weeklyAverage28d = sets28d / 4;
    return {
      muscle,
      sets7d,
      sets28d,
      weeklyAverage28d,
      status: weeklyAverage28d < 8 ? 'under' as const : weeklyAverage28d > 20 ? 'over' as const : 'balanced' as const,
    };
  }).sort((a, b) => b.sets28d - a.sets28d);

  const muscleWeekVolumes: MuscleWeekVolume[] = muscleIds.map((muscle) => {
    const rows = weightedSetContributions.filter((row) => row.muscle === muscle);
    return {
      muscle,
      currentWeekSets: rows.filter((row) => row.date >= previousWeekStart && row.date < weekStart).reduce((sum, row) => sum + row.weight, 0),
      previousWeekSets: rows.filter((row) => row.date >= twoWeeksAgoStart && row.date < previousWeekStart).reduce((sum, row) => sum + row.weight, 0),
      fourWeekAverageSets: rows.filter((row) => row.date >= cutoff28Str).reduce((sum, row) => sum + row.weight, 0) / 4,
    };
  });

  let phase = null as import('../db/schema').PhaseCode | null;
  let phaseChanged = false;
  if (activeCycle) {
    const elapsedWeeks = Math.max(1, Math.floor((now.getTime() - new Date(`${activeCycle.startDate}T12:00:00`).getTime()) / (7 * 86400000)) + 1);
    const currentPhase = activeCycle.phases.find((candidate) => elapsedWeeks >= candidate.fromWeek && elapsedWeeks <= candidate.toWeek);
    phase = currentPhase?.code ?? null;
    phaseChanged = currentPhase != null && !completedWorkouts.some((workout) => {
      const workoutWeek = Math.max(1, Math.floor((new Date(`${workout.date}T12:00:00`).getTime() - new Date(`${activeCycle.startDate}T12:00:00`).getTime()) / (7 * 86400000)) + 1);
      return workoutWeek >= currentPhase.fromWeek && workoutWeek <= currentPhase.toWeek;
    });
  }
  const recentRecovery = completedWorkouts
    .filter((workout) => workout.date >= cutoff28Str)
    .sort(compareWorkouts)
    .slice(-3);
  const coachSuggestions = evaluateCoach({
    phase,
    phaseChanged,
    exercises: histories.map((history) => ({
      exerciseId: history.exerciseId,
      name: history.name,
      incrementKg: exerciseById.get(history.exerciseId)?.defaultIncrementKg ?? 2.5,
      sessions: history.sessions.map((session) => ({
        date: session.workoutDate,
        maxWeightKg: session.maxWeightKg,
        maxE1rm: session.maxE1rm,
        workSetReps: session.workSetReps ?? [],
        repsTarget: session.repsTarget ?? null,
        setsTarget: session.setsTarget ?? null,
        averageRir: session.averageRir ?? null,
        isDeload: session.isDeload ?? false,
      })),
    })),
    muscleVolumes: muscleWeekVolumes,
    recentFatigueLevels: recentRecovery.map((workout) => workout.fatigueLevel).filter((value): value is number => value != null),
    recentPainLevels: recentRecovery.map((workout) => workout.painLevel).filter((value): value is number => value != null),
  });

  return {
    hasAnyCompletedWorkout: completedWorkouts.length > 0,
    week: summarizeWeek(completedWorkouts, prCount, now),
    weekBars: buildWeekBars(completedWorkouts, now),
    movers: selectMovers(histories, now),
    recentPrs: selectRecentPrs(recentPrs, now),
    lifts: buildLifts(histories),
    muscleBalance: buildMuscleBalance(muscleContributions),
    muscleFatigue: buildMuscleFatigue(fatigueContributions),
    muscleVolumeWindows,
    coachSuggestions,
    streak: buildStreakStats(workouts, now),
    exerciseHistories: histories,
  };
}
