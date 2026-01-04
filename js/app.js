// js/app.js
import { initFarcaster } from "./farcaster.js";
import { initWalletUI, autoConnectWallet, getQuickAuthToken } from "./wallet.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ensureDOM() {
  if (document.readyState === "loading") {
    await new Promise((r) =>
      document.addEventListener("DOMContentLoaded", r, { once: true })
    );
  }
}

async function readyBackup(retries = 8, delayMs = 200) {
  const sdk = window.__FC_SDK__;
  if (!sdk?.actions?.ready) return;

  for (let i = 0; i < retries; i++) {
    try {
      await sdk.actions.ready();
      return;
    } catch {
      await sleep(delayMs);
    }
  }
}

// Auto sign-in only if profile is still empty/guest
async function autoSignInIfNeeded() {
  const fidEl = document.getElementById("fcFid");
  const userEl = document.getElementById("fcUser");

  const fidText = (fidEl?.textContent || "").trim();
  const userText = (userEl?.textContent || "").trim();

  const looksEmpty =
    !fidText || fidText === "FID: -" || userText === "@-" || userText.includes("Profile unavailable");

  if (!looksEmpty) return;

  // QuickAuth may fail in normal browser; ignore errors (toast handled in wallet.js)
  try {
    await getQuickAuthToken();
  } catch {}
}

async function main() {
  await ensureDOM();

  // 1) Farcaster init
  await initFarcaster();

  // 2) UI init
  initWalletUI();

  // 3) Silent wallet reconnect
  await autoConnectWallet();

  // 4) Dismiss splash safely
  await readyBackup();

  // 5) ✅ Auto sign-in QuickAuth (calls /api/me and fills profile)
  await autoSignInIfNeeded();
}

main().catch((e) => console.error("App init failed:", e));
