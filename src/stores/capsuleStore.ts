import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CapsuleMetadata, CapsuleStatus } from '@/src/types/capsule';

const safeStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(name);
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

interface CapsuleStore {
  capsules: CapsuleMetadata[];
  loading: boolean;
  creating: boolean;
  unlocking: string | null;

  addCapsule: (capsule: CapsuleMetadata) => void;
  removeCapsule: (id: string) => void;
  updateCapsuleStatus: (id: string, status: CapsuleStatus) => void;
  setCapsules: (capsules: CapsuleMetadata[]) => void;
  setLoading: (loading: boolean) => void;
  setCreating: (creating: boolean) => void;
  setUnlocking: (id: string | null) => void;
  getCapsuleById: (id: string) => CapsuleMetadata | undefined;
  getActiveCapsules: () => CapsuleMetadata[];
  getUnlockedCapsules: () => CapsuleMetadata[];
}

export const useCapsuleStore = create<CapsuleStore>()(
  persist(
    (set, get) => ({
      capsules: [],
      loading: false,
      creating: false,
      unlocking: null,

      addCapsule: (capsule) =>
        set((state) => ({ capsules: [capsule, ...state.capsules] })),

      removeCapsule: (id) =>
        set((state) => ({
          capsules: state.capsules.filter((c) => c.id !== id),
        })),

      updateCapsuleStatus: (id, status) =>
        set((state) => ({
          capsules: state.capsules.map((c) =>
            c.id === id ? { ...c, status } : c
          ),
        })),

      setCapsules: (capsules) => set({ capsules }),
      setLoading: (loading) => set({ loading }),
      setCreating: (creating) => set({ creating }),
      setUnlocking: (id) => set({ unlocking: id }),

      getCapsuleById: (id) => get().capsules.find((c) => c.id === id),

      getActiveCapsules: () =>
        get().capsules.filter((c) => c.status === CapsuleStatus.Locked),

      getUnlockedCapsules: () =>
        get().capsules.filter((c) => c.status === CapsuleStatus.Unlocked),
    }),
    {
      name: 'chronovault-capsules',
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({ capsules: state.capsules }),
    }
  )
);
