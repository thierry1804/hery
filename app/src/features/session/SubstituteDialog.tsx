import type { Exercise } from '../../db/schema';
import { Sheet } from '../../ui/Sheet';
import { BigButton } from '../../ui/BigButton';
import { ExerciseIllustration } from '../../ui/exercise-illustrations/ExerciseIllustration';
import styles from './SubstituteDialog.module.css';

interface Props {
  alternatives: Exercise[];
  onPick: (exercise: Exercise) => void;
  onBrowseAll: () => void;
  onClose: () => void;
}

export function SubstituteDialog({ alternatives, onPick, onBrowseAll, onClose }: Props) {
  return (
    <Sheet title="Remplacer l'exercice" onClose={onClose}>
      <div className={styles.list}>
        {alternatives.length === 0 && <p className={styles.empty}>Aucune alternative suggérée.</p>}
        {alternatives.map((alt) => (
          <button key={alt.id} type="button" className={styles.option} onClick={() => onPick(alt)}>
            <ExerciseIllustration exerciseId={alt.id} name={alt.name} variant="compact" />
            <span className={styles.optionName}>{alt.name}</span>
          </button>
        ))}
        <BigButton variant="ghost" onClick={onBrowseAll}>
          Tous les exercices
        </BigButton>
        <BigButton variant="ghost" onClick={onClose}>
          Annuler
        </BigButton>
      </div>
    </Sheet>
  );
}
