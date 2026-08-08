import { useEffect, useMemo, useState } from 'react';
import type { Exercise } from '../../db/schema';
import { getAllExercises } from '../../repositories/exercises.repo';
import { BigButton } from '../../ui/BigButton';
import { Sheet } from '../../ui/Sheet';
import { ExerciseIllustration } from '../../ui/exercise-illustrations/ExerciseIllustration';
import styles from './ExercisePickerSheet.module.css';

interface Props {
  onClose: () => void;
  onPick: (exercise: Exercise) => void;
}

export function ExercisePickerSheet({ onClose, onPick }: Props) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void getAllExercises()
      .then((items) => setExercises(items.sort((a, b) => a.name.localeCompare(b.name, 'fr'))))
      .catch(() => setError('Impossible de charger les exercices.'));
  }, []);

  const filteredExercises = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('fr');
    if (!normalizedQuery) return exercises;
    return exercises.filter((exercise) =>
      exercise.name.toLocaleLowerCase('fr').includes(normalizedQuery),
    );
  }, [exercises, query]);

  return (
    <Sheet title="Choisir un exercice" onClose={onClose}>
      <div className={styles.body}>
        <input
          className={styles.search}
          type="search"
          aria-label="Rechercher un exercice"
          placeholder="Rechercher"
          value={query}
          autoFocus
          onChange={(event) => setQuery(event.target.value)}
        />

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.list}>
          {filteredExercises.map((exercise) => (
            <button
              className={styles.exercise}
              type="button"
              key={exercise.id}
              onClick={() => onPick(exercise)}
            >
              <ExerciseIllustration
                variant="thumb"
                exerciseId={exercise.id}
                name={exercise.name}
              />
              <span className={styles.exerciseName}>{exercise.name}</span>
            </button>
          ))}
          {!error && filteredExercises.length === 0 && (
            <p className={styles.empty}>Aucun exercice trouvé.</p>
          )}
        </div>

        <BigButton variant="ghost" onClick={onClose}>
          Annuler
        </BigButton>
      </div>
    </Sheet>
  );
}
