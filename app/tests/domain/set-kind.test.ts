import { describe, expect, it } from 'vitest';
import {
  formatSetRir,
  isWarmupFromKind,
  normalizeRir,
  rirFromChip,
  setKindShortLabel,
} from '../../src/domain/set-kind';

describe('set-kind', () => {
  it('isWarmupFromKind', () => {
    expect(isWarmupFromKind('warmup')).toBe(true);
    expect(isWarmupFromKind('approach')).toBe(true);
    expect(isWarmupFromKind('work')).toBe(false);
  });

  it('normalizeRir force null hors work', () => {
    expect(normalizeRir('work', 2)).toBe(2);
    expect(normalizeRir('approach', 2)).toBeNull();
    expect(normalizeRir('warmup', 0)).toBeNull();
    expect(normalizeRir('work', null)).toBeNull();
  });

  it('rirFromChip mappe 3+', () => {
    expect(rirFromChip(0)).toBe(0);
    expect(rirFromChip('3+')).toBe(3);
  });

  it('labels', () => {
    expect(setKindShortLabel('warmup')).toBe('Échauffement');
    expect(setKindShortLabel('approach')).toBe('Préparation');
    expect(setKindShortLabel('work')).toBe('');
    expect(formatSetRir(2)).toBe('RIR 2');
    expect(formatSetRir(null)).toBe('');
  });
});
