import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RestOverlay } from '../../src/features/session/RestOverlay';

describe('RestOverlay', () => {
  it('affiche le prochain exercice et sa charge', () => {
    render(
      <RestOverlay
        restEndsAt={Date.now() + 60_000}
        totalSec={60}
        nextHint="Presse à cuisses"
        nextLoadKg={62.5}
        onExtend={vi.fn()}
        onSkip={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    expect(screen.getByText('Ensuite : Presse à cuisses')).toBeInTheDocument();
    expect(screen.getByText('62,5 kg')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAccessibleName(/Presse à cuisses à 62.5 kg/);
  });
});
