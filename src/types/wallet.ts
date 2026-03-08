export interface WalletState {
  publicKey: string | null;
  connected: boolean;
  balance: number;
  walletName?: string;
}

export type SupportedWallet = 'Phantom' | 'Solflare' | 'Backpack';
