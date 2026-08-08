// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ItemEditScreen } from '../../src/features/program/ItemEditScreen';
import {
  createPrescribedItem,
  getPrescribedItems,
  softDeletePrescribedItem,
  updatePrescribedItem,
} from '../../src/repositories/program.repo';

vi.mock('../../src/repositories/program.repo', () => ({
  createPrescribedItem: vi.fn(),
  getPrescribedItems: vi.fn().mockResolvedValue([]),
  softDeletePrescribedItem: vi.fn(),
  updatePrescribedItem: vi.fn(),
}));

vi.mock('../../src/repositories/exercises.repo', () => ({
  getAllExercises: vi.fn().mockResolvedValue([
    { id: 'exercise-1', name: 'Presse à cuisses' },
    { id: 'exercise-2', name: 'Développé couché' },
  ]),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPrescribedItems).mockResolvedValue([]);
});

function renderScreen(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/settings/program/:templateId/items/new" element={<ItemEditScreen />} />
        <Route path="/settings/program/:templateId/items/:itemId" element={<ItemEditScreen />} />
        <Route path="/settings/program/:templateId" element={<p>Retour séance</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("édition d'un élément de programme", () => {
  it.each([
    ['strength', 'Musculation'],
    ['core', 'Gainage'],
  ] as const)("refuse d'enregistrer un élément %s sans exercice sélectionné", async (kind, kindLabel) => {
    renderScreen('/settings/program/template-a/items/new');

    await screen.findByRole('button', { name: 'Choisir un exercice' });
    if (kind !== 'strength') {
      fireEvent.change(screen.getByLabelText('Type'), { target: { value: kind } });
    }
    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: kindLabel } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Sélectionnez un exercice dans la liste.');
    expect(createPrescribedItem).not.toHaveBeenCalled();
  });

  it("sélectionne un exercice puis crée l'élément", async () => {
    renderScreen('/settings/program/template-a/items/new');

    fireEvent.click(await screen.findByRole('button', { name: 'Choisir un exercice' }));
    expect(await screen.findByRole('heading', { name: 'Choisir un exercice' })).toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'presse' } });
    fireEvent.click(screen.getByRole('button', { name: 'Presse à cuisses' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(createPrescribedItem).toHaveBeenCalledWith(
        'template-a',
        expect.objectContaining({
          kind: 'strength',
          exerciseId: 'exercise-1',
          label: 'Presse à cuisses',
          sets: 3,
          repsTarget: 8,
          restSec: 90,
          order: 10,
        }),
      ),
    );
    expect(await screen.findByText('Retour séance')).toBeInTheDocument();
  });

  it('sélectionne un exercice cardio et conserve le repos choisi', async () => {
    renderScreen('/settings/program/template-a/items/new');

    await screen.findByRole('button', { name: 'Choisir un exercice' });
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'cardio' } });
    fireEvent.click(screen.getByRole('button', { name: 'Choisir un exercice' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Presse à cuisses' }));
    fireEvent.click(screen.getByRole('button', { name: 'Augmenter de 15' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(createPrescribedItem).toHaveBeenCalledWith(
        'template-a',
        expect.objectContaining({
          kind: 'cardio',
          exerciseId: 'exercise-1',
          label: 'Presse à cuisses',
          durationSec: 600,
          restSec: 15,
        }),
      ),
    );
  });

  it('charge et met à jour un élément existant', async () => {
    vi.mocked(getPrescribedItems).mockResolvedValueOnce([
      {
        id: 'item-1',
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
        notes: 'Souple',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
        deletedAt: null,
      },
    ]);
    renderScreen('/settings/program/template-a/items/item-1');

    expect(await screen.findByDisplayValue('Vélo')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Rameur' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(updatePrescribedItem).toHaveBeenCalledWith(
        'item-1',
        expect.objectContaining({ kind: 'cardio', label: 'Rameur', durationSec: 600 }),
      ),
    );
  });

  it("préremplit et enregistre le nom d'un exercice seed sans libellé", async () => {
    vi.mocked(getPrescribedItems).mockResolvedValueOnce([
      {
        id: 'item-1',
        sessionTemplateId: 'template-a',
        order: 10,
        kind: 'strength',
        exerciseId: 'exercise-1',
        label: '',
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
    ]);
    renderScreen('/settings/program/template-a/items/item-1');

    expect(await screen.findByRole('button', { name: 'Presse à cuisses' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nom')).toHaveValue('Presse à cuisses');
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(updatePrescribedItem).toHaveBeenCalledWith(
        'item-1',
        expect.objectContaining({ exerciseId: 'exercise-1', label: 'Presse à cuisses' }),
      ),
    );
  });

  it('conserve et permet de modifier la durée du gainage', async () => {
    vi.mocked(getPrescribedItems).mockResolvedValueOnce([
      {
        id: 'item-1',
        sessionTemplateId: 'template-a',
        order: 10,
        kind: 'core',
        exerciseId: 'exercise-1',
        label: 'Gainage',
        sets: 3,
        repsTarget: null,
        repsRangeMin: null,
        repsRangeMax: null,
        durationSec: 45,
        restSec: 30,
        perSide: false,
        notes: '',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
        deletedAt: null,
      },
    ]);
    renderScreen('/settings/program/template-a/items/item-1');

    fireEvent.click(await screen.findByRole('button', { name: 'Augmenter de 5' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(updatePrescribedItem).toHaveBeenCalledWith(
        'item-1',
        expect.objectContaining({
          kind: 'core',
          sets: 3,
          repsTarget: null,
          durationSec: 50,
        }),
      ),
    );
  });

  it('place un nouvel élément avant les étirements de fin', async () => {
    vi.mocked(getPrescribedItems).mockResolvedValueOnce([
      {
        id: 'item-1',
        sessionTemplateId: 'template-a',
        order: 20,
        kind: 'strength',
        exerciseId: 'exercise-1',
        label: 'Presse à cuisses',
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
        order: 1000,
        kind: 'stretch',
        exerciseId: null,
        label: 'Étirements',
        sets: null,
        repsTarget: null,
        repsRangeMin: null,
        repsRangeMax: null,
        durationSec: 300,
        restSec: 0,
        perSide: false,
        notes: '',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
        deletedAt: null,
      },
    ]);
    renderScreen('/settings/program/template-a/items/new');

    fireEvent.click(await screen.findByRole('button', { name: 'Choisir un exercice' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Presse à cuisses' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(createPrescribedItem).toHaveBeenCalledWith('template-a', expect.objectContaining({ order: 30 })),
    );
  });

  it('demande confirmation avant la suppression', async () => {
    vi.mocked(getPrescribedItems).mockResolvedValueOnce([
      {
        id: 'item-1',
        sessionTemplateId: 'template-a',
        order: 10,
        kind: 'strength',
        exerciseId: 'exercise-1',
        label: 'Presse à cuisses',
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
    ]);
    renderScreen('/settings/program/template-a/items/item-1');

    fireEvent.click(await screen.findByRole('button', { name: 'Supprimer' }));
    expect(screen.getByText('Cet élément sera retiré de la séance.')).toBeInTheDocument();
    expect(softDeletePrescribedItem).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la suppression' }));
    await waitFor(() => expect(softDeletePrescribedItem).toHaveBeenCalledWith('item-1'));
    expect(await screen.findByText('Retour séance')).toBeInTheDocument();
  });
});
