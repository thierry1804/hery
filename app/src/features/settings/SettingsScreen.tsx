import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { exportAll, getLastExportAt, importAll } from '../../repositories/data.repo';
import { formatDateFr } from '../../lib/date';
import { BigButton } from '../../ui/BigButton';
import styles from './SettingsScreen.module.css';
import pkg from '../../../package.json';

export function SettingsScreen() {
  const [lastExportAt, setLastExportAt] = useState<string | undefined>();
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void getLastExportAt().then(setLastExportAt);
    if (navigator.storage?.persisted) {
      void navigator.storage.persisted().then(setPersisted);
    }
  }, []);

  const isStale = lastExportAt ? Date.now() - new Date(lastExportAt).getTime() > 14 * 24 * 3600 * 1000 : true;

  const handleExport = async () => {
    const json = await exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hery-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setLastExportAt(await getLastExportAt());
  };

  const handleImportFile = async (file: File, mode: 'replace' | 'merge') => {
    const text = await file.text();
    await importAll(text, mode);
    window.location.reload();
  };

  const requestPersist = async () => {
    if (navigator.storage?.persist) {
      const ok = await navigator.storage.persist();
      setPersisted(ok);
    }
  };

  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>Réglages</h1>

      <div className={styles.card}>
        <span>Programme</span>
        <Link className={styles.link} to="/settings/program">
          Modifier le programme →
        </Link>
      </div>

      <div className={styles.card}>
        <div className={styles.row}>
          <span>Version</span>
          <span>{pkg.version}</span>
        </div>
        <div className={styles.row}>
          <span>Stockage persistant</span>
          <span>{persisted == null ? '—' : persisted ? 'Oui' : 'Non'}</span>
        </div>
        {persisted === false && (
          <BigButton variant="ghost" onClick={() => void requestPersist()}>
            Activer le stockage persistant
          </BigButton>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.row}>
          <span>Dernier export</span>
          <span className={isStale ? styles.warn : ''}>
            {lastExportAt ? formatDateFr(lastExportAt.slice(0, 10)) : 'jamais'}
          </span>
        </div>
        <BigButton variant="primary" onClick={() => void handleExport()}>
          Exporter mes données
        </BigButton>
      </div>

      <div className={styles.card}>
        <span>Importer une sauvegarde</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const mode = window.confirm(
              'OK = remplacer toutes les données actuelles. Annuler = fusionner avec les données actuelles.',
            )
              ? 'replace'
              : 'merge';
            void handleImportFile(file, mode);
          }}
        />
        <BigButton variant="ghost" onClick={() => fileInputRef.current?.click()}>
          Choisir un fichier
        </BigButton>
      </div>
    </div>
  );
}
