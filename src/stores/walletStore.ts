import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Transaction } from '@solana/web3.js';

/** Signs and sends a transaction (from a real wallet); returns signature. Not persisted. */
export type SignAndSendTransaction = (tx: Transaction) => Promise<string>;

interface WalletStore {
  publicKey: string | null;
  connected: boolean;
  balance: number;
  walletName: string | null;
  connecting: boolean;
  /** Set when a real wallet (e.g. Phantom on web) is connected; used for on-chain create/unlock. */
  signAndSendTransaction: SignAndSendTransaction | null;

  setWallet: (publicKey: string, walletName: string, signAndSend?: SignAndSendTransaction | null) => void;
  setBalance: (balance: number) => void;
  disconnect: () => void;
  setConnecting: (connecting: boolean) => void;
}

export const useWalletStore = create<WalletStore>()(
  persist(
    (set) => ({
      publicKey: null,
      connected: false,
      balance: 0,
      walletName: null,
      connecting: false,
      signAndSendTransaction: null,

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

      setConnecting: (connecting) => set({ connecting }),
    }),
    {
      name: 'chronovault-wallet',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        publicKey: state.publicKey,
        walletName: state.walletName,
        connected: state.connected,
      }),
    }
  )
);
