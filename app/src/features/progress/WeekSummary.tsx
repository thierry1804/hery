import type { WeekStats } from '../../domain/progress';
import { formatTonnageKg } from '../../domain/progress';
import styles from './WeekSummary.module.css';

export function WeekSummary({ week }: { week: WeekStats }) {
  const tonnage = formatTonnageKg(week.tonnageKg);
  const records =
    week.prCount > 0
      ? ` · ${week.prCount} record${week.prCount === 1 ? '' : 's'}`
      : '';
  return (
    <p className={styles.line}>
      <span className="tabular">{week.sessionsDone}</span> séance
      {week.sessionsDone === 1 ? '' : 's'} sur{' '}
      <span className="tabular">{week.sessionsTarget}</span>
      {' · '}
      <span className="tabular">{tonnage}</span>
      {records}
    </p>
  );
}
