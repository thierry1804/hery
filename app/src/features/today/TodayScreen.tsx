import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Exercise, PrescribedItem, SessionTemplate, Workout } from '../../db/schema';
import { getAllTemplates, getPrescribedItems, getTemplateForDay } from '../../repositories/program.repo';
import { getExercisesByIds } from '../../repositories/exercises.repo';
import { getResumableWorkout, startWorkout } from '../../repositories/workouts.repo';
import { dayOfWeekIso } from '../../lib/date';
import { BigButton } from '../../ui/BigButton';
import { TodayProgressCard } from '../progress/TodayProgressCard';
import styles from './TodayScreen.module.css';

const DAY_NAMES = ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

export function TodayScreen() {
  const navigate = useNavigate();
  const [template, setTemplate] = useState<SessionTemplate | null | undefined>(undefined);
  const [items, setItems] = useState<PrescribedItem[]>([]);
  const [exercisesById, setExercisesById] = useState<Map<string, Exercise>>(new Map());
  const [resumable, setResumable] = useState<Workout | undefined>(undefined);
  const [allTemplates, setAllTemplates] = useState<SessionTemplate[]>([]);

  const loadTemplate = async (tpl: SessionTemplate) => {
    setTemplate(tpl);
    const prescribed = await getPrescribedItems(tpl.id);
    setItems(prescribed);
    const ids = Array.from(new Set(prescribed.map((i) => i.exerciseId).filter((x): x is string => !!x)));
    const exs = await getExercisesByIds(ids);
    setExercisesById(new Map(exs.map((e) => [e.id, e])));
  };

  useEffect(() => {
    void (async () => {
      const tpl = await getTemplateForDay(dayOfWeekIso());
      if (tpl) {
        await loadTemplate(tpl);
      } else {
        setTemplate(null);
        setAllTemplates(await getAllTemplates());
      }
      const r = await getResumableWorkout();
      setResumable(r);
    })();
  }, []);

  if (template === undefined) return <div className={styles.screen} />;

  const handleStart = async (tpl: SessionTemplate, tplItems: PrescribedItem[]) => {
    const workout = await startWorkout(tpl, tplItems);
    navigate(`/session/${workout.id}`);
  };

  if (template === null) {
    return (
      <div className={styles.screen}>
        <div className={styles.empty}>Aucune séance aujourd'hui. La prochaine séance est un jour de programme.</div>
        <TodayProgressCard />
        {resumable ? (
          <BigButton variant="primary" onClick={() => navigate(`/session/${resumable.id}`)}>
            Reprendre la séance
          </BigButton>
        ) : (
          <div className={styles.card}>
            <p className={styles.subtitle}>Séance hors programme (test / rattrapage)</p>
            {allTemplates.map((tpl) => (
              <BigButton
                key={tpl.id}
                variant="ghost"
                onClick={() =>
                  void (async () => {
                    const prescribed = await getPrescribedItems(tpl.id);
                    await handleStart(tpl, prescribed);
                  })()
                }
              >
                {tpl.label}
              </BigButton>
            ))}
          </div>
        )}
      </div>
    );
  }

  const strengthItems = items.filter((i) => i.kind === 'strength' || i.kind === 'core');

  return (
    <div className={styles.screen}>
      <div>
        <p className={styles.subtitle}>Aujourd'hui — {DAY_NAMES[dayOfWeekIso()]}</p>
        <h1 className={styles.title}>{template.label}</h1>
      </div>

      <div className={styles.card}>
        {strengthItems.map((it) => (
          <div key={it.id} className={styles.itemRow}>
            <span>{it.exerciseId ? exercisesById.get(it.exerciseId)?.name : it.label}</span>
            <span className="tabular">
              {it.sets ? `${it.sets}×${it.repsTarget ?? Math.round((it.durationSec ?? 0) / 60) + 'min'}` : ''}
            </span>
          </div>
        ))}
      </div>

      <TodayProgressCard />

      {resumable ? (
        <BigButton variant="primary" onClick={() => navigate(`/session/${resumable.id}`)}>
          Reprendre la séance
        </BigButton>
      ) : (
        <BigButton variant="primary" onClick={() => void handleStart(template, items)}>
          DÉMARRER
        </BigButton>
      )}
    </div>
  );
}
