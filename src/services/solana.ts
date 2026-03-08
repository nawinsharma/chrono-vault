import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
  clusterApiUrl,
} from '@solana/web3.js';

/** 'mainnet-beta' for production, 'devnet' for development. Set EXPO_PUBLIC_SOLANA_CLUSTER in .env or EAS env. */
const SOLANA_CLUSTER: 'mainnet-beta' | 'devnet' =
  (process.env.EXPO_PUBLIC_SOLANA_CLUSTER as 'mainnet-beta' | 'devnet') ||
  'devnet';

const PROGRAM_ID = new PublicKey(
  'u8Jw4y4seuWQYPMpZHwFGiPLUzXi1vFrKm6MB5Kiy8f'
);

const connection = new Connection(clusterApiUrl(SOLANA_CLUSTER), 'confirmed');

export function getSolanaCluster(): 'mainnet-beta' | 'devnet' {
  return SOLANA_CLUSTER;
}

export function getConnection(): Connection {
  return connection;
}

export async function getBalance(publicKey: string): Promise<number> {
  const balance = await connection.getBalance(new PublicKey(publicKey));
  return balance / LAMPORTS_PER_SOL;
}

export async function requestAirdrop(publicKey: string): Promise<string> {
  const signature = await connection.requestAirdrop(
    new PublicKey(publicKey),
    2 * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(signature);
  return signature;
}

function findCapsulePDA(
  creatorPubkey: PublicKey,
  capsuleId: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('capsule'),
      creatorPubkey.toBuffer(),
      Buffer.from(capsuleId),
    ],
    PROGRAM_ID
  );
}

export function buildCreateCapsuleInstruction(params: {
  creatorPubkey: string;
  capsuleId: string;
  unlockTimestamp: number;
  encryptedCid: string;
  escrowAmount: number;
}): { transaction: Transaction; capsulePDA: string } {
  const creator = new PublicKey(params.creatorPubkey);
  const [capsulePDA] = findCapsulePDA(creator, params.capsuleId);

  const escrowLamports = Math.floor(params.escrowAmount * LAMPORTS_PER_SOL);

  const discriminator = Buffer.from([0x01]);
  const capsuleIdBuffer = Buffer.alloc(4 + params.capsuleId.length);
  capsuleIdBuffer.writeUInt32LE(params.capsuleId.length, 0);
  capsuleIdBuffer.write(params.capsuleId, 4);

  const timestampBuffer = Buffer.alloc(8);
  timestampBuffer.writeBigInt64LE(BigInt(params.unlockTimestamp));

  const cidBuffer = Buffer.alloc(4 + params.encryptedCid.length);
  cidBuffer.writeUInt32LE(params.encryptedCid.length, 0);
  cidBuffer.write(params.encryptedCid, 4);

  const escrowBuffer = Buffer.alloc(8);
  escrowBuffer.writeBigInt64LE(BigInt(escrowLamports));

  const data = Buffer.concat([
    discriminator,
    capsuleIdBuffer,
    timestampBuffer,
    cidBuffer,
    escrowBuffer,
  ]);

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: capsulePDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  const transaction = new Transaction().add(instruction);

  return { transaction, capsulePDA: capsulePDA.toBase58() };
}

export function buildUnlockCapsuleInstruction(params: {
  creatorPubkey: string;
  capsuleId: string;
}): Transaction {
  const creator = new PublicKey(params.creatorPubkey);
  const [capsulePDA] = findCapsulePDA(creator, params.capsuleId);

  const discriminator = Buffer.from([0x02]);
  const capsuleIdBuffer = Buffer.alloc(4 + params.capsuleId.length);
  capsuleIdBuffer.writeUInt32LE(params.capsuleId.length, 0);
  capsuleIdBuffer.write(params.capsuleId, 4);

  const data = Buffer.concat([discriminator, capsuleIdBuffer]);

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: capsulePDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  return new Transaction().add(instruction);
}

/** Sign and send a transaction (e.g. from Phantom); returns signature. */
export type SignAndSendTransaction = (tx: Transaction) => Promise<string>;

/** Create capsule on-chain. Use when a real wallet signer is available. */
export async function sendCreateCapsule(
  params: {
    creatorPubkey: string;
    capsuleId: string;
    unlockTimestamp: number;
    encryptedCid: string;
    escrowAmount: number;
  },
  signAndSend: SignAndSendTransaction
): Promise<string> {
  const { transaction, capsulePDA } = buildCreateCapsuleInstruction(params);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = new PublicKey(params.creatorPubkey);
  const signature = await signAndSend(transaction);
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });
  return signature;
}

/** Unlock capsule on-chain. Use when a real wallet signer is available. */
export async function sendUnlockCapsule(
  params: { creatorPubkey: string; capsuleId: string },
  signAndSend: SignAndSendTransaction
): Promise<string> {
  const transaction = buildUnlockCapsuleInstruction(params);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = new PublicKey(params.creatorPubkey);
  const signature = await signAndSend(transaction);
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });
  return signature;
}

