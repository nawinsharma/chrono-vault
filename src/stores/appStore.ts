import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppStore {
  hasOnboarded: boolean;
  setOnboarded: (value: boolean) => void;
}

function coerceBooleans(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === 'true') result[k] = true;
    else if (v === 'false') result[k] = false;
    else result[k] = v;
  }
  return result;
}

const appStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const raw = await AsyncStorage.getItem(name);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.state) {
        parsed.state = coerceBooleans(parsed.state);
      }
      return JSON.stringify(parsed);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string) => {
    await AsyncStorage.setItem(name, value);
  },
  removeItem: async (name: string) => {
    await AsyncStorage.removeItem(name);
  },
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      hasOnboarded: false,
      setOnboarded: (value) => set({ hasOnboarded: value === true }),
    }),
    {
      name: 'chronovault-app',
      storage: createJSONStorage(() => appStorage),
    }
  )
);
