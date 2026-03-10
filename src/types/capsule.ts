export enum CapsuleStatus {
  Locked = 0,
  Unlocked = 1,
}

export enum PrivacyMode {
  Private = 'private',
  Public = 'public',
}

export enum CapsuleType {
  Standard = 'standard',
  Reputation = 'reputation',
}

export type ConditionResult = 'pending' | 'passed' | 'failed';

export type ConditionComparator = '>' | '>=' | '<' | '<=';

export type SupportedAsset = 'SOL' | 'BTC' | 'ETH' | 'TRUMP';

export const SUPPORTED_ASSETS: { id: SupportedAsset; label: string; coingeckoId: string; color: string }[] = [
  { id: 'SOL', label: 'Solana', coingeckoId: 'solana', color: '#9945FF' },
  { id: 'BTC', label: 'Bitcoin', coingeckoId: 'bitcoin', color: '#F7931A' },
  { id: 'ETH', label: 'Ethereum', coingeckoId: 'ethereum', color: '#627EEA' },
  { id: 'TRUMP', label: 'TRUMP', coingeckoId: 'official-trump', color: '#E63946' },
];

export const COMPARATOR_LABELS: Record<ConditionComparator, string> = {
  '>': 'greater than',
  '>=': 'greater than or equal to',
  '<': 'less than',
  '<=': 'less than or equal to',
};

export interface PricePredictionCondition {
  type: 'price_prediction';
  asset: SupportedAsset;
  comparator: ConditionComparator;
  targetPrice: number;
  evaluationTimestamp: number;
  currency: 'USD';
}

export type CapsuleCondition = PricePredictionCondition;

export interface CapsuleData {
  title: string;
  message: string;
  mediaUrl?: string;
  creatorWallet: string;
  createdAt: number;
  commitmentSalt?: string;
  commitmentVersion?: 1;
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
  isDemo?: boolean;
  capsuleType?: CapsuleType;
  commitmentHash?: string;
  commitmentVersion?: 1;
  condition?: CapsuleCondition;
  conditionResult?: ConditionResult;
  conditionEvaluation?: ConditionEvaluationResult;
}

export interface ConditionEvaluationResult {
  fetchedPrice: number;
  fetchedAt: number;
  source: string;
  expression: string;
  passed: boolean;
}

export interface CreateCapsuleInput {
  title: string;
  message: string;
  mediaUri?: string;
  unlockDate: Date;
  privacyMode: PrivacyMode;
  escrowAmount?: number;
  capsuleType?: CapsuleType;
  condition?: CapsuleCondition;
}

export interface DecryptedCapsule {
  title: string;
  message: string;
  mediaUrl?: string;
  creatorWallet: string;
  createdAt: number;
  commitmentSalt?: string;
  commitmentVersion?: 1;
}
