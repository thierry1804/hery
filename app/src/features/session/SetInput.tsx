import type { SetLog } from '../../db/schema';
import { formatSetRir, setKindShortLabel } from '../../domain/set-kind';
import { ChalkMark } from '../../ui/ChalkMark';
import styles from './SetInput.module.css';

interface DraftSet {
  reps: number;
  weightKg: number | null;
  durationSec?: number | null;
  rir: number | null;
  loadType?: 'weight' | 'time' | string;
}

interface Props {
  loggedSets: SetLog[];
  totalSets: number;
  currentIndex: number;
  unilateral: boolean;
  draft?: DraftSet | null;
  compact?: boolean;
  className?: string;
}

function formatWeight(kg: number | null): string {
  if (kg == null) return '—';
  return Number.isInteger(kg) ? String(kg) : kg.toFixed(1).replace('.', ',');
}

function formatLoggedValue(log: SetLog, unilateral: boolean, compact: boolean): string {
  const kind = log.setKind ?? (log.isWarmup ? 'warmup' : 'work');
  const kindLabel = compact ? null : setKindShortLabel(kind);
  const rirLabel = formatSetRir(log.rir);
  const base =
    log.durationSec != null
      ? `${log.durationSec} s`
      : `${log.reps}${unilateral && !compact ? ' /côté' : ''} × ${formatWeight(log.weightKg)}`;
  const withUnit = log.durationSec != null ? base : `${base} kg`;
  return `${withUnit}${kindLabel ? ` · ${kindLabel}` : ''}${rirLabel ? ` · ${rirLabel}` : ''}`;
}

function formatDraftValue(draft: DraftSet, unilateral: boolean, compact: boolean): string {
  if (draft.loadType === 'time' || draft.durationSec != null) {
    return `${draft.durationSec ?? 0} s`;
  }
  const rirLabel = formatSetRir(draft.rir);
  return `${draft.reps}${unilateral && !compact ? ' /côté' : ''} × ${formatWeight(draft.weightKg)} kg${rirLabel ? ` · ${rirLabel}` : ''}`;
}

export function SetInput({
  loggedSets,
  totalSets,
  currentIndex,
  unilateral,
  draft,
  compact = false,
  className,
}: Props) {
  if (totalSets <= 0) return null;

  const byIndex = new Map(loggedSets.map((log) => [log.index, log]));

  return (
    <div
      className={[styles.list, compact ? styles.listCompact : '', className].filter(Boolean).join(' ')}
      role="list"
      aria-label="Séries"
    >
      {Array.from({ length: totalSets }, (_, i) => i + 1).map((index) => {
        const log = byIndex.get(index);
        const isDone = log != null;
        const isCurrent = !isDone && index === currentIndex;
        const isFuture = !isDone && index > currentIndex;
        const rowClass = [
          styles.row,
          isDone ? styles.rowDone : '',
          isCurrent ? styles.rowCurrent : '',
          isFuture || (!isDone && index < currentIndex) ? styles.rowPending : '',
        ]
          .filter(Boolean)
          .join(' ');

        let value = '—';
        if (isDone && log) value = formatLoggedValue(log, unilateral, compact);
        else if (isCurrent && draft) value = formatDraftValue(draft, unilateral, compact);

        return (
          <div key={index} role="listitem" className={rowClass} aria-current={isCurrent ? 'step' : undefined}>
            <span className={styles.marker} aria-hidden="true">
              {isDone ? <ChalkMark /> : <span className={styles.dot} />}
            </span>
            <span className={styles.label}>{compact ? `S${index}` : `Série ${index}`}</span>
            <span className={`tabular ${styles.value}`}>{value}</span>
          </div>
        );
      })}
    </div>
  );
}
