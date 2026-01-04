// js/wallet.js
import { CONFIG } from "./config.js";
import { $, setStatus, showToast, openModal } from "./ui.js";

let ethProvider = null;
let address = "";

/* =========================
   Helpers
========================= */
function todayKeyUTC() {
  return new Date().toISOString().slice(0, 10);
}

function hasCheckedInToday() {
  return localStorage.getItem(CONFIG.LS_KEY) === todayKeyUTC();
}

function shortAddr(a) {
  return a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "";
}

function updateButtons() {
  const checked = hasCheckedInToday();
  const btn = $("checkinBtn");
  if (!btn) return;

  btn.disabled = !address || checked;
  btn.textContent = checked
    ? "Already checked in today ✅"
    : "Daily Check-in (Tx)";
}

function setConnectButtonConnected(isConnected) {
  const btn = $("connectBtn");
  if (!btn) return;

  if (isConnected) {
    btn.textContent = "Connected ✅";
    btn.disabled = true;
  } else {
    btn.textContent = "Connect Wallet";
    btn.disabled = false;
  }
}

async function getWalletProvider() {
  const sdk = window.__FC_SDK__;
  try {
    if (sdk?.wallet?.getEthereumProvider) {
      const p = await sdk.wallet.getEthereumProvider();
      if (p) return p;
    }
  } catch {}
  return window.ethereum || null;
}

/* =========================
   Base RPC helpers
========================= */
async function rpc(method, params = []) {
  const res = await fetch(CONFIG.BASE_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "RPC error");
  return json.result;
}

async function waitForReceipt(txHash, timeoutMs = 120000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const receipt = await rpc("eth_getTransactionReceipt", [txHash]);
    if (receipt) return receipt;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Timeout waiting for confirmation");
}

function utf8ToHex(str) {
  const enc = new TextEncoder().encode(str);
  return (
    "0x" +
    Array.from(enc)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

function setConnectedUI(chainIdDec) {
  $("addr").textContent = shortAddr(address);

  if (chainIdDec) {
    $("net").textContent =
      `chainId ${chainIdDec}` +
      (chainIdDec === CONFIG.BASE_CHAIN_ID_DEC ? " (Base ✅)" : "");
  } else {
    $("net").textContent = "-";
  }

  if (chainIdDec && chainIdDec !== CONFIG.BASE_CHAIN_ID_DEC) {
    setStatus("Connected (not Base) ⚠️", "warn");
  } else {
    setStatus("Connected ✅", "ok");
  }

  setConnectButtonConnected(true);
  updateButtons();
}

/* =========================
   Wallet connect
========================= */
export async function connectWallet() {
  setStatus("Connecting...", "warn");
  setConnectButtonConnected(false);

  ethProvider = await getWalletProvider();
  if (!ethProvider?.request) {
    setStatus("No wallet provider", "err");
    showToast("No wallet provider", "Open in Warpcast Mini App");
    return;
  }

  let accounts = [];
  try {
    accounts = await ethProvider.request({
      method: "eth_requestAccounts",
      params: [],
    });
  } catch (e) {
    setStatus("Connection rejected", "err");
    showToast("Rejected", e?.message || "User rejected");
    return;
  }

  address = accounts?.[0] || "";
  if (!address) {
    setStatus("No account", "err");
    return;
  }

  let chainIdDec = 0;
  try {
    const chainIdHex = await ethProvider.request({ method: "eth_chainId" });
    chainIdDec = parseInt(chainIdHex, 16);
  } catch {}

  setConnectedUI(chainIdDec);
}

/* =========================
   Auto-connect (silent)
========================= */
export async function autoConnectWallet() {
  try {
    ethProvider = await getWalletProvider();
    if (!ethProvider?.request) return;

    const accounts = await ethProvider.request({
      method: "eth_accounts",
      params: [],
    });
    const a = accounts?.[0];
    if (!a) return;

    address = a;

    let chainIdDec = 0;
    try {
      const chainIdHex = await ethProvider.request({ method: "eth_chainId" });
      chainIdDec = parseInt(chainIdHex, 16);
    } catch {}

    setConnectedUI(chainIdDec);
  } catch {}
}

/* =========================
   Daily check-in (tx)
========================= */
export async function dailyCheckin() {
  if (!ethProvider || !address) {
    showToast("Not connected", "Connect wallet first");
    return;
  }

  if (hasCheckedInToday()) {
    setStatus("Already checked in today ✅", "ok");
    updateButtons();
    return;
  }

  const ok = confirm(
    "This will send a 0 ETH transaction and still costs gas. Continue?"
  );
  if (!ok) return;

  try {
    const chainIdHex = await ethProvider.request({ method: "eth_chainId" });
    const chainIdDec = parseInt(chainIdHex, 16);
    if (chainIdDec !== CONFIG.BASE_CHAIN_ID_DEC) {
      setStatus("Wrong network", "err");
      showToast("Wrong network", "Please switch to Base");
      return;
    }
  } catch {}

  const data = utf8ToHex("DAILY_CHECKIN:" + todayKeyUTC());

  let txHash = "";
  try {
    setStatus("Sending transaction...", "warn");
    txHash = await ethProvider.request({
      method: "eth_sendTransaction",
      params: [{ from: address, to: address, value: "0x0", data }],
    });
  } catch (e) {
    setStatus("Tx failed", "err");
    showToast("Tx failed", e?.message || "Rejected");
    return;
  }

  try {
    setStatus("Waiting confirmation...", "warn");
    await waitForReceipt(txHash);

    localStorage.setItem(CONFIG.LS_KEY, todayKeyUTC());
    updateButtons();

    setStatus("Check-in successful ✅", "ok");
    showToast("Success ✅", "Confirmed on Base");

    openModal({
      title: "Check-in successful ✅",
      sub: "Confirmed on Base",
      txHash,
      explorerUrl: CONFIG.EXPLORER_TX(txHash),
    });
  } catch {
    setStatus("Tx sent ⚠️", "warn");
    showToast("Tx sent", "Confirmation pending");
  }
}

/* =========================
   QuickAuth → backend verify
========================= */
export async function getQuickAuthToken() {
  const sdk = window.__FC_SDK__;
  try {
    const token = await sdk.quickAuth.getToken();

    const r = await fetch("/api/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await r.json();
    if (!r.ok) {
      console.log("verify failed:", data);
      showToast("Sign-in failed", "Check console log");
      return;
    }

    const name = data.displayName || data.username || "Farcaster User";
    const username = data.username ? `@${data.username}` : "@unknown";
    const fid = data.fid ?? "-";

    $("fcName").textContent = name;
    $("fcUser").textContent = username;
    $("fcFid").textContent = `FID: ${fid}`;
    if (data.pfpUrl) $("pfp").src = data.pfpUrl;

    showToast("Signed in ✅", "Profile loaded");
  } catch (e) {
    showToast("QuickAuth failed", e?.message || String(e));
  }
}

/* =========================
   Init UI
========================= */
export function initWalletUI() {
  setConnectButtonConnected(false);
  updateButtons();

  $("connectBtn").onclick = connectWallet;
  $("checkinBtn").onclick = dailyCheckin;
  $("authBtn").onclick = getQuickAuthToken;
}
