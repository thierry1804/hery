import styles from './Stepper.module.css';

interface Props {
  value: number;
  step: number;
  min?: number;
  unit?: string;
  fontSizePx: number;
  decimals?: number;
  onChange: (value: number) => void;
}

function formatFr(n: number, decimals: number): string {
  return decimals > 0 ? n.toFixed(decimals).replace('.', ',') : String(n);
}

export function Stepper({ value, step, min = 0, unit, fontSizePx, decimals = 0, onChange }: Props) {
  const clamp = (v: number) => Math.max(min, Number(v.toFixed(2)));
  const display = formatFr(value, decimals);
  const stepLabel = formatFr(step, decimals > 0 || step % 1 !== 0 ? 1 : 0);

  const large = fontSizePx >= 48;

  return (
    <div className={`${styles.row} ${large ? styles.rowLarge : styles.rowCompact}`}>
      <button
        type="button"
        className={styles.btn}
        aria-label={`Diminuer de ${stepLabel}`}
        onClick={() => onChange(clamp(value - step))}
      >
        −{stepLabel}
      </button>
      <span className={`${styles.value} tabular`} style={{ fontSize: fontSizePx }}>
        {display}
        {unit ? <span className={styles.unit}> {unit}</span> : null}
      </span>
      <button
        type="button"
        className={styles.btn}
        aria-label={`Augmenter de ${stepLabel}`}
        onClick={() => onChange(clamp(value + step))}
      >
        +{stepLabel}
      </button>
    </div>
  );
}
