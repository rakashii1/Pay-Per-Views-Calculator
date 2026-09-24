(function () {
  const endpoint = window.location.protocol === "file:"
    ? "http://127.0.0.1:4173/api/presence"
    : "/api/presence";
  const storageKey = "rakashii-presence-client-id";
  const heartbeatInterval = 20_000;

  function getClientId() {
    try {
      let clientId = localStorage.getItem(storageKey);
      if (!clientId) {
        clientId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem(storageKey, clientId);
      }
      return clientId;
    } catch {
      return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  }

  const badge = document.createElement("div");
  badge.className = "presence-badge";
  badge.setAttribute("role", "status");
  badge.setAttribute("aria-live", "polite");
  badge.innerHTML = `
    <span class="presence-dot" aria-hidden="true"></span>
    <span><strong class="presence-count">--</strong> online now</span>
  `;
  document.body.append(badge);

  const countOutput = badge.querySelector(".presence-count");
  const clientId = getClientId();

  async function sendHeartbeat() {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Presence request failed");
      const data = await response.json();
      countOutput.textContent = Number.isFinite(data.count) ? String(data.count) : "--";
      badge.dataset.status = "online";
    } catch {
      countOutput.textContent = "--";
      badge.dataset.status = "offline";
    }
  }

  sendHeartbeat();
  window.setInterval(sendHeartbeat, heartbeatInterval);
})();
