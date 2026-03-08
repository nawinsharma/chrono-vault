import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { ChronoVault } from '../target/types/chrono_vault';
import { expect } from 'chai';

describe('chrono_vault', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ChronoVault as Program<ChronoVault>;
  const creator = provider.wallet;

  const capsuleId = `test-capsule-${Date.now()}`;
  const encryptedCid = 'bafkreitest1234567890abcdef';

  function findCapsulePDA(capsuleId: string): [anchor.web3.PublicKey, number] {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from('capsule'),
        creator.publicKey.toBuffer(),
        Buffer.from(capsuleId),
      ],
      program.programId
    );
  }

  it('Creates a capsule with future unlock timestamp', async () => {
    const unlockTimestamp = new anchor.BN(Math.floor(Date.now() / 1000) + 86400);
    const escrowAmount = new anchor.BN(0);
    const [capsulePDA] = findCapsulePDA(capsuleId);

    const tx = await program.methods
      .createCapsule(capsuleId, unlockTimestamp, encryptedCid, escrowAmount)
      .accounts({
        creator: creator.publicKey,
        capsule: capsulePDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log('Create capsule tx:', tx);

    const capsuleAccount = await program.account.capsule.fetch(capsulePDA);
    expect(capsuleAccount.creator.toBase58()).to.equal(creator.publicKey.toBase58());
    expect(capsuleAccount.capsuleId).to.equal(capsuleId);
    expect(capsuleAccount.encryptedCid).to.equal(encryptedCid);
    expect(capsuleAccount.status).to.equal(0);
  });

  it('Rejects capsule with past unlock timestamp', async () => {
    const pastCapsuleId = `past-${Date.now()}`;
    const pastTimestamp = new anchor.BN(Math.floor(Date.now() / 1000) - 100);
    const [capsulePDA] = findCapsulePDA(pastCapsuleId);

    try {
      await program.methods
        .createCapsule(pastCapsuleId, pastTimestamp, encryptedCid, new anchor.BN(0))
        .accounts({
          creator: creator.publicKey,
          capsule: capsulePDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      expect.fail('Expected error');
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal('UnlockTimestampMustBeFuture');
    }
  });

  it('Creates a capsule with escrow SOL', async () => {
    const escrowCapsuleId = `escrow-${Date.now()}`;
    const unlockTimestamp = new anchor.BN(Math.floor(Date.now() / 1000) + 86400);
    const escrowAmount = new anchor.BN(100_000_000);
    const [capsulePDA] = findCapsulePDA(escrowCapsuleId);

    const tx = await program.methods
      .createCapsule(escrowCapsuleId, unlockTimestamp, encryptedCid, escrowAmount)
      .accounts({
        creator: creator.publicKey,
        capsule: capsulePDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log('Create capsule with escrow tx:', tx);

    const capsuleAccount = await program.account.capsule.fetch(capsulePDA);
    expect(capsuleAccount.escrowAmount.toNumber()).to.equal(100_000_000);
  });

  it('Rejects early unlock attempt', async () => {
    const [capsulePDA] = findCapsulePDA(capsuleId);

    try {
      await program.methods
        .unlockCapsule(capsuleId)
        .accounts({
          creator: creator.publicKey,
          capsule: capsulePDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      expect.fail('Expected error');
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal('UnlockTimestampNotReached');
    }
  });
});
