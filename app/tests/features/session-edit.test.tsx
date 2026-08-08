// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionEditScreen } from '../../src/features/program/SessionEditScreen';
import {
  getPrescribedItems,
  reorderPrescribedItems,
  updateSessionTemplate,
} from '../../src/repositories/program.repo';

vi.mock('../../src/repositories/program.repo', () => ({
  getTemplateById: vi.fn().mockResolvedValue({
    id: 'template-a',
    cycleId: 'cycle-1',
    code: 'A',
    label: 'Séance A',
    dayOfWeek: 1,
    targetDurationMin: 60,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    deletedAt: null,
  }),
  getPrescribedItems: vi.fn().mockResolvedValue([
    {
      id: 'item-1',
      sessionTemplateId: 'template-a',
      order: 10,
      kind: 'strength',
      exerciseId: 'exercise-1',
      label: 'Presse',
      sets: 3,
      repsTarget: 8,
      repsRangeMin: null,
      repsRangeMax: null,
      durationSec: null,
      restSec: 90,
      perSide: false,
      notes: '',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
      deletedAt: null,
    },
    {
      id: 'item-2',
      sessionTemplateId: 'template-a',
      order: 20,
      kind: 'cardio',
      exerciseId: null,
      label: 'Vélo',
      sets: null,
      repsTarget: null,
      repsRangeMin: null,
      repsRangeMax: null,
      durationSec: 600,
      restSec: 0,
      perSide: false,
      notes: '',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
      deletedAt: null,
    },
  ]),
  updateSessionTemplate: vi.fn(),
  reorderPrescribedItems: vi.fn(),
}));

vi.mock('../../src/repositories/exercises.repo', () => ({
  getExercisesByIds: vi.fn().mockResolvedValue([
    {
      id: 'exercise-1',
      name: 'Presse à cuisses',
    },
  ]),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function renderScreen() {
  render(
    <MemoryRouter initialEntries={['/settings/program/template-a']}>
      <Routes>
        <Route path="/settings/program/:templateId" element={<SessionEditScreen />} />
        <Route path="/settings/program/:templateId/items/new" element={<p>Nouvel exercice</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('édition de séance', () => {
  it('charge, enregistre et réordonne la séance', async () => {
    renderScreen();

    expect(await screen.findByDisplayValue('Séance A')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Presse à cuisses/ })).toHaveAttribute(
      'href',
      '/settings/program/template-a/items/item-1',
    );
    expect(screen.getByText('3×8 · 90 s')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nom de la séance'), {
      target: { value: 'Jambes' },
    });
    fireEvent.change(screen.getByLabelText('Jour'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Augmenter de 5' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(updateSessionTemplate).toHaveBeenCalledWith('template-a', {
        label: 'Jambes',
        dayOfWeek: 2,
        targetDurationMin: 65,
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Descendre Presse à cuisses' }));
    await waitFor(() =>
      expect(reorderPrescribedItems).toHaveBeenCalledWith('template-a', ['item-2', 'item-1']),
    );
    expect(getPrescribedItems).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un exercice' }));
    expect(await screen.findByText('Nouvel exercice')).toBeInTheDocument();
  });

  it("affiche l'erreur française renvoyée pendant l'enregistrement", async () => {
    vi.mocked(updateSessionTemplate).mockRejectedValueOnce(
      new Error('Ce jour est déjà pris par une autre séance.'),
    );
    renderScreen();

    await screen.findByDisplayValue('Séance A');
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(
      await screen.findByText('Ce jour est déjà pris par une autre séance.'),
    ).toBeInTheDocument();
  });
});
