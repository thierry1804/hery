import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { LiftsList } from '../../src/features/progress/LiftsList';
import { RecentPrsList } from '../../src/features/progress/RecentPrsList';
import { TodayProgressCard } from '../../src/features/progress/TodayProgressCard';
import { WeekTonnageBars } from '../../src/features/progress/WeekTonnageBars';
import { getProgressSnapshot } from '../../src/repositories/progress.repo';

vi.mock('../../src/repositories/progress.repo', () => ({
  getProgressSnapshot: vi.fn(),
}));

describe('progress components', () => {
  it('shows the Today empty state after loading a snapshot without workouts', async () => {
    vi.mocked(getProgressSnapshot).mockResolvedValue({
      hasAnyCompletedWorkout: false,
      week: { sessionsDone: 0, sessionsTarget: 3, tonnageKg: 0, prCount: 0 },
      weekBars: [],
      movers: [],
      recentPrs: [],
      lifts: [],
      muscleBalance: [],
      muscleFatigue: [],
      streak: { currentStreakWeeks: 0, activeDaysThisMonth: 0 },
      exerciseHistories: [],
    });

    render(
      <MemoryRouter>
        <TodayProgressCard />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('La progression apparaîtra après la première séance.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Voir la progression →' })).not.toBeInTheDocument();
  });

  it('shows the week, movers and progression link on Today', async () => {
    vi.mocked(getProgressSnapshot).mockResolvedValue({
      hasAnyCompletedWorkout: true,
      week: { sessionsDone: 2, sessionsTarget: 3, tonnageKg: 1250, prCount: 1 },
      weekBars: [],
      movers: [{
        exerciseId: 'squat',
        name: 'Squat',
        prevMaxKg: 80,
        currMaxKg: 82.5,
        deltaKg: 2.5,
        hasRecentPr: true,
      }],
      recentPrs: [],
      lifts: [],
      muscleBalance: [],
      muscleFatigue: [],
      streak: { currentStreakWeeks: 0, activeDaysThisMonth: 0 },
      exerciseHistories: [],
    });

    render(
      <MemoryRouter>
        <TodayProgressCard />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('region', { name: 'Progression' })).toHaveTextContent(
      '2 séances sur 3',
    );
    expect(screen.getByText('Squat')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir la progression →' })).toHaveAttribute(
      'href',
      '/progress',
    );
  });

  it('renders four tonnage bars relative to the maximum', () => {
    render(
      <WeekTonnageBars
        bars={[
          { weekStart: '2026-07-13', tonnageKg: 0 },
          { weekStart: '2026-07-20', tonnageKg: 500 },
          { weekStart: '2026-07-27', tonnageKg: 1000 },
          { weekStart: '2026-08-03', tonnageKg: 250 },
        ]}
      />,
    );

    const fills = screen.getAllByTestId('tonnage-fill');
    expect(fills).toHaveLength(4);
    expect(fills[0]).toHaveStyle({ width: '0%' });
    expect(fills[1]).toHaveStyle({ width: '50%' });
    expect(fills[2]).toHaveStyle({ width: '100%' });
    expect(fills[3]).toHaveStyle({ width: '25%' });
  });

  it('formats records and lift deltas', () => {
    render(
      <>
        <RecentPrsList
          prs={[
            {
              setLogId: 'pr-1',
              exerciseId: 'squat',
              name: 'Squat',
              weightKg: 82.5,
              reps: 5,
              completedAt: '2026-08-07T10:00:00.000Z',
              prKinds: ['weight'],
            },
          ]}
        />
        <LiftsList
          lifts={[
            {
              exerciseId: 'squat',
              name: 'Squat',
              lastWeightKg: 82.5,
              lastReps: 5,
              prevMaxKg: 80,
              deltaKg: 2.5,
            },
            {
              exerciseId: 'row',
              name: 'Row',
              lastWeightKg: 50,
              lastReps: 8,
              prevMaxKg: null,
              deltaKg: null,
            },
          ]}
        />
      </>,
    );

    expect(screen.getByText('Record')).toBeInTheDocument();
    expect(screen.getAllByText('5 × 82,5 kg')).toHaveLength(2);
    expect(screen.getByText('+2,5')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('progress route and navigation', () => {
  it('renders the progress route and the four tabs', async () => {
    vi.mocked(getProgressSnapshot).mockResolvedValue({
      hasAnyCompletedWorkout: false,
      week: { sessionsDone: 0, sessionsTarget: 3, tonnageKg: 0, prCount: 0 },
      weekBars: [],
      movers: [],
      recentPrs: [],
      lifts: [],
      muscleBalance: [],
      muscleFatigue: [],
      streak: { currentStreakWeeks: 0, activeDaysThisMonth: 0 },
      exerciseHistories: [],
    });

    render(
      <MemoryRouter initialEntries={['/progress']}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText('La progression apparaîtra après la première séance.'),
      ).toBeInTheDocument();
    });
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual([
      "Aujourd'hui",
      'Historique',
      'Progression',
      'Réglages',
    ]);
  });
});
