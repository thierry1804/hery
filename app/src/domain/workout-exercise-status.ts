export type ExerciseCompletionStatus = 'planned' | 'started' | 'completed' | 'skipped';

export function statusAfterLogSet(current: ExerciseCompletionStatus): ExerciseCompletionStatus {
  void current;
  return 'started';
}

export function statusAfterSkip(_current: ExerciseCompletionStatus): ExerciseCompletionStatus {
  return 'skipped';
}

export function statusAfterLeaveWithSets(
  current: ExerciseCompletionStatus,
  hasAnySet: boolean,
): ExerciseCompletionStatus {
  if (current === 'skipped') return 'skipped';
  if (hasAnySet) return 'completed';
  return current;
}

export function deriveHistoricalStatus(hasWorkingSet: boolean): ExerciseCompletionStatus {
  return hasWorkingSet ? 'completed' : 'planned';
}
