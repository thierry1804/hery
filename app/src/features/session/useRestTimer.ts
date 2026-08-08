import { useCallback, useEffect, useRef, useState } from 'react';
import { restEndFeedback } from '../../lib/haptics';

// RG-08: le decompte est pilote par un timestamp de fin persiste, jamais par setInterval seul.
export function useRestTimer(restEndsAt: number | null, onComplete: () => void) {
  const [remainingSec, setRemainingSec] = useState(0);
  const rafRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  const tick = useCallback(() => {
    if (restEndsAt == null) {
      setRemainingSec(0);
      return;
    }
    const remaining = Math.max(0, Math.round((restEndsAt - Date.now()) / 1000));
    setRemainingSec(remaining);
    if (remaining <= 0) {
      if (!firedRef.current) {
        firedRef.current = true;
        restEndFeedback();
        onComplete();
      }
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [restEndsAt, onComplete]);

  useEffect(() => {
    firedRef.current = false;
    if (restEndsAt == null) {
      setRemainingSec(0);
      return;
    }
    tick();
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restEndsAt]);

  return remainingSec;
}
