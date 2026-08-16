import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Exercise, PrescribedItem, SessionTemplate } from '../../db/schema';
import { getExercisesByIds } from '../../repositories/exercises.repo';
import {
  getPrescribedItems,
  getTemplateById,
  reorderPrescribedItems,
  updatePrescribedItem,
  updateSessionTemplate,
} from '../../repositories/program.repo';
import { newId } from '../../lib/id';
import { BigButton } from '../../ui/BigButton';
import { Stepper } from '../../ui/Stepper';
import { ExerciseIllustration } from '../../ui/exercise-illustrations/ExerciseIllustration';
import { DAY_NAMES } from './days';
import { formatPrescription } from './formatPrescription';
import shared from './programShared.module.css';
import styles from './SessionEditScreen.module.css';

export function SessionEditScreen() {
  const { templateId = '' } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<SessionTemplate>();
  const [items, setItems] = useState<PrescribedItem[]>([]);
  const [exercisesById, setExercisesById] = useState<Map<string, Exercise>>(new Map());
  const [label, setLabel] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [targetDurationMin, setTargetDurationMin] = useState(60);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadItems = useCallback(async () => {
    const prescribedItems = await getPrescribedItems(templateId);
    const exerciseIds = Array.from(
      new Set(prescribedItems.map((item) => item.exerciseId).filter((id): id is string => id != null)),
    );
    const exercises = await getExercisesByIds(exerciseIds);
    setItems(prescribedItems);
    setExercisesById(new Map(exercises.map((exercise) => [exercise.id, exercise])));
  }, [templateId]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const loadedTemplate = await getTemplateById(templateId);
        if (loadedTemplate) {
          setTemplate(loadedTemplate);
          setLabel(loadedTemplate.label);
          setDayOfWeek(loadedTemplate.dayOfWeek);
          setTargetDurationMin(loadedTemplate.targetDurationMin);
          await loadItems();
        }
      } catch {
        setError('Impossible de charger la séance.');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadItems, templateId]);

  const saveTemplate = async () => {
    setError('');
    try {
      await updateSessionTemplate(templateId, {
        label: label.trim(),
        dayOfWeek,
        targetDurationMin,
      });
      if (template) {
        setTemplate({ ...template, label: label.trim(), dayOfWeek, targetDurationMin });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Impossible d’enregistrer la séance.');
    }
  };

  const moveItem = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const reordered = [...items];
    const [movedItem] = reordered.splice(index, 1);
    if (!movedItem) return;
    reordered.splice(targetIndex, 0, movedItem);
    setError('');
    try {
      await reorderPrescribedItems(
        templateId,
        reordered.map((item) => item.id),
      );
      await loadItems();
    } catch {
      setError('Impossible de réordonner les exercices.');
    }
  };

  const toggleSuperset = async (item: PrescribedItem, prevItem: PrescribedItem) => {
    setError('');
    try {
      if (item.supersetGroup != null && item.supersetGroup === prevItem.supersetGroup) {
        await updatePrescribedItem(item.id, { supersetGroup: null });
      } else {
        const groupId = prevItem.supersetGroup ?? newId();
        if (!prevItem.supersetGroup) {
          await updatePrescribedItem(prevItem.id, { supersetGroup: groupId });
        }
        await updatePrescribedItem(item.id, { supersetGroup: groupId });
      }
      await loadItems();
    } catch {
      setError('Impossible de lier les exercices.');
    }
  };

  if (loading) return <div className={shared.screen} />;

  return (
    <div className={shared.screen}>
      <Link className={shared.backLink} to="/settings/program">
        ← Programme
      </Link>

      <h1 className={shared.title}>{template?.label ?? 'Séance introuvable'}</h1>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {!template ? (
        <p className={shared.muted}>Cette séance n’existe pas.</p>
      ) : (
        <>
          <div className={shared.plate}>
            <label className={styles.field}>
              Nom de la séance
              <input
                className={styles.input}
                value={label}
                onChange={(event) => setLabel(event.target.value)}
              />
            </label>

            <label className={styles.field}>
              Jour
              <select
                className={styles.input}
                value={dayOfWeek}
                onChange={(event) => setDayOfWeek(Number(event.target.value))}
              >
                {DAY_NAMES.slice(1).map((dayName, index) => (
                  <option key={dayName} value={index + 1}>
                    {dayName}
                  </option>
                ))}
              </select>
            </label>

            <div className={styles.field}>
              <span>Durée cible</span>
              <Stepper
                value={targetDurationMin}
                step={5}
                min={5}
                unit="min"
                fontSizePx={28}
                onChange={setTargetDurationMin}
              />
            </div>

            <BigButton variant="primary" disabled={!label.trim()} onClick={() => void saveTemplate()}>
              Enregistrer
            </BigButton>
          </div>

          <div className={shared.plate}>
            {items.map((item, index) => {
              const itemName =
                (item.exerciseId ? exercisesById.get(item.exerciseId)?.name : undefined) || item.label;
              const prevItem = items[index - 1];
              const strengthOrCore = item.kind === 'strength' || item.kind === 'core';
              const canLink =
                prevItem != null &&
                strengthOrCore &&
                (prevItem.kind === 'strength' || prevItem.kind === 'core');
              const linked =
                canLink && item.supersetGroup != null && item.supersetGroup === prevItem!.supersetGroup;
              return (
                <div key={item.id}>
                  {canLink && (
                    <button
                      type="button"
                      className={styles.supersetLink}
                      onClick={() => void toggleSuperset(item, prevItem!)}
                    >
                      {linked ? 'Superset — dissocier' : '+ Lier en superset'}
                    </button>
                  )}
                  <div className={styles.itemRow}>
                    <Link className={styles.itemLink} to={`/settings/program/${templateId}/items/${item.id}`}>
                      <ExerciseIllustration variant="thumb" exerciseId={item.exerciseId} name={itemName} />
                      <span className={styles.itemText}>
                        <span className={styles.itemName}>
                          {itemName}
                          {linked && <span className={styles.supersetBadge}>Superset</span>}
                        </span>
                        <span className={shared.muted}>{formatPrescription(item)}</span>
                      </span>
                    </Link>
                    <div className={styles.reorder}>
                      <button
                        type="button"
                        className={styles.reorderButton}
                        aria-label={`Monter ${itemName}`}
                        disabled={index === 0}
                        onClick={() => void moveItem(index, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={styles.reorderButton}
                        aria-label={`Descendre ${itemName}`}
                        disabled={index === items.length - 1}
                        onClick={() => void moveItem(index, 1)}
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {items.length === 0 && <span className={shared.muted}>Aucun exercice dans cette séance.</span>}
          </div>

          <BigButton variant="ghost" onClick={() => navigate(`/settings/program/${templateId}/items/new`)}>
            Ajouter un exercice
          </BigButton>
        </>
      )}
    </div>
  );
}
