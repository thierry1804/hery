import type { ExerciseProgressionMemory } from '../../db/schema';
import { COACH_STATUS_LABEL } from '../today/brief-lines';
import styles from './CoachTip.module.css';

export function hasCoachTip(memory: ExerciseProgressionMemory | null, midSetHint?: string | null): boolean {
  return Boolean(midSetHint || memory);
}

export function CoachTip({
  memory,
  midSetHint,
  fill = false,
  className,
}: {
  memory: ExerciseProgressionMemory | null;
  midSetHint?: string | null;
  fill?: boolean;
  className?: string;
}) {
  if (!memory && !midSetHint) return null;
  return (
    <div
      className={[styles.tip, fill ? styles.tipFill : '', className].filter(Boolean).join(' ')}
      role="status"
    >
      {midSetHint ? (
        <p className={styles.mid}>{midSetHint}</p>
      ) : memory ? (
        <>
          <span className={styles.badge}>{COACH_STATUS_LABEL[memory.status]}</span>
          <p className={styles.reason}>{memory.lastReason}</p>
          {memory.suggestedLoadKg != null ? (
            <p className={`tabular ${styles.load}`}>
              Cible : {memory.suggestedLoadKg.toLocaleString('fr-FR')} kg · {memory.targetReps[0]}–
              {memory.targetReps[1]} · RIR {memory.targetRir[0]}–{memory.targetRir[1]}
            </p>
          ) : (
            <p className={`tabular ${styles.load}`}>
              Vise {memory.targetReps[0]}–{memory.targetReps[1]} · RIR {memory.targetRir[0]}–
              {memory.targetRir[1]}
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
