import type { PrKind } from '../db/schema';

const LABELS: Record<PrKind, string> = {
  weight: 'charge',
  reps: 'reps',
  e1rm: 'e1RM',
  volume: 'volume',
};

export function formatPrBanner(kinds: PrKind[]): string {
  if (kinds.length === 0) return '';
  const unique = [...new Set(kinds)];
  return `Record · ${unique.map((k) => LABELS[k]).join(' · ')}`;
}

export function unionPrKinds(a: PrKind[], b: PrKind[]): PrKind[] {
  return [...new Set([...a, ...b])];
}
