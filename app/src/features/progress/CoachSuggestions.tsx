import type { CoachSuggestion } from '../../domain/coach';
import styles from './CoachSuggestions.module.css';
import { useState } from 'react';
import { acceptCoachTarget } from '../../repositories/coach-target.repo';

export function CoachSuggestions({ suggestions }: { suggestions: CoachSuggestion[] }) {
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  if (suggestions.length === 0) {
    return <p className={styles.empty}>Continuez le programme : aucun ajustement nécessaire pour le moment.</p>;
  }
  return (
    <div className={styles.list}>
      {suggestions.map((suggestion) => (
        <article className={`${styles.card} ${suggestion.blocked ? styles.blocked : ''}`} key={suggestion.id}>
          <div className={styles.heading}>
            <span className={styles.rule}>{suggestion.ruleId}</span>
            <strong>{suggestion.title}</strong>
          </div>
          {suggestion.suggestedWeightKg != null ? (
            <p className={styles.weight}>{suggestion.suggestedWeightKg.toLocaleString('fr-FR')} kg</p>
          ) : null}
          <p className={styles.explanation}>{suggestion.explanation}</p>
          {suggestion.exerciseId && suggestion.suggestedWeightKg != null && !suggestion.blocked ? (
            <button
              type="button"
              className={styles.accept}
              disabled={acceptedIds.has(suggestion.id)}
              onClick={() => void acceptCoachTarget(suggestion.exerciseId!, suggestion.suggestedWeightKg!).then(() => setAcceptedIds((current) => new Set(current).add(suggestion.id)))}
            >
              {acceptedIds.has(suggestion.id) ? 'Charge retenue' : 'Utiliser à la prochaine séance'}
            </button>
          ) : null}
        </article>
      ))}
    </div>
  );
}
