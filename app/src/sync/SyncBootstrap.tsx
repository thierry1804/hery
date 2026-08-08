import { useEffect } from 'react';
import { runSync } from './runSync';
import { getToken } from './token';

/** Déclenche une sync au mount (si JWT) et au retour online. */
export function SyncBootstrap() {
  useEffect(() => {
    if (getToken()) void runSync();

    const onOnline = () => {
      if (getToken()) void runSync();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  return null;
}
