// js/app.js
import { initFarcaster } from "./farcaster.js";
import { initWalletUI, autoConnectWallet } from "./wallet.js";

await initFarcaster();
initWalletUI();
await autoConnectWallet();

// ✅ Backup ready call (harmless if already called)
try {
  const sdk = window.__FC_SDK__;
  if (sdk) {
    for (let i = 0; i < 6; i++) {
      try { await sdk.actions.ready(); break; } catch {}
      await new Promise((r) => setTimeout(r, 200));
    }
  }
} catch {}
