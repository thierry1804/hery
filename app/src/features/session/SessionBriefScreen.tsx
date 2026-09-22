import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { PrescribedItem, SessionTemplate } from '../../db/schema';
import { getPrescribedItems, getTemplateById } from '../../repositories/program.repo';
import { startWorkout } from '../../repositories/workouts.repo';
import { loadSessionBrief } from '../../repositories/session-brief.repo';
import { BigButton } from '../../ui/BigButton';
import { SessionBrief } from '../today/SessionBrief';
import styles from './SessionBriefScreen.module.css';

// Ecran dedie affiche avant chaque seance : objectifs par exercice (charge/reps/RIR vises)
// issus de la memoire de progression, avant que l'utilisateur ne demarre la seance.
export function SessionBriefScreen() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<SessionTemplate | null | undefined>(undefined);
  const [items, setItems] = useState<PrescribedItem[]>([]);
  const [briefLines, setBriefLines] = useState<{ name: string; text: string }[]>([]);
  const [painWatch, setPainWatch] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!templateId) {
        navigate('/', { replace: true });
        return;
      }
      const tpl = await getTemplateById(templateId);
      if (!tpl) {
        navigate('/', { replace: true });
        return;
      }
      setTemplate(tpl);
      const prescribed = await getPrescribedItems(tpl.id);
      setItems(prescribed);
      const ids = Array.from(
        new Set(prescribed.map((i) => i.exerciseId).filter((x): x is string => !!x)),
      );
      const brief = await loadSessionBrief(ids);
      setBriefLines(brief.lines);
      setPainWatch(brief.painWatch);
    })();
  }, [templateId, navigate]);

  if (template === undefined) {
    return (
      <div className={`${styles.screen} calm-bg`} aria-busy="true">
        <div className={styles.skeletonBlock} />
      </div>
    );
  }

  const handleStart = async () => {
    if (starting || !template) return;
    setStarting(true);
    try {
      const workout = await startWorkout(template, items);
      navigate(`/session/${workout.id}`, { replace: true });
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className={`${styles.screen} calm-bg`}>
      <header className={styles.header}>
        <p className={styles.subtitle}>Avant de commencer</p>
        <h1 className={styles.title}>{template.label}</h1>
      </header>

      {briefLines.length > 0 || painWatch ? (
        <SessionBrief lines={briefLines} painWatch={painWatch} />
      ) : (
        <p className={styles.empty}>Pas d&apos;objectif particulier cette fois : suis le programme prévu.</p>
      )}

      <div className={styles.footer}>
        <BigButton variant="primary" disabled={starting} onClick={() => void handleStart()}>
          Commencer la séance
        </BigButton>
        <BigButton variant="ghost" disabled={starting} onClick={() => navigate('/')}>
          Annuler
        </BigButton>
      </div>
    </div>
  );
}
