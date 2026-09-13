import type { SetKind } from '../../domain/set-kind';
import { rirFromChip } from '../../domain/set-kind';
import styles from './EffortChips.module.css';

const KINDS: { id: SetKind; label: string }[] = [
  { id: 'warmup', label: 'Échauffement' },
  { id: 'approach', label: 'Préparation' },
  { id: 'work', label: 'Travail' },
];

const RIR_CHIPS: Array<0 | 1 | 2 | '3+'> = [0, 1, 2, '3+'];

interface Props {
  setKind: SetKind;
  onSetKindChange: (k: SetKind) => void;
  rir: number | null;
  onRirChange: (r: number | null) => void;
}

export function EffortChips({ setKind, onSetKindChange, rir, onRirChange }: Props) {
  return (
    <div className={styles.wrap}>
      <div className={styles.row} role="group" aria-label="Type de série">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            className={`${styles.chip} ${setKind === k.id ? styles.chipActive : ''}`}
            aria-pressed={setKind === k.id}
            onClick={() => onSetKindChange(k.id)}
          >
            {k.label}
          </button>
        ))}
      </div>
      {setKind === 'work' ? (
        <div className={`${styles.row} ${styles.rirRow}`} role="group" aria-label="RIR, répétitions en réserve">
          {RIR_CHIPS.map((chip) => {
            const value = rirFromChip(chip);
            const selected = rir === value;
            return (
              <button
                key={String(chip)}
                type="button"
                className={`${styles.chip} ${selected ? styles.chipActive : ''}`}
                aria-pressed={selected}
                onClick={() => onRirChange(selected ? null : value)}
              >
                {chip === '3+' ? '3+' : chip}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
