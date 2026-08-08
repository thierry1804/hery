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

export function Stepper({ value, step, min = 0, unit, fontSizePx, decimals = 0, onChange }: Props) {
  const clamp = (v: number) => Math.max(min, Number(v.toFixed(2)));
  const display = decimals > 0 ? value.toFixed(decimals) : String(value);

  return (
    <div className={styles.row}>
      <button
        type="button"
        className={styles.btn}
        aria-label={`Diminuer de ${step}`}
        onClick={() => onChange(clamp(value - step))}
      >
        −{step}
      </button>
      <span className={`${styles.value} tabular`} style={{ fontSize: fontSizePx }}>
        {display}
        {unit ? <span className={styles.unit}>{unit}</span> : null}
      </span>
      <button
        type="button"
        className={styles.btn}
        aria-label={`Augmenter de ${step}`}
        onClick={() => onChange(clamp(value + step))}
      >
        +{step}
      </button>
    </div>
  );
}
