import type { SetLog } from '../../db/schema';
import { ChalkMark } from '../../ui/ChalkMark';
import styles from './SetInput.module.css';

interface Props {
  loggedSets: SetLog[];
  totalSets: number;
  activeIndex: number;
  unilateral: boolean;
}

export function SetInput({ loggedSets, totalSets, activeIndex, unilateral }: Props) {
  const rows = Array.from({ length: totalSets }, (_, i) => i + 1);

  return (
    <div className={styles.list}>
      {rows.map((n) => {
        const log = loggedSets.find((s) => s.index === n);
        const isActive = n === activeIndex;
        return (
          <div key={n} className={`${styles.row} ${isActive ? styles.rowActive : ''}`}>
            <span className={styles.marker}>{log ? <ChalkMark /> : isActive ? '▸' : '·'}</span>
            <span>Série {n}</span>
            {log && (
              <span className="tabular">
                {log.durationSec != null
                  ? `${log.durationSec} s`
                  : `${log.reps}${unilateral ? ' /côté' : ''} × ${log.weightKg} kg`}
                {log.isPR ? ' — Record' : ''}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
