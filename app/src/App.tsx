import { Route, Routes, useLocation } from 'react-router-dom';
import { TodayScreen } from './features/today/TodayScreen';
import { ActiveSessionScreen } from './features/session/ActiveSessionScreen';
import { SessionBriefScreen } from './features/session/SessionBriefScreen';
import { SessionSummaryScreen } from './features/session/SessionSummaryScreen';
import { HistoryScreen } from './features/history/HistoryScreen';
import { WorkoutDetailScreen } from './features/history/WorkoutDetailScreen';
import { ProgressScreen } from './features/progress/ProgressScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { ProgramHubScreen } from './features/program/ProgramHubScreen';
import { SessionEditScreen } from './features/program/SessionEditScreen';
import { ItemEditScreen } from './features/program/ItemEditScreen';
import { LoginScreen } from './features/auth/LoginScreen';
import { RegisterScreen } from './features/auth/RegisterScreen';
import { SyncBootstrap } from './sync/SyncBootstrap';
import { BottomNav } from './ui/BottomNav';
import { useWakeLock } from './features/session/useWakeLock';

export default function App() {
  const location = useLocation();
  const isSession = location.pathname.startsWith('/session/');

  // Ecran allume tant que l'application est ouverte, pas seulement pendant une seance active.
  useWakeLock(true);

  return (
    <>
      <SyncBootstrap />
      <Routes>
        <Route path="/" element={<TodayScreen />} />
        <Route path="/session/brief/:templateId" element={<SessionBriefScreen />} />
        <Route path="/session/:workoutId" element={<ActiveSessionScreen />} />
        <Route path="/session/:workoutId/summary" element={<SessionSummaryScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
        <Route path="/history/:workoutId" element={<WorkoutDetailScreen />} />
        <Route path="/progress" element={<ProgressScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/settings/program" element={<ProgramHubScreen />} />
        <Route path="/settings/program/:templateId" element={<SessionEditScreen />} />
        <Route path="/settings/program/:templateId/items/new" element={<ItemEditScreen />} />
        <Route path="/settings/program/:templateId/items/:itemId" element={<ItemEditScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
      </Routes>
      {!isSession && <BottomNav />}
    </>
  );
}
