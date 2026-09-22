import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWakeLock, type WakeLockSentinelLike } from '../../src/features/session/useWakeLock';

function fakeEnv() {
  const sentinels: Array<WakeLockSentinelLike & { released: boolean; fireRelease: () => void }> = [];
  const request = vi.fn(async () => {
    let cb: () => void = () => {};
    const s = {
      released: false,
      release: vi.fn(async () => {
        s.released = true;
      }),
      addEventListener: (_t: 'release', l: () => void) => {
        cb = l;
      },
      fireRelease: () => {
        s.released = true;
        cb();
      },
    };
    sentinels.push(s);
    return s;
  });
  const byType = new Map<string, Set<() => void>>();
  const doc = {
    visibilityState: 'visible',
    addEventListener: (t: string, l: () => void) => {
      if (!byType.has(t)) byType.set(t, new Set());
      byType.get(t)!.add(l);
    },
    removeEventListener: (t: string, l: () => void) => byType.get(t)?.delete(l),
  };
  const fire = (t: string) => byType.get(t)?.forEach((l) => l());
  const listenerCount = () => [...byType.values()].reduce((n, set) => n + set.size, 0);
  return { nav: { wakeLock: { request } }, doc, request, sentinels, fire, listenerCount };
}

const flush = () => vi.advanceTimersByTimeAsync(0);

describe('createWakeLock', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('acquiert au demarrage et relache a l\'arret', async () => {
    const env = fakeEnv();
    const lock = createWakeLock(env.nav, env.doc);
    lock.start();
    await flush();
    expect(env.request).toHaveBeenCalledTimes(1);
    lock.stop();
    expect(env.sentinels[0].release).toHaveBeenCalled();
    expect(env.listenerCount()).toBe(0);
  });

  it('reprend le verrou quand le systeme le relache alors que la page reste visible', async () => {
    const env = fakeEnv();
    createWakeLock(env.nav, env.doc).start();
    await flush();
    env.sentinels[0].fireRelease();
    await vi.advanceTimersByTimeAsync(1000);
    expect(env.request).toHaveBeenCalledTimes(2);
  });

  it('reprend le verrou au retour au premier plan', async () => {
    const env = fakeEnv();
    createWakeLock(env.nav, env.doc).start();
    await flush();
    env.doc.visibilityState = 'hidden';
    env.sentinels[0].fireRelease();
    await vi.advanceTimersByTimeAsync(2000);
    expect(env.request).toHaveBeenCalledTimes(1);
    env.doc.visibilityState = 'visible';
    env.fire('visibilitychange');
    await flush();
    expect(env.request).toHaveBeenCalledTimes(2);
  });

  it('ne laisse pas de verrou orphelin si la seance se termine pendant la requete', async () => {
    const env = fakeEnv();
    const lock = createWakeLock(env.nav, env.doc);
    lock.start();
    lock.stop();
    await flush();
    expect(env.sentinels[0].release).toHaveBeenCalled();
  });

  it('reessaie apres un refus (ex. economiseur de batterie)', async () => {
    const env = fakeEnv();
    env.request.mockRejectedValueOnce(Object.assign(new Error('denied'), { name: 'NotAllowedError' }));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    createWakeLock(env.nav, env.doc).start();
    await flush();
    await vi.advanceTimersByTimeAsync(1000);
    expect(env.request).toHaveBeenCalledTimes(2);
    expect(env.sentinels).toHaveLength(1);
  });

  it('ne fait rien sans API Wake Lock', async () => {
    const env = fakeEnv();
    const lock = createWakeLock({}, env.doc);
    lock.start();
    await flush();
    expect(env.request).not.toHaveBeenCalled();
    lock.stop();
  });

  it('Safari iOS : refus hors geste apres retour au premier plan, repris au prochain appui', async () => {
    const env = fakeEnv();
    createWakeLock(env.nav, env.doc).start();
    await flush();
    env.doc.visibilityState = 'hidden';
    env.sentinels[0].fireRelease();
    env.doc.visibilityState = 'visible';
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    env.request.mockRejectedValueOnce(Object.assign(new Error('denied'), { name: 'NotAllowedError' }));
    env.fire('visibilitychange'); // demande automatique : refusee
    await flush();
    expect(env.sentinels).toHaveLength(1);
    env.fire('touchend'); // l'utilisateur appuie : la demande passe
    await flush();
    expect(env.sentinels).toHaveLength(2);
    env.fire('click'); // verrou tenu : pas de nouvelle demande
    await flush();
    expect(env.request).toHaveBeenCalledTimes(3);
  });

  it('rafraichit le verrou tenu a intervalle regulier (verrou WebKit relache en silence)', async () => {
    const env = fakeEnv();
    createWakeLock(env.nav, env.doc).start();
    await flush();
    expect(env.request).toHaveBeenCalledTimes(1);
    // Ni fireRelease ni visibilitychange : simule un verrou tombe sans notifier le sentinel.
    await vi.advanceTimersByTimeAsync(20000);
    expect(env.request).toHaveBeenCalledTimes(2);
    expect(env.sentinels[0].release).toHaveBeenCalled();
  });

  it('espace les essais automatiques apres des refus repetes', async () => {
    const env = fakeEnv();
    env.request.mockRejectedValue(Object.assign(new Error('denied'), { name: 'NotAllowedError' }));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    createWakeLock(env.nav, env.doc).start();
    await flush();
    await vi.advanceTimersByTimeAsync(1000); // essai 2
    await vi.advanceTimersByTimeAsync(1000); // pas encore l'essai 3 (delai 2 s)
    expect(env.request).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1000);
    expect(env.request).toHaveBeenCalledTimes(3);
  });
});
