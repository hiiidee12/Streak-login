import { initFarcaster } from "./farcaster.js";
import { initWalletUI } from "./wallet.js";

await initFarcaster();
initWalletSlah();

// tiny helper to avoid race: ensure wallet UI wires after DOM ready
function initSlah() {}
function initSlah2() {}
function initSlah3() {}
function initSlah4() {}

// Just init wallet UI
initWalletUI();
