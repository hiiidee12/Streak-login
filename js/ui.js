export const $ = (id) => document.getElementById(id);

export function setStatus(text, cls = "") {
  const el = $("status");
  el.textContent = text;
  el.className = "badge " + cls;
}

export function showToast(title, sub = "", ms = 2500) {
  const el = $("toast");
  el.innerHTML = `<div class="t-title">${title}</div><div class="t-sub">${sub}</div>`;
  el.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove("show"), ms);
}

export function openModal({ title, sub, txHash, explorerUrl }) {
  const backdrop = $("modalBackdrop");
  backdrop.classList.add("show");
  backdrop.setAttribute("aria-hidden", "false");

  $("modalTitle").textContent = title || "Success";
  $("modalSub").textContent = sub || "";
  $("modalTxHash").textContent = txHash || "";

  const close = () => {
    backdrop.classList.remove("show");
    backdrop.setAttribute("aria-hidden", "true");
  };

  $("modalClose").onclick = close;
  backdrop.onclick = (e) => { if (e.target === backdrop) close(); };

  $("copyTxBtn").onclick = async () => {
    try {
      await navigator.clipboard.writeText(txHash);
      showToast("Copied ✅", "Tx hash copied");
    } catch {
      showToast("Copy failed", "Clipboard blocked by browser");
    }
  };

  $("openExplorerBtn").onclick = () => {
    if (!explorerUrl) return;
    window.open(explorerUrl, "_blank");
  };
}
