import { create } from 'zustand';

interface SessionStoreState {
  activeWorkoutId: string | null;
  setActiveWorkoutId: (id: string | null) => void;
}

export const useSessionStore = create<SessionStoreState>((set) => ({
  activeWorkoutId: null,
  setActiveWorkoutId: (id) => set({ activeWorkoutId: id }),
}));
