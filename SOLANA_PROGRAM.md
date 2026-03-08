# ChronoVault – How It Works, Run & Test

## 1. How the whole app works (flow)

1. **Onboarding** → User sees “Send a message to your future wallet”, can **Connect Wallet** or **Explore Demo**.
2. **Connect** → Picks Phantom/Solflare/Backpack; app stores a public key (simulated for now).
3. **Home** → Lists **Active** (locked) and **Unlocked** capsules; **Create Capsule**.
4. **Create Capsule** → User enters title, message, optional image, unlock date, privacy, optional SOL escrow. App:
   - Encrypts payload (AES-256) and stores key in SecureStore.
   - Uploads encrypted blob to IPFS (or simulated storage), gets CID.
   - Would send a **create_capsule** tx to the Solana program (currently **simulated** in the app).
   - Saves capsule metadata locally (Zustand + AsyncStorage).
5. **Capsule detail** → Shows countdown; when time has passed, **Unlock Capsule** is enabled.
6. **Unlock** → App would call **unlock_capsule** on Solana (currently **simulated**), then fetches from IPFS, decrypts with stored key, and shows the “vault open” animation and message.

So: **frontend is full; Solana is real in the program repo, but the app still uses simulated create/unlock.** To use the real program from the app you’d switch the app to call the program via Anchor/TS (see end of doc).

---

## 2. How to run the app (frontend)

From the **repo root** (`ChronoVault/`):

```bash
npm install
npx expo start
```

Then:  
- **Web:** press `w` or open the URL.  
- **Android:** press `a` or run `npx expo start --android`.  
- **iOS:** `npx expo start --ios` (Mac + Xcode).

No Solana program needs to be running for the app; it works with simulated transactions.

---

## 3. Solana program – what it does

The program has two instructions.

### 3.1 `create_capsule`

- **Accounts:** `creator` (signer), `capsule` (PDA), `system_program`.
- **Args:** `capsule_id` (string), `unlock_timestamp` (i64), `encrypted_cid` (string), `escrow_amount` (u64).
- **Logic:**
  - Requires `unlock_timestamp > Clock::get().unix_timestamp`.
  - Creates a **Capsule** PDA with seeds: `["capsule", creator.key(), capsule_id]`.
  - Stores: creator, capsule_id, unlock_timestamp, encrypted_cid, escrow_amount, status = Locked, created_at, bump.
  - If `escrow_amount > 0`, transfers that many lamports from `creator` to the **capsule PDA** (escrow).
- **Errors:** UnlockTimestampMustBeFuture, CapsuleIdTooLong, CidTooLong.

### 3.2 `unlock_capsule`

- **Accounts:** `creator` (signer), `capsule` (PDA), `system_program`.
- **Args:** `capsule_id` (string).
- **Logic:**
  - Requires capsule is Locked, `Clock::get().unix_timestamp >= capsule.unlock_timestamp`, and signer is `capsule.creator`.
  - Sets capsule status to Unlocked.
  - If capsule had escrow, moves lamports from capsule PDA back to `creator` and sets escrow to 0.
- **Errors:** CapsuleAlreadyUnlocked, UnlockTimestampNotReached, UnauthorizedUnlock.

So: **on-chain we only store metadata + optional SOL escrow; the actual message is off-chain (IPFS) and encrypted on the client.**

---

## 4. How to run the Solana program (build, deploy, test)

All Solana/Anchor commands below are run from the **Anchor project root**:  
`ChronoVault/programs/chrono_vault/`.

### 4.1 Prerequisites

- **Rust:**  
  `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Solana CLI:**  
  `sh -c "$(curl -sSfL https://release.solana.com/stable/install)"`  
  Then `solana --version`.
- **Anchor CLI:**  
  `cargo install --git https://github.com/coral-xyz/anchor avm --locked && avm install latest && avm use latest`  
  Then `anchor --version`.
- **Node (for tests):** Node 18+ and `yarn` or `npm` in the Anchor project.

### 4.2 First-time setup (program ID)

The program id in the code is `CVau1tTKQCX1XyR5XpCTVBUQ4oTnmRTCXB6mhDvgDpF`. To use your own:

1. From `programs/chrono_vault/` run:
   ```bash
   anchor keys list
   ```
   If no keypair exists, run `anchor build` once; it will generate `target/deploy/chrono_vault-keypair.json` and print the program id.
