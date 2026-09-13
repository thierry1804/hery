export type SetKind = 'warmup' | 'approach' | 'work';

export function isWarmupFromKind(kind: SetKind): boolean {
  return kind !== 'work';
}

export function normalizeRir(kind: SetKind, rir: number | null): number | null {
  if (kind !== 'work') return null;
  return rir;
}

export function rirFromChip(chip: 0 | 1 | 2 | '3+'): number {
  return chip === '3+' ? 3 : chip;
}

export function setKindShortLabel(kind: SetKind): string {
  if (kind === 'warmup') return 'É';
  if (kind === 'approach') return 'A';
  return '';
}

export function formatSetRir(rir: number | null): string {
  return rir == null ? '' : `RIR ${rir}`;
}
