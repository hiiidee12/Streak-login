// js/farcaster.js
import { $ } from "./ui.js";

async function safeReady(sdk) {
  // Call ready() a few times (dev tool sometimes needs it)
  for (let i = 0; i < 8; i++) {
    try {
      await sdk.actions.ready();
      return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

export async function initFarcaster() {
  const { sdk } = await import("https://esm.sh/@farcaster/miniapp-sdk");
  window.__FC_SDK__ = sdk;

  // detect mini app (best effort)
  let inMini = true;
  try { inMini = await sdk.isInMiniApp(); } catch {}

  // If not mini app, just show env and stop
  if (!inMini) {
    const env = $("env");
    if (env) {
      env.style.display = "block";
      env.textContent = "Running in normal browser 🌐";
    }
    return;
  }

  // In mini app: hide env
  const env = $("env");
  if (env) env.style.display = "none";

  // Try read user (best effort)
  try {
    let user = null;
    for (let i = 0; i < 10; i++) {
      user = sdk.context?.user || null;
      if (user) break;
      await new Promise((r) => setTimeout(r, 150));
    }

    if (user) {
      $("fcName").textContent = user.displayName || user.username || "Farcaster User";
      $("fcUser").textContent = "@" + (user.username || "unknown");
      $("fcFid").textContent = "FID: " + (user.fid ?? "-");
      if (user.pfpUrl) $("pfp").src = user.pfpUrl;
    } else {
      $("fcName").textContent = "Guest";
      $("fcUser").textContent = "Profile unavailable (Embed Tool)";
      $("fcFid").textContent = "FID: -";
    }
  } catch {
    // ignore
  }

  // ✅ Always dismiss splash (retry)
  await safeReady(sdk);
}
