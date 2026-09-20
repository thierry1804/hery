import styles from './Stepper.module.css';

interface Props {
  value: number;
  step: number;
  min?: number;
  unit?: string;
  valuePrefix?: string;
  fontSizePx: number;
  decimals?: number;
  onChange: (value: number) => void;
  variant?: 'default' | 'card';
  size?: 'weight' | 'reps' | 'rest';
  warn?: boolean;
  decrementAriaLabel?: string;
  incrementAriaLabel?: string;
  className?: string;
}

function formatFr(n: number, decimals: number): string {
  return decimals > 0 ? n.toFixed(decimals).replace('.', ',') : String(n);
}

function stepDecimals(step: number, valueDecimals: number): number {
  if (valueDecimals > 0 || step % 1 !== 0) {
    const raw = String(step);
    const dot = raw.indexOf('.');
    return dot === -1 ? 1 : Math.min(2, raw.length - dot - 1);
  }
  return 0;
}

export function Stepper({
  value,
  step,
  min = 0,
  unit,
  valuePrefix,
  fontSizePx,
  decimals = 0,
  onChange,
  variant = 'default',
  size,
  warn = false,
  decrementAriaLabel,
  incrementAriaLabel,
  className,
}: Props) {
  const clamp = (v: number) => Math.max(min, Number(v.toFixed(2)));
  const display = formatFr(value, decimals);
  const stepLabel = formatFr(step, stepDecimals(step, decimals));
  const large = fontSizePx >= 48;
  const isCard = variant === 'card';

  return (
    <div
      className={[
        styles.row,
        isCard ? styles.card : large ? styles.rowLarge : styles.rowCompact,
        size === 'weight' ? styles.sizeWeight : '',
        size === 'reps' ? styles.sizeReps : '',
        size === 'rest' ? styles.sizeRest : '',
        warn ? styles.warn : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        className={styles.btn}
        aria-label={decrementAriaLabel ?? `Diminuer de ${stepLabel}`}
        onClick={() => onChange(clamp(value - step))}
      >
        −{stepLabel}
      </button>
      <span className={`${styles.value} tabular`} style={isCard ? undefined : { fontSize: fontSizePx }}>
        {valuePrefix ? <span className={styles.prefix}>{valuePrefix}</span> : null}
        <span className={styles.number}>{display}</span>
        {unit ? <span className={styles.unit}>{unit}</span> : null}
      </span>
      <button
        type="button"
        className={styles.btn}
        aria-label={incrementAriaLabel ?? `Augmenter de ${stepLabel}`}
        onClick={() => onChange(clamp(value + step))}
      >
        +{stepLabel}
      </button>
    </div>
  );
}
