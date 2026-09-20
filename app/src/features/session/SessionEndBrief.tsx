import { COACH_STATUS_LABEL } from '../today/brief-lines';
import type { CoachProposalLine } from '../../repositories/coach-apply.repo';
import styles from './SessionEndBrief.module.css';

export function SessionEndBrief({ lines }: { lines: CoachProposalLine[] }) {
  if (lines.length === 0) return null;
  return (
    <section className={styles.brief} aria-label="Bilan coach">
      <h2 className={styles.title}>Bilan coach</h2>
      <p className={styles.lead}>
        Ces propositions seront actées en progression et dans le programme à la validation.
      </p>
      <ul className={styles.list}>
        {lines.map((line) => (
          <li key={line.exerciseId} className={styles.item}>
            <div className={styles.head}>
              <span className={styles.badge}>{COACH_STATUS_LABEL[line.status]}</span>
              <strong className={styles.name}>{line.name}</strong>
            </div>
            <p className={styles.text}>{line.text}</p>
            <p className={`tabular ${styles.meta}`}>
              {line.suggestedLoadKg != null
                ? `${line.suggestedLoadKg.toLocaleString('fr-FR')} kg · `
                : ''}
              {line.targetReps[0]}–{line.targetReps[1]} reps · RIR {line.targetRir[0]}–
              {line.targetRir[1]}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
