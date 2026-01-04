// api/me.js
export default async function handler(req, res) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

    if (!token) {
      return res.status(401).json({ error: "Missing token" });
    }

    // Verify token with Farcaster QuickAuth verification endpoint
    // NOTE: This endpoint may change; if it fails, we will adapt based on latest docs.
    const r = await fetch("https://api.farcaster.xyz/v2/quickauth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!r.ok) {
      const t = await r.text();
      return res.status(401).json({ error: "Token verify failed", detail: t });
    }

    const data = await r.json();

    // Try to normalize user fields (depending on response structure)
    const user =
      data?.result?.user ||
      data?.user ||
      data?.result ||
      null;

    const fid = user?.fid ?? data?.result?.fid ?? null;
    const username = user?.username ?? data?.result?.username ?? null;
    const displayName = user?.displayName ?? user?.display_name ?? null;
    const pfpUrl = user?.pfpUrl ?? user?.pfp_url ?? null;

    return res.status(200).json({
      fid,
      username,
      displayName,
      pfpUrl,
      raw: data, // keep for debugging (you can remove later)
    });
  } catch (e) {
    return res.status(500).json({ error: "Server error", message: String(e?.message || e) });
  }
}
