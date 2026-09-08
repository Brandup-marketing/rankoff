(() => {
  "use strict";
  if (!/^https?:$/.test(location.protocol)) return;
  const key = "rankoff-acquisition";
  const ttl = 30 * 60 * 1000;
  let session;
  try { session = JSON.parse(sessionStorage.getItem(key)); } catch { /* Storage is optional. */ }
  if (!session || !session.session_id || Date.now() - session.started_at >= ttl) {
    const params = new URL(location.href).searchParams;
    const label = (name, fallback) => {
      const value = (params.get(`utm_${name}`) || "").toLowerCase();
      return /^[a-z0-9][a-z0-9_.-]{0,63}$/.test(value) ? value : fallback;
    };
    session = { session_id: crypto.randomUUID(), started_at: Date.now(),
      source: label("source", "direct"), medium: label("medium", "none"),
      campaign: label("campaign", "none"), content: label("content", "none") };
    try { sessionStorage.setItem(key, JSON.stringify(session)); } catch { /* Keep this page working. */ }
  }
  const context = () => ({ ...session });
  const track = (type) => {
    if (!["visit", "review_opened"].includes(type)) return;
    void fetch("/api/v1/acquisition", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...context(), type }), keepalive: true }).catch(() => {});
  };
  window.RankoffAcquisition = Object.freeze({ context, track });
  track("visit");
})();
