let audioCtx: AudioContext | null = null;

export function vibrate(pattern: number | number[]): void {
  if ('vibrate' in navigator) navigator.vibrate(pattern);
}

// Canal principal en salle: le son, via les ecouteurs filaires (02-architecture-technique.md §5.3).
export function playBeep(durationMs = 200, frequency = 880): void {
  try {
    audioCtx ??= new AudioContext();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = frequency;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + durationMs / 1000);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + durationMs / 1000 + 0.02);
  } catch {
    // audio indisponible (autoplay bloque, etc.) : degrade silencieusement
  }
}

export function confirmSetFeedback(): void {
  vibrate(15);
}

export function restEndFeedback(): void {
  vibrate([0, 200, 100, 200]);
  playBeep(300, 660);
}
