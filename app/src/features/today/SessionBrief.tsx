import styles from './SessionBrief.module.css';

export function SessionBrief({
  lines,
  painWatch,
}: {
  lines: { name: string; text: string }[];
  painWatch: boolean;
}) {
  if (lines.length === 0 && !painWatch) return null;
  return (
    <section className={styles.brief} aria-label="Objectifs du jour">
      <h2 className={styles.title}>Objectifs du jour</h2>
      {painWatch ? (
        <p className={styles.watch}>
          Surveiller la douleur déclarée récemment avant d’augmenter les charges.
        </p>
      ) : null}
      <ul className={styles.list}>
        {lines.slice(0, 6).map((line) => (
          <li key={line.name}>
            <strong>{line.name}</strong> — {line.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
