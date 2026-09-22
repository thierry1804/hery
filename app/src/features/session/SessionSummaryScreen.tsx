import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getWorkoutCoachBrief, type CoachProposalLine } from '../../repositories/coach-apply.repo';
import { summarizeSessionAppreciation, type AppreciationTone } from '../../domain/session-appreciation';
import { BigButton } from '../../ui/BigButton';
import { SessionEndBrief } from './SessionEndBrief';
import styles from './SessionSummaryScreen.module.css';

interface SummaryLocationState {
  lines?: CoachProposalLine[];
}

const TONE_CLASS: Record<AppreciationTone, string> = {
  positive: styles.appreciationPositive,
  neutral: styles.appreciationNeutral,
  caution: styles.appreciationCaution,
};

// Ecran dedie affiche a la fin de chaque seance : analyse de ce qui a ete fait (statut par
// exercice, charge/reps/RIR retenus pour la prochaine fois). Les lignes sont normalement
// transmises via l'etat de navigation (deja calculees en actant les propositions coach) ;
// a defaut (arrivee directe sur l'URL), on les recalcule.
export function SessionSummaryScreen() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const stateLines = (location.state as SummaryLocationState | null)?.lines;
  const [lines, setLines] = useState<CoachProposalLine[]>(stateLines ?? []);
  const [loading, setLoading] = useState(stateLines == null);

  useEffect(() => {
    if (stateLines != null || !workoutId) return;
    void getWorkoutCoachBrief(workoutId).then((result) => {
      setLines(result);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutId]);

  const appreciation = loading ? null : summarizeSessionAppreciation(lines);

  return (
    <div className={`${styles.screen} calm-bg`}>
      <header className={styles.header}>
        <p className={styles.subtitle}>Séance terminée</p>
        <h1 className={styles.title}>Bilan de la séance</h1>
      </header>

      <div className={styles.content}>
        {appreciation ? (
          <section className={`${styles.appreciation} ${TONE_CLASS[appreciation.tone]}`} aria-live="polite">
            <p className={styles.appreciationHeadline}>{appreciation.headline}</p>
            <p className={styles.appreciationAdvice}>{appreciation.advice}</p>
          </section>
        ) : null}

        {loading ? null : lines.length > 0 ? (
          <SessionEndBrief lines={lines} />
        ) : (
          <p className={styles.empty}>
            Rien à ajuster cette fois : continue sur cette lancée à la prochaine séance.
          </p>
        )}
      </div>

      <div className={styles.footer}>
        <BigButton variant="primary" onClick={() => navigate('/', { replace: true })}>
          Retour à l&apos;accueil
        </BigButton>
      </div>
    </div>
  );
}
