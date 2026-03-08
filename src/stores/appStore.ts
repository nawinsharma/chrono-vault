import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppStore {
  hasOnboarded: boolean;
  setOnboarded: (value: boolean) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      hasOnboarded: false,
      setOnboarded: (value) => set({ hasOnboarded: value }),
    }),
    {
      name: 'chronovault-app',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
