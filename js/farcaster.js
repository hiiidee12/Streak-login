import { $ } from "./ui.js";

export async function initFarcaster() {
  // Load SDK from ESM (stays module-safe even when split into files)
  const { sdk } = await import("https://esm.sh/@farcaster/miniapp-sdk");

  // Hide env banner in Mini App, show only in normal browser
  try {
    const inMini = await sdk.isInMiniApp();
    if (inMini) {
      $("env").style.display = "none";
    } else {
      $("env").style.display = "block";
      $("env").textContent = "Running in normal browser 🌐";
    }

    // Read profile
    if (inMini) {
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

      // dismiss splash
      try { await sdk.actions.ready(); } catch {}
    }
  } catch {
    $("env").style.display = "none";
  }

  // Expose sdk globally for wallet module (simple & reliable for static)
  window.__FC_SDK__ = sdk;
}
