import { useCallback, useEffect, useRef, useState } from 'react';
import { restEndFeedback } from '../../lib/haptics';

export interface RestTimerState {
  /** Secondes affichées (arrondi à la seconde). */
  remainingSec: number;
  /** Millisecondes restantes exactes, pour l'arc. */
  remainingMs: number;
}

// RG-08: le decompte est pilote par un timestamp de fin persiste, jamais par setInterval seul.
export function useRestTimer(restEndsAt: number | null, onComplete: () => void): RestTimerState {
  const [state, setState] = useState<RestTimerState>({ remainingSec: 0, remainingMs: 0 });
  const rafRef = useRef<number | null>(null);
  const firedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const tick = useCallback(() => {
    if (restEndsAt == null) {
      setState({ remainingSec: 0, remainingMs: 0 });
      return;
    }

    const remainingMs = Math.max(0, restEndsAt - Date.now());
    const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
    setState({ remainingSec, remainingMs });

    if (remainingMs <= 0) {
      if (!firedRef.current) {
        firedRef.current = true;
        restEndFeedback();
        onCompleteRef.current();
      }
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [restEndsAt]);

  useEffect(() => {
    firedRef.current = false;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);

    if (restEndsAt == null) {
      setState({ remainingSec: 0, remainingMs: 0 });
      return;
    }

    tick();

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        tick();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [restEndsAt, tick]);

  return state;
}
