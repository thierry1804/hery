import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Exercise, ItemKind, PrescribedItem } from '../../db/schema';
import { validateItemPatch } from '../../domain/program-validation';
import { getAllExercises } from '../../repositories/exercises.repo';
import {
  createPrescribedItem,
  getPrescribedItems,
  softDeletePrescribedItem,
  updatePrescribedItem,
} from '../../repositories/program.repo';
import { BigButton } from '../../ui/BigButton';
import { Sheet } from '../../ui/Sheet';
import { Stepper } from '../../ui/Stepper';
import { ExercisePickerSheet } from './ExercisePickerSheet';
import shared from './programShared.module.css';
import styles from './ItemEditScreen.module.css';

type EditableItem = Pick<
  PrescribedItem,
  | 'order'
  | 'kind'
  | 'exerciseId'
  | 'label'
  | 'sets'
  | 'repsTarget'
  | 'repsRangeMin'
  | 'repsRangeMax'
  | 'durationSec'
  | 'restSec'
  | 'perSide'
  | 'notes'
>;

type PrescriptionMode = 'target' | 'range' | 'duration';

const KIND_LABELS: Record<ItemKind, string> = {
  strength: 'Musculation',
  core: 'Gainage',
  cardio: 'Cardio',
  warmup: 'Échauffement',
  stretch: 'Étirements',
};

function defaultItem(kind: ItemKind = 'strength', order = 10): EditableItem {
  const strengthOrCore = kind === 'strength' || kind === 'core';
  return {
    order,
    kind,
    exerciseId: null,
    label: kind === 'warmup' ? 'Échauffement' : kind === 'stretch' ? 'Étirements' : '',
    sets: strengthOrCore ? 3 : null,
    repsTarget: strengthOrCore ? 8 : null,
    repsRangeMin: null,
    repsRangeMax: null,
    durationSec: kind === 'cardio' ? 600 : kind === 'warmup' || kind === 'stretch' ? 300 : null,
    restSec: strengthOrCore ? 90 : 0,
    perSide: false,
    notes: '',
  };
}

