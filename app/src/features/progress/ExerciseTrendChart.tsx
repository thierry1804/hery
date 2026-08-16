import { useState } from 'react';
import type { ExerciseHistory } from '../../domain/progress';
import { formatDeltaKg, formatWeightKg } from '../../domain/progress';
import styles from './ExerciseTrendChart.module.css';

const WIDTH = 300;
const HEIGHT = 120;
const PAD = 12;

export function ExerciseTrendChart({ histories }: { histories: ExerciseHistory[] }) {
  const candidates = [...histories]
    .filter((h) => h.sessions.length >= 2)
    .sort((a, b) => {
      const aDate = a.sessions[a.sessions.length - 1]!.workoutDate;
      const bDate = b.sessions[b.sessions.length - 1]!.workoutDate;
      return aDate < bDate ? 1 : aDate > bDate ? -1 : 0;
    });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (candidates.length === 0) {
    return <p className={styles.empty}>Pas assez de données pour une courbe.</p>;
  }

  const selected = candidates.find((h) => h.exerciseId === selectedId) ?? candidates[0]!;
  const sessions = selected.sessions;
  const weights = sessions.map((s) => s.maxWeightKg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;

  const points = sessions.map((s, i) => {
    const x = PAD + (i / (sessions.length - 1)) * (WIDTH - PAD * 2);
    const y = PAD + (1 - (s.maxWeightKg - min) / range) * (HEIGHT - PAD * 2);
    return { x, y, session: s };
  });
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const last = sessions[sessions.length - 1]!;
  const prev = sessions[sessions.length - 2];
  const deltaKg = prev ? last.maxWeightKg - prev.maxWeightKg : null;

  return (
    <div className={styles.wrap}>
      <select
        className={styles.select}
        value={selected.exerciseId}
        onChange={(event) => setSelectedId(event.target.value)}
        aria-label="Choisir un exercice"
      >
        {candidates.map((h) => (
          <option key={h.exerciseId} value={h.exerciseId}>
            {h.name}
          </option>
        ))}
      </select>

      <p className={styles.current}>
        <span className={`tabular ${styles.currentValue}`}>{formatWeightKg(last.maxWeightKg)} kg</span>
        <span className={styles.currentMeta}> · {last.repsAtMax} reps</span>
        {deltaKg != null ? (
          <span className={`tabular ${styles.currentDelta}`}> · {formatDeltaKg(deltaKg)}</span>
        ) : null}
      </p>

      <svg className={styles.chart} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none">
        <path d={path} className={styles.line} fill="none" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={p.session.hadPr ? 4 : 2.5}
            className={p.session.hadPr ? styles.dotPr : styles.dot}
          />
        ))}
      </svg>
    </div>
  );
}
