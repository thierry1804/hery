// Types de donnees. Source unique de verite (03-bookdev.md: "pas de type declare deux fois").

export type MuscleGroup =
  | 'quadriceps'
  | 'ischios'
  | 'fessiers'
  | 'mollets'
  | 'pectoraux'
  | 'dorsaux'
  | 'trapezes'
  | 'deltoides_ant'
  | 'deltoides_lat'
  | 'deltoides_post'
  | 'biceps'
  | 'triceps'
  | 'avant_bras'
  | 'abdominaux'
  | 'obliques'
  | 'lombaires';

export type Equipment = 'machine' | 'barbell' | 'dumbbell' | 'cable' | 'bodyweight' | 'smith' | 'cardio';
export type LoadType = 'weight' | 'time' | 'reps' | 'distance';
export type ItemKind = 'warmup' | 'strength' | 'core' | 'cardio' | 'stretch';
export type WorkoutStatus = 'in_progress' | 'completed' | 'abandoned';
export type PhaseCode = 'readaptation' | 'progression' | 'intensification';
export type CardioModality = 'marche_inclinee' | 'velo' | 'rameur' | 'elliptique' | 'tapis';
export type PrKind = 'weight' | 'reps' | 'e1rm' | 'volume';
export type SessionRpe = 6 | 8 | 9.5;

interface Common {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Exercise extends Common {
  name: string;
  equipment: Equipment;
  loadType: LoadType;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  unilateral: boolean;
  defaultIncrementKg: number;
  alternativeIds: string[];
  cues: string[];
}

export interface Phase {
  code: PhaseCode;
  label: string;
  fromWeek: number;
  toWeek: number;
  rules: {
    targetRir?: [number, number];
    allowLoadIncrease?: boolean;
    loadIncreasePctRange?: [number, number];
    extraSetOnMainLifts?: boolean;
    restSecRange?: [number, number];
    note?: string;
  };
}

export interface ProgramCycle extends Common {
  name: string;
  startDate: string;
  weeks: number;
  phases: Phase[];
  active: boolean;
}

export interface SessionTemplate extends Common {
  cycleId: string;
  code: 'A' | 'B' | 'C';
  label: string;
  dayOfWeek: number;
  targetDurationMin: number;
}

export interface PrescribedItem extends Common {
  sessionTemplateId: string;
  order: number;
  kind: ItemKind;
  exerciseId: string | null;
  label: string;
  sets: number | null;
  repsTarget: number | null;
  repsRangeMin: number | null;
  repsRangeMax: number | null;
  durationSec: number | null;
  restSec: number;
  perSide: boolean;
  notes: string;
}

export interface Workout extends Common {
  sessionTemplateId: string | null;
  templateSnapshot: PrescribedItem[];
  date: string;
  startedAt: string | null;
  endedAt: string | null;
  status: WorkoutStatus;
  bodyweightKg: number | null;
  totalTonnageKg: number;
  notes: string;
}

export interface WorkoutExercise extends Common {
  workoutId: string;
  exerciseId: string;
  substitutedFromId: string | null;
  order: number;
  machineSettings: string;
  sessionRpe: SessionRpe | null;
  note: string;
}

export interface SetLog extends Common {
  workoutExerciseId: string;
  index: number;
  weightKg: number | null;
  reps: number | null;
  durationSec: number | null;
  rir: number | null;
  tempo: string | null;
  restActualSec: number | null;
  isWarmup: boolean;
  e1rm: number | null;
  isPR: boolean;
  prKinds: PrKind[];
  completedAt: string;
  editedAt: string | null;
}

export interface CardioLog extends Common {
  workoutId: string;
  modality: CardioModality;
  durationMin: number;
  avgHrBpm: number | null;
  inclinePct: number | null;
  resistance: number | null;
  distanceKm: number | null;
}

export interface BodyMetric extends Common {
  date: string;
  weightKg: number | null;
  waistCm: number | null;
  chestCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  hipCm: number | null;
}

export interface ProgressPhoto extends Common {
  date: string;
  pose: 'front' | 'side' | 'back';
  blob: Blob;
  weightKg: number | null;
}

export interface ProteinEntry extends Common {
  date: string;
  label: string;
  grams: number;
  presetId: string | null;
}

export interface Setting {
  key: string;
  value: unknown;
}

export const SETTINGS_KEYS = {
  lastExportAt: 'lastExportAt',
  seedVersion: 'seedVersion',
  dailyProteinTargetG: 'dailyProteinTargetG',
  storagePersisted: 'storagePersisted',
} as const;
