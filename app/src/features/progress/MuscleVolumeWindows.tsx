import type { MuscleVolumeWindow } from '../../domain/progress';
import { MUSCLE_LABEL_FR } from '../../lib/muscleLabels';
import styles from './MuscleVolumeWindows.module.css';

export function MuscleVolumeWindows({ volumes }: { volumes: MuscleVolumeWindow[] }) {
  if (volumes.length === 0) return <p className={styles.empty}>Aucune série de travail sur les 28 derniers jours.</p>;
  return (
    <div className={styles.list}>
      {volumes.map((volume) => (
        <div className={styles.row} key={volume.muscle}>
          <span>{MUSCLE_LABEL_FR[volume.muscle]}</span>
          <span className={styles.values}>{volume.sets7d.toFixed(1)} / {volume.sets28d.toFixed(1)} séries</span>
          <span className={`${styles.status} ${styles[volume.status]}`}>
            {volume.status === 'under' ? 'Sous-charge' : volume.status === 'over' ? 'Sur-charge' : 'Équilibré'}
          </span>
        </div>
      ))}
    </div>
  );
}
