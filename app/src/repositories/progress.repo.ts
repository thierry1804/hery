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
        hadPr: prSets.length > 0,
        latestPrAt,
      });
    }

    if (sessions.length > 0) {
      histories.push({ exerciseId, name: exercise.name, sessions });
    }
  }

  const weekStart = toDateStr(startOfIsoWeek(now));

  const muscleContributions: { muscle: MuscleGroup; tonnageKg: number }[] = [];
  for (const setLog of setLogs) {
    if (setLog.isWarmup || setLog.weightKg == null || setLog.reps == null) continue;
    const workoutExercise = workoutExerciseById.get(setLog.workoutExerciseId)!;
    const workout = completedWorkoutById.get(workoutExercise.workoutId)!;
    if (workout.date < weekStart) continue;
    const exercise = exerciseById.get(workoutExercise.exerciseId);
    if (!exercise) continue;
    const multiplier = exercise.unilateral ? 2 : 1;
    const tonnageKg = setLog.weightKg * setLog.reps * multiplier;
    for (const muscle of exercise.primaryMuscles) {
      muscleContributions.push({ muscle, tonnageKg });
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

  return {
    hasAnyCompletedWorkout: completedWorkouts.length > 0,
    week: summarizeWeek(completedWorkouts, prCount, now),
    weekBars: buildWeekBars(completedWorkouts, now),
    movers: selectMovers(histories, now),
    recentPrs: selectRecentPrs(recentPrs, now),
    lifts: buildLifts(histories),
    muscleBalance: buildMuscleBalance(muscleContributions),
    muscleFatigue: buildMuscleFatigue(fatigueContributions),
    streak: buildStreakStats(workouts, now),
    exerciseHistories: histories,
  };
}
