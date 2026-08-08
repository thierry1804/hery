import { useState, type CSSProperties } from 'react';
import { Sheet } from '../../ui/Sheet';
import { BigButton } from '../../ui/BigButton';

interface Props {
  initialNote: string;
  initialMachineSettings: string;
  onSave: (note: string, machineSettings: string) => void;
  onClose: () => void;
}

export function NoteDialog({ initialNote, initialMachineSettings, onSave, onClose }: Props) {
  const [note, setNote] = useState(initialNote);
  const [machineSettings, setMachineSettings] = useState(initialMachineSettings);

  return (
    <Sheet title="Note et réglages" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label>
          Réglages machine
          <input
            value={machineSettings}
            onChange={(e) => setMachineSettings(e.target.value)}
            placeholder="Siège 4, cale-cuisses 3"
            style={inputStyle}
          />
        </label>
        <label>
          Note (douleur, sensation)
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} style={inputStyle} />
        </label>
        <BigButton
          variant="primary"
          onClick={() => {
            onSave(note, machineSettings);
            onClose();
          }}
        >
          Enregistrer
        </BigButton>
      </div>
    </Sheet>
  );
}

const inputStyle: CSSProperties = {
  width: '100%',
  marginTop: 4,
  background: 'var(--fonte-900)',
  border: '1px solid var(--fonte-500)',
  borderRadius: 8,
  color: 'var(--magnesie)',
  padding: 10,
  fontSize: 16,
};
