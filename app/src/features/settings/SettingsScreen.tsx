import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../db/db';
import { SETTINGS_KEYS } from '../../db/schema';
import { formatDateFr } from '../../lib/date';
import { exportAll, getLastExportAt, importAll } from '../../repositories/data.repo';
import { apiMe } from '../../sync/api';
import { runSync } from '../../sync/runSync';
import { clearToken, getToken } from '../../sync/token';
import { BigButton } from '../../ui/BigButton';
import styles from './SettingsScreen.module.css';
import pkg from '../../../package.json';

export function SettingsScreen() {
  const [lastExportAt, setLastExportAt] = useState<string | undefined>();
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>();
  const [syncing, setSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshAccount = async () => {
    const token = getToken();
    if (!token) {
      setEmail(null);
      return;
    }
    try {
      const user = await apiMe();
      setEmail(user.email);
    } catch {
      setEmail(null);
    }
    const status = await db.settings.get(SETTINGS_KEYS.lastSyncStatus);
    const synced = await db.settings.get(SETTINGS_KEYS.lastSyncedAt);
    setSyncStatus(typeof status?.value === 'string' ? status.value : '');
    setLastSyncedAt(typeof synced?.value === 'string' ? synced.value : undefined);
  };

  useEffect(() => {
    void getLastExportAt().then(setLastExportAt);
    if (navigator.storage?.persisted) {
      void navigator.storage.persisted().then(setPersisted);
    }
    void refreshAccount();
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
    setImporting(true);
    try {
      const text = await file.text();
      await importAll(text, mode);
      window.location.reload();
    } finally {
      setImporting(false);
    }
  };

  const requestPersist = async () => {
    if (navigator.storage?.persist) {
      const ok = await navigator.storage.persist();
      setPersisted(ok);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await runSync();
      await refreshAccount();
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    setEmail(null);
    setSyncStatus('');
    setLastSyncedAt(undefined);
  };

  const syncLabel =
    syncStatus === 'ok'
      ? 'OK'
      : syncStatus === 'error'
        ? 'Erreur'
        : syncStatus === 'pending'
          ? 'En attente'
          : '—';

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Réglages</h1>
      </header>

      <section className={styles.plate}>
        <h2 className={styles.sectionTitle}>Compte</h2>
        {email ? (
          <>
            <div className={styles.row}>
              <span>Email</span>
              <span>{email}</span>
            </div>
            <div className={styles.row}>
              <span>Dernière sync</span>
              <span>
                {lastSyncedAt ? formatDateFr(lastSyncedAt.slice(0, 10)) : 'jamais'} · {syncLabel}
              </span>
            </div>
            <BigButton variant="primary" disabled={syncing} onClick={() => void handleSync()}>
              Synchroniser
            </BigButton>
            <BigButton variant="ghost" onClick={handleLogout}>
              Déconnexion
            </BigButton>
          </>
        ) : (
          <>
            <p className={styles.hint}>Sync cloud optionnelle. L’app reste utilisable hors-ligne sans compte.</p>
            <Link className={styles.link} to="/login">
              Connexion →
            </Link>
            <Link className={styles.link} to="/register">
              Créer un compte →
            </Link>
          </>
        )}
      </section>

      <section className={styles.plate}>
        <h2 className={styles.sectionTitle}>Programme</h2>
        <Link className={styles.link} to="/settings/program">
          Modifier le programme →
        </Link>
      </section>

      <section className={styles.plate}>
        <h2 className={styles.sectionTitle}>Application</h2>
        <div className={styles.row}>
          <span>Version</span>
          <span className="tabular">{pkg.version}</span>
        </div>
        <div className={styles.row}>
          <span>Stockage persistant</span>
          <span>{persisted == null ? '—' : persisted ? 'Actif' : 'Inactif'}</span>
        </div>
        {persisted === false && (
          <BigButton variant="ghost" onClick={() => void requestPersist()}>
            Activer le stockage persistant
          </BigButton>
        )}
      </section>

      <section className={styles.plate}>
        <h2 className={styles.sectionTitle}>Sauvegarde</h2>
        <div className={styles.row}>
          <span>Dernier export</span>
          <span className={isStale ? styles.warn : undefined}>
            {lastExportAt ? formatDateFr(lastExportAt.slice(0, 10)) : 'jamais'}
            {isStale ? ' · à exporter' : ''}
          </span>
        </div>
        <BigButton variant="primary" onClick={() => void handleExport()}>
          Exporter mes données
        </BigButton>
      </section>

      <section className={styles.plate}>
        <h2 className={styles.sectionTitle}>Import</h2>
        <p className={styles.hint}>
          Fichier JSON exporté depuis HERY. Remplacer écrase tout ; fusionner conserve les deux.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className={styles.fileInput}
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            setPendingFile(file);
            e.target.value = '';
          }}
        />
        {!pendingFile ? (
          <BigButton variant="ghost" onClick={() => fileInputRef.current?.click()}>
            Choisir un fichier
          </BigButton>
        ) : (
          <div className={styles.importActions}>
            <p className={styles.fileName}>{pendingFile.name}</p>
            <BigButton
              variant="primary"
              disabled={importing}
              onClick={() => void handleImportFile(pendingFile, 'merge')}
            >
              Fusionner
            </BigButton>
            <BigButton
              variant="danger"
              disabled={importing}
              onClick={() => void handleImportFile(pendingFile, 'replace')}
            >
              Remplacer tout
            </BigButton>
            <BigButton variant="ghost" disabled={importing} onClick={() => setPendingFile(null)}>
              Annuler
            </BigButton>
          </div>
        )}
      </section>
    </div>
  );
}