2. Copy that program id into:
   - `programs/chrono_vault/programs/chrono_vault/src/lib.rs`:  
     `declare_id!("YOUR_PROGRAM_ID");`
   - `programs/chrono_vault/Anchor.toml`:  
     `chrono_vault = "YOUR_PROGRAM_ID"` under `[programs.localnet]` and `[programs.devnet]`.
   - In the **Expo app**: `src/services/solana.ts` → `PROGRAM_ID` (only needed when you switch the app to real program calls).

### 4.3 Build

From `ChronoVault/programs/chrono_vault/`:

```bash
anchor build
```

- Compiles the program and writes:
  - `target/deploy/chrono_vault.so`
  - `target/idl/chrono_vault.json`
  - `target/types/chrono_vault.ts`
- Tests use the IDL and types from here.

### 4.4 Run tests (local validator + tests)

From `ChronoVault/programs/chrono_vault/`:

```bash
anchor test
```

This will:

1. Start a **local Solana validator** (short-lived).
2. Deploy `chrono_vault.so` to it.
3. Run the test file `tests/chrono_vault.ts` (with `yarn`/`npm` and `ts-mocha` as in `Anchor.toml`).

So you don’t “run the program” as a long-lived process; you run **tests** that deploy and invoke it on a local chain.

### 4.5 Deploy to devnet (optional)

1. Configure Solana for devnet and create/fund a keypair:
   ```bash
   solana config set --url devnet
   solana keygen new
   solana airdrop 2
   ```
2. From `programs/chrono_vault/`:
   ```bash
   anchor deploy --provider.cluster devnet
   ```
3. After deploy, the program id (from `declare_id!` / `Anchor.toml`) is the one on devnet. Use that in the app’s `PROGRAM_ID` when you switch from simulated to real txs.

### 4.6 Production: deploy to mainnet

1. **Wallet with SOL:** Use your keypair (e.g. `~/.config/solana/id.json`) and ensure it has enough SOL for deploy (often 2–5+ SOL depending on program size).
2. **Point Solana CLI to mainnet:**
   ```bash
   solana config set --url mainnet-beta
   solana balance
   ```
3. **Build and deploy** from `programs/chrono_vault/`:
   ```bash
   anchor build
   anchor deploy --provider.cluster mainnet
   ```
4. **App:** Set `EXPO_PUBLIC_SOLANA_CLUSTER=mainnet-beta` in your environment (e.g. `.env` or EAS environment variables) so the app uses mainnet. Program ID stays the same in `lib.rs`, `Anchor.toml`, and `src/services/solana.ts`.

### 4.7 Run program tests (after fixing test runner)

From `programs/chrono_vault/` ensure dependencies are installed, then run tests:

```bash
npm install
anchor test
```

The test script uses `npx ts-mocha` (no yarn required).

---

## 5. Flow summary

| Step | Where | What happens |
|------|--------|--------------|
| 1 | App | User connects wallet (simulated), creates capsule (encrypt + IPFS + **simulated** create_capsule). |
| 2 | Solana (when using real program) | **create_capsule**: validate time, create Capsule PDA, optionally escrow SOL. |
| 3 | App | Shows countdown; when time passed, user taps Unlock. |
| 4 | Solana (when using real program) | **unlock_capsule**: check time + creator, set Unlocked, return escrow to creator. |
| 5 | App | Fetch ciphertext from IPFS, decrypt with stored key, show message. |

---

## 6. Using the real program from the app (future)

Right now the app uses `simulateCreateCapsule` and `simulateUnlockCapsule` in `src/services/solana.ts`. To use the **real** program:

1. Build and deploy the program (e.g. devnet) and set `PROGRAM_ID` in `solana.ts` to the deployed id.
2. Use **Anchor in the app** (or the generated IDL) to build instructions:
   - Install `@coral-xyz/anchor` in the Expo project.
   - Load the IDL (e.g. from `target/idl/chrono_vault.json` or a hosted URL).
   - Use `program.methods.createCapsule(...).accounts({...}).transaction()` and have the wallet sign it (e.g. via Solana Mobile Wallet Adapter or Wallet Standard).
3. Replace the `simulate*` calls with these real transactions.

That’s how the Solana program fits in and how to run and test it.
