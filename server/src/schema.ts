import { index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull(),
});

function syncTable(name: string) {
  return pgTable(
    name,
    {
      id: text('id').primaryKey(),
      userId: text('user_id').notNull(),
      createdAt: text('created_at').notNull(),
      updatedAt: text('updated_at').notNull(),
      deletedAt: text('deleted_at'),
      payload: jsonb('payload').notNull(),
    },
    (t) => [index(`${name}_user_updated_idx`).on(t.userId, t.updatedAt)],
  );
}

export const exercises = syncTable('exercises');
export const cycles = syncTable('cycles');
export const sessionTemplates = syncTable('session_templates');
export const prescribedItems = syncTable('prescribed_items');
export const workouts = syncTable('workouts');
export const workoutExercises = syncTable('workout_exercises');
export const setLogs = syncTable('set_logs');
export const cardioLogs = syncTable('cardio_logs');
export const bodyMetrics = syncTable('body_metrics');
export const proteinEntries = syncTable('protein_entries');
export const settings = syncTable('settings');
