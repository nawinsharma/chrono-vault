export enum CapsuleStatus {
  Locked = 0,
  Unlocked = 1,
}

export enum PrivacyMode {
  Private = 'private',
  Public = 'public',
}

export interface CapsuleData {
  title: string;
  message: string;
  mediaUrl?: string;
  creatorWallet: string;
  createdAt: number;
}

export interface CapsuleMetadata {
  id: string;
  title: string;
  creatorPubkey: string;
  unlockTimestamp: number;
  encryptedCid: string;
  escrowAmount: number;
  status: CapsuleStatus;
  privacyMode: PrivacyMode;
  createdAt: number;
  transactionHash?: string;
  encryptionKeyId: string;
}

export interface CreateCapsuleInput {
  title: string;
  message: string;
  mediaUri?: string;
  unlockDate: Date;
  privacyMode: PrivacyMode;
  escrowAmount?: number;
}

export interface DecryptedCapsule {
  title: string;
  message: string;
  mediaUrl?: string;
  creatorWallet: string;
  createdAt: number;
}
