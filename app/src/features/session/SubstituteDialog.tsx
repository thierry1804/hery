import type { Exercise } from '../../db/schema';
import { Sheet } from '../../ui/Sheet';
import { BigButton } from '../../ui/BigButton';

interface Props {
  alternatives: Exercise[];
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
}

export function SubstituteDialog({ alternatives, onPick, onClose }: Props) {
  return (
    <Sheet title="Remplacer l'exercice" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {alternatives.length === 0 && <p>Aucune alternative disponible.</p>}
        {alternatives.map((alt) => (
          <BigButton key={alt.id} variant="ghost" onClick={() => onPick(alt)}>
            {alt.name}
          </BigButton>
        ))}
      </div>
    </Sheet>
  );
}
