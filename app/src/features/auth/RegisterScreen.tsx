import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRegister } from '../../sync/api';
import { runSync } from '../../sync/runSync';
import { setToken } from '../../sync/token';
import { BigButton } from '../../ui/BigButton';
import styles from './authShared.module.css';

export function RegisterScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await apiRegister(email, password);
      setToken(res.token);
      void runSync();
      navigate('/settings');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Inscription impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>Créer un compte</h1>
      <div className={styles.plate}>
        <label className={styles.field}>
          Email
          <input
            className={styles.input}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          Mot de passe (8 caractères min.)
          <input
            className={styles.input}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className={styles.error}>{error}</p>}
        <BigButton variant="primary" disabled={busy || !email || password.length < 8} onClick={() => void submit()}>
          Créer le compte
        </BigButton>
        <Link className={styles.link} to="/login">
          Déjà un compte →
        </Link>
      </div>
    </div>
  );
}
