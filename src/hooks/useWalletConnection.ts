import { getBalance, getConnection } from "@/src/services/solana";
import type { SignAndSendTransaction } from "@/src/stores/walletStore";
import { useWalletStore } from "@/src/stores/walletStore";
import { useCallback } from "react";
import { Platform } from "react-native";

declare global {
  interface Window {
    solana?: {
      connect: () => Promise<{ publicKey: { toBase58(): string } }>;
      signTransaction: (tx: {
        serialize: () => Buffer;
      }) => Promise<{ serialize: () => Buffer }>;
      signAndSendTransaction?: (tx: unknown) => Promise<{ signature: string }>;
    };
  }
}

/** On web, get sign-and-send from Phantom/injected wallet. */
function getWebSignAndSend(): SignAndSendTransaction | null {
  if (typeof window === "undefined" || !window.solana) return null;
  const wallet = window.solana;
  const connection = getConnection();
  return async (tx) => {
    if (wallet.signAndSendTransaction) {
      const result = await wallet.signAndSendTransaction(tx);
      return typeof result === "object" &&
        result !== null &&
        "signature" in result
        ? (result as { signature: string }).signature
        : String(result);
    }
    const signed = await wallet.signTransaction(tx);
    const raw = signed.serialize();
    const sig = await connection.sendRawTransaction(raw, {
      skipPreflight: false,
    });
    return sig;
  };
}

const WALLET_REQUIRED_MESSAGE =
  Platform.OS === "web"
    ? "Install a Solana wallet (e.g. Phantom at phantom.app) and refresh, then connect."
    : "Connect a Solana wallet on web (e.g. Phantom in your browser) to create and unlock capsules.";

/** Dummy public key for demo wallet (mobile / Expo Go); no real signing. */
export const DEMO_WALLET_PUBLIC_KEY =
  "DemoWallet111111111111111111111111111111111";

export function useWalletConnection() {
  const store = useWalletStore();

  const connectDemoWallet = useCallback(() => {
    store.setWallet(DEMO_WALLET_PUBLIC_KEY, "Demo", null);
    store.setBalance(0);
  }, [store]);

  const connect = useCallback(
    async (walletName: string) => {
      store.setConnecting(true);
      try {
        const isWeb = Platform.OS === "web";
        const hasInjected = typeof window !== "undefined" && !!window.solana;
        const useInjected =
          isWeb &&
          (walletName === "Phantom" ||
            walletName === "Solflare" ||
            walletName === "Backpack");

        if (useInjected && hasInjected && window.solana) {
          const { publicKey } = await window.solana.connect();
          const pubkeyStr = publicKey.toBase58();
          const signAndSend = getWebSignAndSend();
          store.setWallet(pubkeyStr, walletName, signAndSend);
          try {
            const balance = await getBalance(pubkeyStr);
            store.setBalance(balance);
          } catch {
            store.setBalance(0);
          }
          return pubkeyStr;
        }

        store.setConnecting(false);
        throw new Error(
          hasInjected
            ? "Could not connect to wallet."
            : WALLET_REQUIRED_MESSAGE,
        );
      } catch (error) {
        store.setConnecting(false);
        throw error;
      }
    },
    [store],
  );

  const disconnect = useCallback(() => {
    store.disconnect();
  }, [store]);

  const refreshBalance = useCallback(async () => {
    if (!store.publicKey) return;
    try {
      const balance = await getBalance(store.publicKey);
      store.setBalance(balance);
    } catch {
      // Silently fail on balance refresh
    }
  }, [store]);

  const isDemoWallet =
    store.connected &&
    (store.walletName === "Demo" || store.publicKey === DEMO_WALLET_PUBLIC_KEY);

  return {
    ...store,
    connect,
    connectDemoWallet,
    disconnect,
    refreshBalance,
    isDemoWallet,
  };
}
