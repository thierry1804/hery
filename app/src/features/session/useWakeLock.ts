import { useEffect, useRef } from 'react';

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

// §5.2: Wake Lock maintenue toute la seance, reacquise sur visibilitychange, liberee en fin de seance.
export function useWakeLock(active: boolean): void {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => {
    if (!active) return;

    const acquire = async () => {
      try {
        const nav = navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> } };
        if (!nav.wakeLock) return;
        sentinelRef.current = await nav.wakeLock.request('screen');
      } catch {
        // indisponible (navigateur, batterie faible...) : degrade sans bloquer la seance
      }
    };

    void acquire();

    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      void sentinelRef.current?.release();
      sentinelRef.current = null;
    };
  }, [active]);
}
