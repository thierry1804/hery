import styles from './ChalkMark.module.css';

// L'element signature: une marque de craie (magnesie) tracee a main levee sur la ligne validee.
export function ChalkMark() {
  return (
    <svg width="40" height="20" viewBox="0 0 40 20" aria-hidden="true">
      <path className={styles.path} d="M2 14 C 10 6, 16 18, 22 8 S 34 4, 38 10" />
    </svg>
  );
}
