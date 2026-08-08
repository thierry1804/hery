import { useEffect, useRef } from 'react';
import type { SetLog } from '../../db/schema';
import { ChalkMark } from '../../ui/ChalkMark';
import styles from './SetInput.module.css';

interface Props {
  loggedSets: SetLog[];
  totalSets: number;
  activeIndex: number;
  unilateral: boolean;
}

function formatWeight(kg: number | null): string {
  if (kg == null) return '—';
  return Number.isInteger(kg) ? String(kg) : kg.toFixed(1).replace('.', ',');
}

export function SetInput({ loggedSets, totalSets, activeIndex, unilateral }: Props) {
  const rows = Array.from({ length: totalSets }, (_, i) => i + 1);
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    activeRef.current?.scrollIntoView({
      block: 'nearest',
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [activeIndex, totalSets]);

  return (
    <div className={styles.list} role="list" aria-label="Séries" ref={listRef}>
      {rows.map((n) => {
        const log = loggedSets.find((s) => s.index === n);
        const isActive = n === activeIndex && !log;
        const isDone = !!log;
        return (
          <div
            key={n}
            ref={isActive ? activeRef : undefined}
            role="listitem"
            className={[
              styles.row,
              isActive ? styles.rowActive : '',
              isDone ? styles.rowDone : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className={styles.marker} aria-hidden="true">
              {log ? <ChalkMark /> : isActive ? '▸' : '·'}
            </span>
            <span className={styles.label}>Série {n}</span>
            {log ? (
              <span className={`tabular ${styles.value}`}>
                {log.durationSec != null
                  ? `${log.durationSec} s`
                  : `${log.reps}${unilateral ? ' /côté' : ''} × ${formatWeight(log.weightKg)} kg`}
                {log.isPR ? <span className={styles.pr}> · Record</span> : null}
              </span>
            ) : isActive ? (
              <span className={styles.pending}>en cours</span>
            ) : (
              <span className={styles.pending}>—</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
