export const SYNC_TABLE_NAMES = [
  'exercises',
  'cycles',
  'sessionTemplates',
  'prescribedItems',
  'workouts',
  'workoutExercises',
  'setLogs',
  'cardioLogs',
  'bodyMetrics',
  'proteinEntries',
  'settings',
] as const;

export type SyncTableName = (typeof SYNC_TABLE_NAMES)[number];

export type SyncRow = {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  [key: string]: unknown;
};

export type SyncChanges = Record<SyncTableName, SyncRow[]>;

export type AuthUser = { id: string; email: string };

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type PushResponse = {
  accepted: number;
  rejected: number;
};

export type PullResponse = {
  changes: SyncChanges;
  serverTime: string;
};

export class AuthError extends Error {
  constructor(message = 'unauthorized') {
    super(message);
    this.name = 'AuthError';
  }
}
