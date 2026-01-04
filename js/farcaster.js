import { $ } from "./ui.js";

export async function initFarcaster() {
  const { sdk } = await import("https://esm.sh/@farcaster/miniapp-sdk");

  // Expose early so other modules can use it
  window.__FC_SDK__ = sdk;

  let inMini = false;
  try {
    inMini = await sdk.isInMiniApp();
  } catch {}

  // Hide env banner inside mini app
  if (inMini) {
    $("env").style.display = "none";
  } else {
    $("env").style.display = "block";
    $("env").textContent = "Running in normal browser 🌐";
  }

  // Try load profile (best effort; never block ready())
  if (inMini) {
    try {
      let ctx = null;

      try {
        if (typeof sdk.getContext === "function") ctx = await sdk.getContext();
      } catch {}

      if (!ctx) {
        try { ctx = sdk.context; } catch {}
      }

      const user = ctx?.user;
      if (user) {
        $("fcName").textContent = user.displayName || user.username || "Farcaster User";
        $("fcUser").textContent = "@" + (user.username || "unknown");
        $("fcFid").textContent = "FID: " + (user.fid ?? "-");
        if (user.pfpUrl) $("pfp").src = user.pfpUrl;
      }
    } catch {
      // ignore profile errors
    }

    // ✅ ALWAYS call ready() when in mini app (even if profile failed)
    try { await sdk.actions.ready(); } catch {}
  }
}
