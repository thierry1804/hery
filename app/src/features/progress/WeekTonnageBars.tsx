import type { WeekBar } from '../../domain/progress';
import { formatTonnageKg } from '../../domain/progress';
import styles from './WeekTonnageBars.module.css';

function formatShortWeek(weekStart: string): string {
  const [, month, day] = weekStart.split('-');
  return `${day}/${month}`;
}

export function WeekTonnageBars({ bars }: { bars: WeekBar[] }) {
  const max = Math.max(...bars.map((bar) => bar.tonnageKg), 1);

  return (
    <div className={styles.bars}>
      {bars.map((bar) => {
        const width = `${(bar.tonnageKg / max) * 100}%`;
        return (
          <div key={bar.weekStart} className={styles.row}>
            <span className={`tabular ${styles.label}`}>
              {formatShortWeek(bar.weekStart)}
            </span>
            <div className={styles.track}>
              <div
                className={styles.fill}
                data-testid="tonnage-fill"
                style={{
                  width,
                  minWidth: bar.tonnageKg > 0 ? '4px' : undefined,
                }}
              />
            </div>
            <span className={`tabular ${styles.value}`}>
              {formatTonnageKg(bar.tonnageKg)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
