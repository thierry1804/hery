import { describe, expect, it } from 'vitest';
import { mergeLww, mergeTables } from '../../src/sync/merge';

describe('mergeLww', () => {
  it('keeps newer updatedAt', () => {
    const local = { id: 'a', updatedAt: '2026-01-02T00:00:00.000Z', v: 1 };
    const remote = { id: 'a', updatedAt: '2026-01-03T00:00:00.000Z', v: 2 };
    expect(mergeLww(local, remote).v).toBe(2);
  });

  it('keeps local if newer', () => {
    const local = { id: 'a', updatedAt: '2026-01-04T00:00:00.000Z', v: 1 };
    const remote = { id: 'a', updatedAt: '2026-01-03T00:00:00.000Z', v: 2 };
    expect(mergeLww(local, remote).v).toBe(1);
  });

  it('incoming wins on equal timestamp', () => {
    const local = { id: 'a', updatedAt: '2026-01-03T00:00:00.000Z', v: 1 };
    const remote = { id: 'a', updatedAt: '2026-01-03T00:00:00.000Z', v: 2 };
    expect(mergeLww(local, remote).v).toBe(2);
  });
});

describe('mergeTables', () => {
  it('merges by id', () => {
    const local = [{ id: 'a', updatedAt: '2026-01-01T00:00:00.000Z', v: 1 }];
    const remote = [
      { id: 'a', updatedAt: '2026-01-02T00:00:00.000Z', v: 2 },
      { id: 'b', updatedAt: '2026-01-02T00:00:00.000Z', v: 3 },
    ];
    const merged = mergeTables(local, remote);
    expect(merged).toHaveLength(2);
    expect(merged.find((r) => r.id === 'a')?.v).toBe(2);
    expect(merged.find((r) => r.id === 'b')?.v).toBe(3);
  });
});
