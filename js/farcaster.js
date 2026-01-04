import { $ } from "./ui.js";

export async function initFarcaster() {
  const { sdk } = await import("https://esm.sh/@farcaster/miniapp-sdk");
  window.__FC_SDK__ = sdk;

  let inMini = false;
  try { inMini = await sdk.isInMiniApp(); } catch {}

  if (inMini) {
    $("env").style.display = "none";
  } else {
    $("env").style.display = "block";
    $("env").textContent = "Running in normal browser 🌐";
    return;
  }

  // Best effort: read user context (may be missing depending on entry point)
  let user = null;
  try {
    for (let i = 0; i < 10; i++) {
      user = sdk.context?.user || null;
      if (user) break;
      await new Promise(r => setTimeout(r, 150));
    }
  } catch {}

  if (user) {
    $("fcName").textContent = user.displayName || user.username || "Farcaster User";
    $("fcUser").textContent = "@" + (user.username || "unknown");
    $("fcFid").textContent = "FID: " + (user.fid ?? "-");
    if (user.pfpUrl) $("pfp").src = user.pfpUrl;
  } else {
    // ✅ nicer fallback instead of "-"
    $("fcName").textContent = "Guest";
    $("fcUser").textContent = "Open from a Cast/DM to load profile";
    $("fcFid").textContent = "FID: -";
  }

  // ✅ Always dismiss splash
  try { await sdk.actions.ready(); } catch {}
}
