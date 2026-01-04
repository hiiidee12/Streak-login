import { CONFIG } from "./config.js";
import { $, setStatus, showToast, openModal } from "./ui.js";

let ethProvider = null;
let address = "";

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
  $("checkinBtn").disabled = !address || checked;
  $("checkinBtn").textContent = checked ? "Already checked in today ✅" : "Daily Check-in (Tx)";
}
function setConnectButtonConnected(isConnected) {
  const btn = $("connectBtn");
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

async function rpc(method, params = []) {
  const res = await fetch(CONFIG.BASE_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })
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
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error("Timeout waiting for confirmation.");
}

function utf8ToHex(str) {
  const enc = new TextEncoder().encode(str);
  return "0x" + Array.from(enc).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function connectWallet() {
  setStatus("Connecting...", "warn");
  setConnectButtonConnected(false);

  ethProvider = await getWalletProvider();
  if (!ethProvider?.request) {
    setStatus("No wallet provider found", "err");
    showToast("No wallet provider", "Open in Warpcast Mini App or install MetaMask");
    return;
  }

  let accounts = [];
  try {
    accounts = await ethProvider.request({ method: "eth_requestAccounts", params: [] });
  } catch (e) {
    setStatus("Wallet connection rejected", "err");
    showToast("Rejected", e?.message || "Wallet connection rejected");
    return;
  }

  address = accounts?.[0] || "";
  if (!address) {
    setStatus("No account returned", "err");
    showToast("Error", "No account returned from wallet");
    return;
  }

  $("addr").textContent = shortAddr(address);

  // Read chainId (don't force switch)
  try {
    const chainIdHex = await ethProvider.request({ method: "eth_chainId", params: [] });
    const chainIdDec = parseInt(chainIdHex, 16);
    $("net").textContent = `chainId ${chainIdDec}` + (chainIdDec === CONFIG.BASE_CHAIN_ID_DEC ? " (Base ✅)" : "");
    if (chainIdDec !== CONFIG.BASE_CHAIN_ID_DEC) {
      setStatus("Connected (not Base) ⚠️", "warn");
    } else {
      setStatus("Connected ✅", "ok");
    }
  } catch {
    $("net").textContent = "-";
    setStatus("Connected ✅", "ok");
  }

  setConnectButtonConnected(true);
  updateButtons();

  // dismiss splash (if available)
  try { window.__FC_SDK__?.actions?.ready && await window.__FC_SDK__.actions.ready(); } catch {}
}

export async function dailyCheckin() {
  if (!ethProvider?.request || !address) return;

  if (hasCheckedInToday()) {
    setStatus("Already checked in today ✅", "ok");
    updateButtons();
    return;
  }

  const ok = confirm("This will send a 0 ETH transaction and still costs gas. Continue?");
  if (!ok) return;

  // Ensure Base
  try {
    const chainIdHex = await ethProvider.request({ method: "eth_chainId", params: [] });
    const chainIdDec = parseInt(chainIdHex, 16);
    if (chainIdDec !== CONFIG.BASE_CHAIN_ID_DEC) {
      showToast("Wrong network", "Please switch to Base and try again");
      setStatus("Wrong network (need Base)", "err");
      return;
    }
  } catch {}

  const data = utf8ToHex("DAILY_CHECKIN:" + todayKeyUTC());

  let txHash = "";
  try {
    setStatus("Sending transaction...", "warn");
    txHash = await ethProvider.request({
      method: "eth_sendTransaction",
      params: [{
        from: address,
        to: address,
        value: "0x0",
        data
      }]
    });
  } catch (e) {
    setStatus("Transaction rejected/failed ❌", "err");
    showToast("Tx failed", e?.message || "Transaction rejected");
    return;
  }

  // Confirm via Base RPC
  try {
    setStatus("Waiting confirmation...", "warn");
    await waitForReceipt(txHash);

    localStorage.setItem(CONFIG.LS_KEY, todayKeyUTC());
    updateButtons();

    setStatus("Daily check-in successful ✅", "ok");
    showToast("Check-in successful ✅", "Confirmed on Base", 1800);
    openModal({
      title: "Check-in successful ✅",
      sub: "Confirmed on Base",
      txHash,
      explorerUrl: CONFIG.EXPLORER_TX(txHash)
    });
  } catch {
    setStatus("Sent, but not confirmed yet ⚠️", "warn");
    showToast("Tx sent ⚠️", "Confirmation pending", 2200);
    openModal({
      title: "Tx sent ⚠️",
      sub: "Confirmation pending (check explorer)",
      txHash,
      explorerUrl: CONFIG.EXPLORER_TX(txHash)
    });
  }
}

export async function getQuickAuthToken() {
  const sdk = window.__FC_SDK__;
  try {
    const token = await sdk.quickAuth.getToken();
    console.log("QuickAuth token:", token);
    showToast("QuickAuth ✅", "Token printed to console");
  } catch (e) {
    showToast("QuickAuth failed", e?.message || String(e));
  }
}

export function initWalletUI() {
  // initial state
  setConnectButtonConnected(false);
  updateButtons();

  // wire buttons
  $("connectBtn").onclick = connectWallet;
  $("checkinBtn").onclick = dailyCheckin;
  $("authBtn").onclick = getQuickAuthToken;
}
