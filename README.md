# ChronoVault

ChronoVault is a crypto “time‑capsule” app where you lock in predictions tied to on‑chain stakes and verifiable future conditions (like asset prices on a specific date).




https://github.com/user-attachments/assets/5034d8df-6d3b-4e63-821c-8f3a3477f8ec


### Features

- **Time‑locked capsules**: Create messages with optional media that can only be opened after a chosen unlock date.
- **On‑chain security**: Capsules are represented as Solana accounts using the ChronoVault program and PDAs.
- **Price‑prediction conditions**: Attach conditions like “SOL price \> \$X at time T” with support for SOL, BTC, ETH, and TRUMP.
- **Escrowed SOL stakes**: Stake SOL into a capsule; escrow is returned or lost based on the condition result.
- **Encrypted storage via IPFS**: Capsule contents are encrypted client‑side and stored by CID (real Web3.Storage or simulated in dev).
- **Wallet integration**: Connect Phantom / injected wallets on web, or use a demo wallet flow for mobile / Expo Go.

### Tech stack

- **Runtime**: React Native + Expo (`expo-router`)
- **Blockchain**: Solana (`@solana/web3.js`) + custom ChronoVault on‑chain program
- **Storage**: IPFS via Web3.Storage (with a simulated fallback for development)
- **State**: Zustand stores
- **Styling/animation**: Nativewind (Tailwind‑style classes), Reanimated, Lottie

### Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   Create a `.env` (or Expo env config) with at least:

   ```bash
   EXPO_PUBLIC_SOLANA_CLUSTER=devnet   # or mainnet-beta
   # Optional: real Web3.Storage token enables live IPFS instead of simulated storage
   EXPO_PUBLIC_WEB3_STORAGE_TOKEN=your_token_here
   ```

3. **Run the app**

   ```bash
   npm run start
   ```

   Then open in a device/emulator or in the browser via Expo.

### Wallets and networks

- **Web**: Connect a Solana wallet (e.g. Phantom, Solflare, Backpack). The app uses injected `window.solana` for `signAndSendTransaction` or `signTransaction + sendRawTransaction`.
- **Mobile / Expo Go**: A demo wallet is available for local exploration; it does not sign real on‑chain transactions.
- **Cluster selection**: Controlled by `EXPO_PUBLIC_SOLANA_CLUSTER` (`devnet` by default).

### Capsules, conditions, and storage

- **Capsule metadata** includes title, creator pubkey, unlock timestamp, encrypted CID, escrow amount, privacy mode, and optional prediction condition.
- **Prediction conditions** support greater/less‑than comparators on SOL/BTC/ETH/TRUMP USD prices, evaluated via a price API service.
- **IPFS**: When a Web3.Storage token is configured, capsule payloads are uploaded to IPFS; otherwise, a local in‑memory simulation is used so the app still works in development.

### Development scripts

- **`npm run start`**: Start Expo dev server.
- **`npm run start:web` / `npm run web`**: Run in a web browser.
- **`npm run android` / `npm run ios`**: Run on Android or iOS (requires native tooling).
- **`npm run lint`**: Run ESLint checks.

### Project structure (high level)

- `src/services/solana.ts`: Solana connection helpers and ChronoVault program instructions (create/unlock capsule).
- `src/services/ipfs.ts`: Web3.Storage + simulated IPFS helpers.
- `src/types/capsule.ts`: Capsule, condition, and evaluation types.
- `src/hooks/useWalletConnection.ts`: Wallet connect/disconnect and balance management.
- `src/components/capsule/*`: UI components for capsule cards, timers, empty states, etc.

### Disclaimer

ChronoVault is an experimental application. Do not store high‑value secrets or stake significant amounts of SOL or other assets in this project without fully understanding the risks.

