import { useEffect } from 'react';

export interface WakeLockSentinelLike {
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
}

interface NavigatorLike {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
}

type DocEvent = 'visibilitychange' | 'click' | 'touchend' | 'keydown';

interface DocumentLike {
  visibilityState: string;
  addEventListener: (type: DocEvent, listener: () => void) => void;
  removeEventListener: (type: DocEvent, listener: () => void) => void;
}

const RETRY_MIN_MS = 1000;
const RETRY_MAX_MS = 30000;
// Evenements que les navigateurs comptent comme "activation utilisateur".
const GESTURE_EVENTS: DocEvent[] = ['click', 'touchend', 'keydown'];

// Controleur sans React (testable). Le navigateur relache le verrou de lui-meme quand la page est
// masquee, mais aussi dans d'autres cas (economiseur de batterie...) sans passer par visibilitychange :
// on ecoute donc l'evenement "release" du sentinel pour le reprendre tant que la seance dure.
// Safari iOS refuse (NotAllowedError) toute demande hors geste utilisateur : apres un retour au premier
// plan, la demande automatique echoue ; on la retente donc aussi au prochain appui de l'utilisateur.
export function createWakeLock(nav: NavigatorLike, doc: DocumentLike) {
  let stopped = true;
  let sentinel: WakeLockSentinelLike | null = null;
  let pending = false;
  let warned = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let retryDelay = RETRY_MIN_MS;

  const scheduleRetry = () => {
    if (stopped || retryTimer) return;
    const delay = retryDelay;
    retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void acquire();
    }, delay);
  };

  const acquire = async (): Promise<void> => {
    if (stopped || sentinel || pending || !nav.wakeLock) return;
    if (doc.visibilityState !== 'visible') return; // sera repris par visibilitychange
    pending = true;
    try {
      const s = await nav.wakeLock.request('screen');
      if (stopped) {
        // seance terminee pendant la requete : ne pas laisser un verrou orphelin
        void s.release();
        return;
      }
      sentinel = s;
      retryDelay = RETRY_MIN_MS;
      s.addEventListener('release', () => {
        if (sentinel === s) sentinel = null;
        if (!stopped && doc.visibilityState === 'visible') scheduleRetry();
      });
    } catch (err) {
      const e = err as { name?: string; message?: string };
      if (!warned) {
        warned = true;
        console.warn('[wakeLock] refuse:', e?.name, e?.message);
      }
      scheduleRetry();
    } finally {
      pending = false;
    }
  };

  const onVisibilityChange = () => {
    if (doc.visibilityState === 'visible') void acquire();
  };

  // Un appui : le geste valide la demande sur Safari iOS. No-op si le verrou est deja tenu.
  const onGesture = () => {
    void acquire();
  };

  return {
    start() {
      if (!stopped) return;
      stopped = false;
      warned = false;
      retryDelay = RETRY_MIN_MS;
      doc.addEventListener('visibilitychange', onVisibilityChange);
      GESTURE_EVENTS.forEach((ev) => doc.addEventListener(ev, onGesture));
      void acquire();
    },
    stop() {
      stopped = true;
      doc.removeEventListener('visibilitychange', onVisibilityChange);
      GESTURE_EVENTS.forEach((ev) => doc.removeEventListener(ev, onGesture));
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
      const s = sentinel;
      sentinel = null;
      void s?.release();
    },
  };
}

// §5.2: Wake Lock maintenue toute la seance, reacquise sur visibilitychange, release et prochain geste, liberee en fin de seance.
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const lock = createWakeLock(navigator as unknown as NavigatorLike, document);
    lock.start();
    return () => lock.stop();
  }, [active]);
}
