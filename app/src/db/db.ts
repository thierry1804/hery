import Dexie, { type Table } from 'dexie';
import type {
  Exercise,
  ProgramCycle,
  SessionTemplate,
  PrescribedItem,
  Workout,
  WorkoutExercise,
  SetLog,
  CardioLog,
  BodyMetric,
  ProgressPhoto,
  ProteinEntry,
  Setting,
} from './schema';

export class HeryDB extends Dexie {
  exercises!: Table<Exercise, string>;
  cycles!: Table<ProgramCycle, string>;
  sessionTemplates!: Table<SessionTemplate, string>;
  prescribedItems!: Table<PrescribedItem, string>;
  workouts!: Table<Workout, string>;
  workoutExercises!: Table<WorkoutExercise, string>;
  setLogs!: Table<SetLog, string>;
  cardioLogs!: Table<CardioLog, string>;
  bodyMetrics!: Table<BodyMetric, string>;
  progressPhotos!: Table<ProgressPhoto, string>;
  proteinEntries!: Table<ProteinEntry, string>;
  settings!: Table<Setting, string>;

  constructor() {
    super('hery');
    this.version(1).stores({
      exercises: 'id, name, *primaryMuscles, equipment, updatedAt',
      cycles: 'id, startDate, updatedAt',
      sessionTemplates: 'id, cycleId, code, dayOfWeek, updatedAt',
      prescribedItems: 'id, sessionTemplateId, [sessionTemplateId+order], exerciseId',
      workouts: 'id, date, status, sessionTemplateId, updatedAt',
      workoutExercises: 'id, workoutId, exerciseId, [workoutId+order]',
      setLogs: 'id, workoutExerciseId, [workoutExerciseId+index], completedAt, isPR',
      cardioLogs: 'id, workoutId, date',
      bodyMetrics: 'id, date',
      progressPhotos: 'id, date, pose',
      proteinEntries: 'id, date',
      settings: 'key',
    });
  }
}

export const db = new HeryDB();