export function ItemEditScreen() {
  const { templateId = '', itemId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<EditableItem>(() => defaultItem());
  const [prescriptionMode, setPrescriptionMode] = useState<PrescriptionMode>('target');
  const [exerciseNames, setExerciseNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const [items, exercises] = await Promise.all([getPrescribedItems(templateId), getAllExercises()]);
        const names = Object.fromEntries(exercises.map((exercise: Exercise) => [exercise.id, exercise.name]));
        setExerciseNames(names);
        if (itemId) {
          const item = items.find((candidate) => candidate.id === itemId);
          if (!item) {
            setMissing(true);
            return;
          }
          const exerciseName = item.exerciseId ? names[item.exerciseId] : undefined;
          setForm({
            ...item,
            label: item.label.trim() || exerciseName || '',
          });
          setPrescriptionMode(
            item.kind === 'core' && item.durationSec != null && item.durationSec > 0
              ? 'duration'
              : item.repsTarget == null
                ? 'range'
                : 'target',
          );
        } else {
          const nextOrder =
            items
              .filter((item) => item.order < 1000)
              .reduce((maximum, item) => Math.max(maximum, item.order), 0) + 10;
          setForm(defaultItem('strength', nextOrder));
        }
      } catch {
        setError("Impossible de charger l'élément.");
      } finally {
        setLoading(false);
      }
    })();
  }, [itemId, templateId]);

  const setKind = (kind: ItemKind) => {
    setForm((current) => defaultItem(kind, current.order));
    setPrescriptionMode('target');
  };

  const setMode = (mode: PrescriptionMode) => {
    setPrescriptionMode(mode);
    setForm((current) => ({
      ...current,
      repsTarget: mode === 'target' ? (current.repsTarget ?? 8) : null,
      repsRangeMin: mode === 'range' ? (current.repsRangeMin ?? 8) : null,
      repsRangeMax: mode === 'range' ? (current.repsRangeMax ?? 12) : null,
      durationSec: mode === 'duration' ? (current.durationSec ?? 30) : null,
    }));
  };

  const save = async () => {
    const exerciseName = form.exerciseId ? exerciseNames[form.exerciseId] : undefined;
    const payload: EditableItem = {
      ...form,
      label: form.label.trim() || exerciseName || '',
      sets: form.kind === 'strength' || form.kind === 'core' ? form.sets : null,
      repsTarget:
        (form.kind === 'strength' || form.kind === 'core') && prescriptionMode === 'target'
          ? form.repsTarget
          : null,
      repsRangeMin:
        (form.kind === 'strength' || form.kind === 'core') && prescriptionMode === 'range'
          ? form.repsRangeMin
          : null,
      repsRangeMax:
        (form.kind === 'strength' || form.kind === 'core') && prescriptionMode === 'range'
          ? form.repsRangeMax
          : null,
      durationSec:
        form.kind === 'cardio'
          ? form.durationSec
          : form.kind === 'core' && prescriptionMode === 'duration'
            ? form.durationSec
            : form.kind === 'warmup' || form.kind === 'stretch'
              ? form.durationSec && form.durationSec > 0
                ? form.durationSec
                : null
              : null,
      restSec: form.kind === 'strength' || form.kind === 'core' || form.kind === 'cardio' ? form.restSec : 0,
    };

    if ((payload.kind === 'strength' || payload.kind === 'core') && payload.exerciseId == null) {
      setError('Sélectionnez un exercice dans la liste.');
      return;
    }
    if (!payload.label) {
      setError('Le nom est requis.');
      return;
    }
    const validation = validateItemPatch(payload);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    setError('');
    try {
      if (itemId) {
        await updatePrescribedItem(itemId, payload);
      } else {
        await createPrescribedItem(templateId, payload);
      }
      navigate(`/settings/program/${templateId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible d'enregistrer l'élément.");
    }
  };

  const remove = async () => {
    if (!itemId) return;
    setError('');
    try {
      await softDeletePrescribedItem(itemId);
      navigate(`/settings/program/${templateId}`);
    } catch {
      setShowDelete(false);
      setError("Impossible de supprimer l'élément.");
    }
  };

  if (loading) return <div className={shared.screen} />;

  return (
    <div className={shared.screen}>
      <Link className={shared.backLink} to={`/settings/program/${templateId}`}>
        ← Séance
      </Link>
      <h1 className={shared.title}>{itemId ? 'Exercice' : 'Nouvel exercice'}</h1>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {missing ? (
        <p className={shared.muted}>Cet élément n’existe pas.</p>
      ) : (
        <>
          <div className={shared.plate}>
            <label className={styles.field}>
              Type
              <select
                className={styles.input}
                value={form.kind}
                onChange={(event) => setKind(event.target.value as ItemKind)}
              >
                {(Object.keys(KIND_LABELS) as ItemKind[]).map((kind) => (
                  <option value={kind} key={kind}>
                    {KIND_LABELS[kind]}
                  </option>
                ))}
              </select>
            </label>

            {(form.kind === 'strength' || form.kind === 'core' || form.kind === 'cardio') && (
              <button type="button" className={styles.pickerButton} onClick={() => setShowPicker(true)}>
                {form.exerciseId ? exerciseNames[form.exerciseId] || form.label : 'Choisir un exercice'}
              </button>
            )}

            <label className={styles.field}>
              Nom
              <input
                className={styles.input}
                value={form.label}
                onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
              />
            </label>

            {(form.kind === 'strength' || form.kind === 'core') && (
              <>
                <div className={styles.field}>
                  <span>Séries</span>
                  <Stepper
                    value={form.sets ?? 1}
                    step={1}
                    min={1}
                    fontSizePx={28}
                    onChange={(sets) => setForm((current) => ({ ...current, sets }))}
                  />
                </div>

                <label className={styles.field}>
                  Prescription
                  <select
                    className={styles.input}
                    value={prescriptionMode}
                    onChange={(event) => setMode(event.target.value as PrescriptionMode)}
                  >
                    <option value="target">Cible</option>
                    <option value="range">Fourchette</option>
                    {form.kind === 'core' && <option value="duration">Durée</option>}
                  </select>
                </label>

                {prescriptionMode === 'target' ? (
                  <div className={styles.field}>
                    <span>Répétitions cibles</span>
                    <Stepper
                      value={form.repsTarget ?? 1}
                      step={1}
                      min={1}
                      fontSizePx={28}
                      onChange={(repsTarget) => setForm((current) => ({ ...current, repsTarget }))}
                    />
                  </div>
                ) : prescriptionMode === 'range' ? (
                  <div className={styles.range}>
                    <div className={styles.field}>
                      <span>Minimum</span>
                      <Stepper
                        value={form.repsRangeMin ?? 1}
                        step={1}
                        min={1}
                        fontSizePx={24}
                        onChange={(repsRangeMin) => setForm((current) => ({ ...current, repsRangeMin }))}
                      />
                    </div>
                    <div className={styles.field}>
                      <span>Maximum</span>
                      <Stepper
                        value={form.repsRangeMax ?? 1}
                        step={1}
                        min={1}
                        fontSizePx={24}
                        onChange={(repsRangeMax) => setForm((current) => ({ ...current, repsRangeMax }))}
                      />
                    </div>
                  </div>
                ) : (
                  <div className={styles.field}>
                    <span>Durée</span>
                    <Stepper
                      value={form.durationSec ?? 30}
                      step={5}
                      min={5}
                      unit="s"
                      fontSizePx={28}
                      onChange={(durationSec) => setForm((current) => ({ ...current, durationSec }))}
                    />
                  </div>
                )}

                <div className={styles.field}>
                  <span>Repos</span>
                  <Stepper
                    value={form.restSec}
                    step={15}
                    min={0}
                    unit="s"
                    fontSizePx={28}
                    onChange={(restSec) => setForm((current) => ({ ...current, restSec }))}
                  />
                </div>

                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={form.perSide}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, perSide: event.target.checked }))
                    }
                  />
                  Par côté
                </label>
              </>
            )}

            {form.kind === 'cardio' && (
              <div className={styles.field}>
                <span>Repos</span>
                <Stepper
                  value={form.restSec}
                  step={15}
                  min={0}
                  unit="s"
                  fontSizePx={28}
                  onChange={(restSec) => setForm((current) => ({ ...current, restSec }))}
                />
              </div>
            )}

            {(form.kind === 'cardio' || form.kind === 'warmup' || form.kind === 'stretch') && (
              <div className={styles.field}>
                <span>Durée</span>
                <Stepper
                  value={(form.durationSec ?? 0) / 60}
                  step={1}
                  min={form.kind === 'cardio' ? 1 : 0}
                  unit="min"
                  fontSizePx={28}
                  onChange={(minutes) => setForm((current) => ({ ...current, durationSec: minutes * 60 }))}
                />
              </div>
            )}

            <label className={styles.field}>
              Notes
              <textarea
                className={styles.textarea}
                value={form.notes}
                rows={3}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </label>

            <BigButton variant="primary" onClick={() => void save()}>
              Enregistrer
            </BigButton>
          </div>

          {itemId && (
            <BigButton variant="danger" onClick={() => setShowDelete(true)}>
              Supprimer
            </BigButton>
          )}
        </>
      )}

      {showPicker && (
        <ExercisePickerSheet
          onClose={() => setShowPicker(false)}
          onPick={(exercise) => {
            setForm((current) => ({
              ...current,
              exerciseId: exercise.id,
              label: exercise.name,
            }));
            setShowPicker(false);
          }}
        />
      )}

      {showDelete && (
        <Sheet title="Supprimer cet élément ?" onClose={() => setShowDelete(false)}>
          <div className={styles.confirmation}>
            <p>Cet élément sera retiré de la séance.</p>
            <BigButton variant="danger" onClick={() => void remove()}>
              Confirmer la suppression
            </BigButton>
            <BigButton variant="ghost" onClick={() => setShowDelete(false)}>
              Annuler
            </BigButton>
          </div>
        </Sheet>
      )}
    </div>
  );
}
