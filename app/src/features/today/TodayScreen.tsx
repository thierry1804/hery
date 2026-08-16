import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Exercise, PrescribedItem, SessionTemplate, Workout } from '../../db/schema';
import { getAllTemplates, getPrescribedItems, getTemplateForDay } from '../../repositories/program.repo';
import { getExercisesByIds } from '../../repositories/exercises.repo';
import { getResumableWorkout, startWorkout } from '../../repositories/workouts.repo';
import { dayOfWeekIso } from '../../lib/date';
import { BigButton } from '../../ui/BigButton';
import { FlameIcon, HeartIcon, StretchIcon } from '../../ui/icons';
import { TodayProgressCard } from '../progress/TodayProgressCard';
import styles from './TodayScreen.module.css';

const DAY_NAMES = ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

function formatPrescription(it: PrescribedItem): string {
  if (it.sets && it.repsTarget != null) return `${it.sets}×${it.repsTarget}`;
  if (it.sets && it.repsRangeMin != null && it.repsRangeMax != null) {
    return `${it.sets}×${it.repsRangeMin}–${it.repsRangeMax}`;
  }
  if (it.durationSec != null) {
    const min = Math.round(it.durationSec / 60);
    return min > 0 ? `${min} min` : `${it.durationSec} s`;
  }
  if (it.sets) return `${it.sets} séries`;
  return '';
}

function nextProgramDayLabel(templates: SessionTemplate[], fromDay: number): string | null {
  if (templates.length === 0) return null;
  for (let offset = 1; offset <= 7; offset++) {
    const day = ((fromDay - 1 + offset) % 7) + 1;
    const tpl = templates.find((t) => t.dayOfWeek === day);
    if (tpl) return DAY_NAMES[day] ?? null;
  }
  return null;
}

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
      const templates = await getAllTemplates();
      setAllTemplates(templates);
      const tpl = await getTemplateForDay(dayOfWeekIso());
      if (tpl) {
        await loadTemplate(tpl);
      } else {
        setTemplate(null);
      }
      const r = await getResumableWorkout();
      setResumable(r);
    })();
  }, []);

  if (template === undefined) {
    return (
      <div className={`${styles.screen} calm-bg`} aria-busy="true">
        <div className={styles.skeletonBlock} />
        <div className={styles.skeletonBlock} />
        <div className={styles.skeletonCta} />
      </div>
    );
  }

  const handleStart = async (tpl: SessionTemplate, tplItems: PrescribedItem[]) => {
    const workout = await startWorkout(tpl, tplItems);
    navigate(`/session/${workout.id}`);
  };

  if (template === null) {
    const nextDay = nextProgramDayLabel(allTemplates, dayOfWeekIso());
    return (
      <div className={`${styles.screen} calm-bg`}>
        <header className={styles.header}>
          <p className={styles.subtitle}>Aujourd&apos;hui — {DAY_NAMES[dayOfWeekIso()]}</p>
          <h1 className={styles.title}>Repos</h1>
          <p className={styles.empty}>
            {resumable
              ? 'Séance interrompue à reprendre.'
              : nextDay
                ? `Aucune séance. La prochaine est ${nextDay}.`
                : "Aucune séance prévue aujourd'hui."}
          </p>
        </header>

        <TodayProgressCard />

        <div className={styles.footer}>
          {resumable ? (
            <BigButton variant="primary" onClick={() => navigate(`/session/${resumable.id}`)}>
              Reprendre la séance
            </BigButton>
          ) : (
            <div className={styles.plate}>
              <p className={styles.plateLabel}>Séance hors programme</p>
              <div className={styles.templateList}>
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
            </div>
          )}
        </div>
      </div>
    );
  }

  const strengthItems = items.filter((i) => i.kind === 'strength' || i.kind === 'core');
  const supportKinds = Array.from(
    new Set(
      items
        .filter((i) => i.kind === 'warmup' || i.kind === 'cardio' || i.kind === 'stretch')
        .map((i) => i.kind as 'warmup' | 'cardio' | 'stretch'),
    ),
  );

  return (
    <div className={`${styles.screen} calm-bg`}>
      <header className={styles.header}>
        <p className={styles.subtitle}>Aujourd&apos;hui — {DAY_NAMES[dayOfWeekIso()]}</p>
        <h1 className={styles.title}>{template.label}</h1>
        <p className={styles.meta}>
          <span className="tabular">{strengthItems.length}</span> mouvements
          <span className={styles.metaSep}>·</span>
          ~<span className="tabular">{template.targetDurationMin}</span> min
        </p>
      </header>

      <div className={styles.plate}>
        {strengthItems.map((it) => {
          const name = it.exerciseId ? exercisesById.get(it.exerciseId)?.name : it.label;
          const prescription = formatPrescription(it);
          return (
            <div key={it.id} className={styles.itemRow}>
              <span className={styles.itemName}>{name}</span>
              {prescription ? <span className={`tabular ${styles.itemRx}`}>{prescription}</span> : null}
            </div>
          );
        })}
        {supportKinds.length > 0 && (
          <div className={styles.support}>
            {supportKinds.map((kind) => (
              <span key={kind} className={styles.supportItem}>
                {kind === 'warmup' && <FlameIcon className="icon-inline" />}
                {kind === 'cardio' && <HeartIcon className="icon-inline" />}
                {kind === 'stretch' && <StretchIcon className="icon-inline" />}
                {kind === 'warmup' ? 'Échauffement' : kind === 'cardio' ? 'Cardio' : 'Étirements'}
              </span>
            ))}
          </div>
        )}
      </div>

      <TodayProgressCard />

      <div className={styles.footer}>
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
    </div>
  );
}
