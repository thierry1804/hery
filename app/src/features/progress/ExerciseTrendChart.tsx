import { useState } from 'react';
import type { ExerciseHistory, ExerciseSessionLift, TrendMetric, TrendWeeks } from '../../domain/progress';
import {
  filterSessionsByWeeks,
  formatTrendDelta,
  formatTrendValue,
  metricValue,
} from '../../domain/progress';
import styles from './ExerciseTrendChart.module.css';

const WIDTH = 300;
const HEIGHT = 120;
const PAD = 12;

const METRICS: { id: TrendMetric; label: string }[] = [
  { id: 'weight', label: 'Charge' },
  { id: 'e1rm', label: 'e1RM' },
  { id: 'volume', label: 'Volume' },
];

const WEEKS: TrendWeeks[] = [4, 8, 12];

export function ExerciseTrendChart({ histories }: { histories: ExerciseHistory[] }) {
  const candidates = [...histories]
    .filter((h) => h.sessions.length >= 2)
    .sort((a, b) => {
      const aDate = a.sessions[a.sessions.length - 1]!.workoutDate;
      const bDate = b.sessions[b.sessions.length - 1]!.workoutDate;
      return aDate < bDate ? 1 : aDate > bDate ? -1 : 0;
    });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [metric, setMetric] = useState<TrendMetric>('weight');
  const [weeks, setWeeks] = useState<TrendWeeks>(8);

  if (candidates.length === 0) {
    return <p className={styles.empty}>Pas assez de données pour une courbe.</p>;
  }

  const selected = candidates.find((h) => h.exerciseId === selectedId) ?? candidates[0]!;
  const windowed = filterSessionsByWeeks(selected.sessions, weeks, new Date());
  const plotted = windowed
    .map((session) => ({ session, value: metricValue(session, metric) }))
    .filter((p): p is { session: ExerciseSessionLift; value: number } => p.value != null);

  if (plotted.length < 2) {
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
        <TrendControls metric={metric} weeks={weeks} onMetric={setMetric} onWeeks={setWeeks} />
        <p className={styles.empty}>Pas assez de données sur cette période.</p>
      </div>
    );
  }

  const values = plotted.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = plotted.map((p, i) => {
    const x = PAD + (i / (plotted.length - 1)) * (WIDTH - PAD * 2);
    const y = PAD + (1 - (p.value - min) / range) * (HEIGHT - PAD * 2);
    return { x, y, ...p };
  });
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const last = plotted[plotted.length - 1]!;
  const prev = plotted[plotted.length - 2];
  const delta = prev ? last.value - prev.value : null;

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

      <TrendControls metric={metric} weeks={weeks} onMetric={setMetric} onWeeks={setWeeks} />

      <p className={styles.current}>
        <span className={`tabular ${styles.currentValue}`}>{formatTrendValue(metric, last.value)}</span>
        {metric === 'weight' ? (
          <span className={styles.currentMeta}> · {last.session.repsAtMax} reps</span>
        ) : null}
        {delta != null ? (
          <span className={`tabular ${styles.currentDelta}`}> · {formatTrendDelta(metric, delta)}</span>
        ) : null}
      </p>

      <svg className={styles.chart} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none">
        <path d={path} className={styles.line} fill="none" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={metric === 'weight' && p.session.hadPr ? 4 : 2.5}
            className={metric === 'weight' && p.session.hadPr ? styles.dotPr : styles.dot}
          />
        ))}
      </svg>
    </div>
  );
}

function TrendControls({
  metric,
  weeks,
  onMetric,
  onWeeks,
}: {
  metric: TrendMetric;
  weeks: TrendWeeks;
  onMetric: (m: TrendMetric) => void;
  onWeeks: (w: TrendWeeks) => void;
}) {
  return (
    <>
      <div className={styles.chips} role="group" aria-label="Métrique">
        {METRICS.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`${styles.chip} ${metric === m.id ? styles.chipActive : ''}`}
            aria-pressed={metric === m.id}
            onClick={() => onMetric(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className={styles.chips} role="group" aria-label="Période">
        {WEEKS.map((w) => (
          <button
            key={w}
            type="button"
            className={`${styles.chip} ${weeks === w ? styles.chipActive : ''}`}
            aria-pressed={weeks === w}
            onClick={() => onWeeks(w)}
          >
            {w} sem.
          </button>
        ))}
      </div>
    </>
  );
}
