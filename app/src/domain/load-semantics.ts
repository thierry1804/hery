export type LoadSemantics = 'external_weight' | 'bodyweight' | 'assistance' | 'machine_resistance';

export function isLoadHistoryComparable(weightsKg: number[], thresholdRatio = 0.3): boolean {
  const weights = weightsKg.filter((w) => w != null && Number.isFinite(w));
  if (weights.length < 2) return true;
  const sorted = [...weights].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
  if (median <= 0) return true;
  const latest = weights[weights.length - 1]!;
  return Math.abs(latest - median) / median <= thresholdRatio;
}

export function nextLoadKg(
  currentKg: number,
  incrementKg: number,
  semantics: LoadSemantics,
  direction: 'up' | 'down',
): number {
  const sign = direction === 'up' ? 1 : -1;
  const delta = semantics === 'assistance' ? -sign * incrementKg : sign * incrementKg;
  return Math.max(0, Number((currentKg + delta).toFixed(2)));
}
