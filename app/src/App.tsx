import { Route, Routes, useLocation } from 'react-router-dom';
import { TodayScreen } from './features/today/TodayScreen';
import { ActiveSessionScreen } from './features/session/ActiveSessionScreen';
import { HistoryScreen } from './features/history/HistoryScreen';
import { WorkoutDetailScreen } from './features/history/WorkoutDetailScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { BottomNav } from './ui/BottomNav';

export default function App() {
  const location = useLocation();
  const isSession = location.pathname.startsWith('/session/');

  return (
    <>
      <Routes>
        <Route path="/" element={<TodayScreen />} />
        <Route path="/session/:workoutId" element={<ActiveSessionScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
        <Route path="/history/:workoutId" element={<WorkoutDetailScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
      {!isSession && <BottomNav />}
    </>
  );
}
