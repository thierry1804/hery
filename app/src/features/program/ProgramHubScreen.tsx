import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ProgramCycle, SessionTemplate } from '../../db/schema';
import {
  getActiveCycle,
  getAllTemplates,
  restoreProgramFromSeed,
  updateCycle,
} from '../../repositories/program.repo';
import { BigButton } from '../../ui/BigButton';
import { Sheet } from '../../ui/Sheet';
import { DAY_NAMES } from './days';
import shared from './programShared.module.css';
import styles from './ProgramHubScreen.module.css';

export function ProgramHubScreen() {
  const [cycle, setCycle] = useState<ProgramCycle>();
  const [cycleName, setCycleName] = useState('');
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRestore, setShowRestore] = useState(false);
  const [error, setError] = useState('');

  const loadProgram = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [activeCycle, allTemplates] = await Promise.all([getActiveCycle(), getAllTemplates()]);
      setCycle(activeCycle);
      setCycleName(activeCycle?.name ?? '');
      setTemplates(allTemplates);
    } catch {
      setError('Impossible de charger le programme.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProgram();
  }, [loadProgram]);

  const saveCycleName = async () => {
    if (!cycle) return;
    setError('');
    try {
      await updateCycle(cycle.id, { name: cycleName.trim() });
      setCycle({ ...cycle, name: cycleName.trim() });
    } catch {
      setError('Impossible d’enregistrer le nom du cycle.');
    }
  };

  const restoreProgram = async () => {
    setError('');
    try {
      await restoreProgramFromSeed();
      setShowRestore(false);
      await loadProgram();
    } catch {
      setShowRestore(false);
      setError('Impossible de restaurer le programme.');
    }
  };

  if (loading) return <div className={shared.screen} />;

  return (
    <div className={shared.screen}>
      <Link className={shared.backLink} to="/settings">
        ← Réglages
      </Link>
      <h1 className={shared.title}>Programme</h1>

      {error && <p className={styles.error}>{error}</p>}

      <div className={shared.plate}>
        <label className={styles.field}>
          Nom du cycle
          <input
            className={styles.input}
            value={cycleName}
            disabled={!cycle}
            onChange={(event) => setCycleName(event.target.value)}
          />
        </label>
        <BigButton
          variant="primary"
          disabled={!cycle || !cycleName.trim()}
          onClick={() => void saveCycleName()}
        >
          Enregistrer
        </BigButton>
      </div>

      <div className={shared.plate}>
        {templates.map((template) => (
          <Link
            key={template.id}
            className={shared.row}
            to={`/settings/program/${template.id}`}
          >
            <span className={styles.sessionName}>
              <strong>{template.label}</strong>
              <span className={shared.muted}>
                {DAY_NAMES[template.dayOfWeek]} · {template.targetDurationMin} min
              </span>
            </span>
            <span className={styles.arrow}>→</span>
          </Link>
        ))}
        {templates.length === 0 && <span className={shared.muted}>Aucune séance programmée.</span>}
      </div>

      <BigButton variant="danger" onClick={() => setShowRestore(true)}>
        Restaurer le programme initial
      </BigButton>

      {showRestore && (
        <Sheet title="Restaurer le programme ?" onClose={() => setShowRestore(false)}>
          <div className={styles.sheetBody}>
            <p>Les séances personnalisées seront remplacées par le programme initial.</p>
            <BigButton variant="danger" onClick={() => void restoreProgram()}>
              Restaurer
            </BigButton>
            <BigButton variant="ghost" onClick={() => setShowRestore(false)}>
              Annuler
            </BigButton>
          </div>
        </Sheet>
      )}
    </div>
  );
}
