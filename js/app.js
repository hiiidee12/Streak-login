// js/app.js
import { initFarcaster } from "./farcaster.js";
import { initWalletUI } from "./wallet.js";

// Inisialisasi Farcaster Mini App (SDK, profile, splash)
await initFarcaster();

// Inisialisasi UI & event wallet (connect, check-in, auth)
initWalletUI();
