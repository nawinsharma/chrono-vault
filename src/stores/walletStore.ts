import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Transaction } from '@solana/web3.js';

/** Signs and sends a transaction (from a real wallet); returns signature. Not persisted. */
export type SignAndSendTransaction = (tx: Transaction) => Promise<string>;

/** Address shown in navbar for demo wallet so it looks like a real one. */
export const DEMO_DISPLAY_ADDRESS =
  '7xKXtg2mNq2F8p5L9s3R1vY4wE6tU8iO0pA2sD4fG6hJ8k';

interface WalletStore {
  publicKey: string | null;
  connected: boolean;
  balance: number;
  walletName: string | null;
  connecting: boolean;
  /** Set when a real wallet (e.g. Phantom on web) is connected; used for on-chain create/unlock. */
  signAndSendTransaction: SignAndSendTransaction | null;

  /** Address to show in UI (same as publicKey for real wallets, DEMO_DISPLAY_ADDRESS for demo). */
  getDisplayAddress: () => string;
  setWallet: (publicKey: string, walletName: string, signAndSend?: SignAndSendTransaction | null) => void;
  setBalance: (balance: number) => void;
  disconnect: () => void;
  setConnecting: (connecting: boolean) => void;
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

const walletStorage = {
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

export const useWalletStore = create<WalletStore>()(
  persist(
    (set, get) => ({
      publicKey: null,
      connected: false,
      balance: 0,
      walletName: null,
      connecting: false,
      signAndSendTransaction: null,

      getDisplayAddress: () => {
        const state = get();
        if (state.walletName === 'Demo' && state.connected) return DEMO_DISPLAY_ADDRESS;
        return state.publicKey ?? '';
      },

      setWallet: (publicKey, walletName, signAndSend = null) =>
        set({ publicKey, connected: true, walletName, connecting: false, signAndSendTransaction: signAndSend ?? null }),

      setBalance: (balance) => set({ balance }),

      disconnect: () =>
        set({
          publicKey: null,
          connected: false,
          balance: 0,
          walletName: null,
          connecting: false,
          signAndSendTransaction: null,
        }),

      setConnecting: (connecting) => set({ connecting: connecting === true }),
    }),
    {
      name: 'chronovault-wallet',
      storage: createJSONStorage(() => walletStorage),
      partialize: (state) => ({
        publicKey: state.publicKey,
        walletName: state.walletName,
        connected: state.connected,
      }),
    }
  )
);
