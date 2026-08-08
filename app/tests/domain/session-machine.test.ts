import { describe, expect, it } from 'vitest';
import { canResume, shouldAutoAbandon } from '../../src/domain/session-machine';

function isoHoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600 * 1000).toISOString();
}

describe('shouldAutoAbandon (RG-09)', () => {
  it('abandonne une seance in_progress inactive depuis plus de 6h', () => {
    expect(shouldAutoAbandon({ status: 'in_progress', updatedAt: isoHoursAgo(7) })).toBe(true);
  });

  it('ne touche pas une seance active recente', () => {
    expect(shouldAutoAbandon({ status: 'in_progress', updatedAt: isoHoursAgo(1) })).toBe(false);
  });

  it('ignore une seance deja terminee', () => {
    expect(shouldAutoAbandon({ status: 'completed', updatedAt: isoHoursAgo(10) })).toBe(false);
  });
});

describe('canResume', () => {
  it('une seance in_progress est toujours reprenable', () => {
    expect(canResume({ status: 'in_progress', updatedAt: isoHoursAgo(20) })).toBe(true);
  });

  it('une seance abandonnee reste reprenable pendant 24h', () => {
    expect(canResume({ status: 'abandoned', updatedAt: isoHoursAgo(23) })).toBe(true);
    expect(canResume({ status: 'abandoned', updatedAt: isoHoursAgo(25) })).toBe(false);
  });
});
