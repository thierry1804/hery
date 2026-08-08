// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { SettingsScreen } from '../../src/features/settings/SettingsScreen';
import {
  getAllTemplates,
  restoreProgramFromSeed,
  updateCycle,
} from '../../src/repositories/program.repo';

vi.mock('../../src/repositories/data.repo', () => ({
  exportAll: vi.fn(),
  getLastExportAt: vi.fn().mockResolvedValue(undefined),
  importAll: vi.fn(),
}));

vi.mock('../../src/repositories/program.repo', () => ({
  getActiveCycle: vi.fn().mockResolvedValue({
    id: 'cycle-1',
    name: 'Cycle force',
    startDate: '2026-08-01',
    weeks: 12,
    phases: [],
    active: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    deletedAt: null,
  }),
  getAllTemplates: vi.fn().mockResolvedValue([
    {
      id: 'template-a',
      cycleId: 'cycle-1',
      code: 'A',
      label: 'Séance A',
      dayOfWeek: 1,
      targetDurationMin: 60,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
      deletedAt: null,
    },
  ]),
  restoreProgramFromSeed: vi.fn(),
  updateCycle: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('navigation du programme', () => {
  it('affiche le lien exact depuis les réglages', async () => {
    render(
      <MemoryRouter>
        <SettingsScreen />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('link', { name: 'Modifier le programme →' })).toHaveAttribute(
      'href',
      '/settings/program',
    );
  });

  it('rend le hub sur la route programme', async () => {
    render(
      <MemoryRouter initialEntries={['/settings/program']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByDisplayValue('Cycle force')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Séance A/ })).toHaveAttribute(
      'href',
      '/settings/program/template-a',
    );
    expect(screen.getByRole('navigation')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Nom du cycle'), { target: { value: 'Cycle été' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() =>
      expect(updateCycle).toHaveBeenCalledWith('cycle-1', { name: 'Cycle été' }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Restaurer le programme initial' }));
    expect(screen.getByText('Les séances personnalisées seront remplacées par le programme initial.'))
      .toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Restaurer' }));
    await waitFor(() => expect(restoreProgramFromSeed).toHaveBeenCalledOnce());
    expect(getAllTemplates).toHaveBeenCalledTimes(2);
  });
});
