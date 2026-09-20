(() => {
  "use strict";
  if (!/^https?:$/.test(location.protocol)) return;
  const key = "rankoff-acquisition";
  const ttl = 30 * 60 * 1000;
  // Store a channel label, never the referring URL, search query or chat path.
  // A missing referrer stays direct/unknown; Google AI cannot be separated
  // from ordinary Google Search using a browser referrer.
  function referralSource(referrer) {
    try {
      const url = new URL(referrer);
      if (!/^https?:$/.test(url.protocol)) return { source: "direct", medium: "none" };
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      if (host === location.hostname.replace(/^www\./, "")) return { source: "direct", medium: "none" };
      const matches = (domain) => host === domain || host.endsWith(`.${domain}`);
      for (const [domain, source] of [["chatgpt.com", "chatgpt"], ["chat.openai.com", "chatgpt"], ["perplexity.ai", "perplexity"], ["gemini.google.com", "gemini"], ["copilot.microsoft.com", "copilot"], ["claude.ai", "claude"]]) {
        if (matches(domain)) return { source, medium: "ai_referral" };
      }
      for (const [domains, source] of [
        [["google.com", "google.com.my", "google.com.sg", "google.co.uk", "google.com.au", "google.co.in"], "google"],
        [["bing.com", "cn.bing.com"], "bing"], [["duckduckgo.com"], "duckduckgo"], [["search.yahoo.com"], "yahoo"],
      ]) {
        // Google Docs, Gmail and Drive are referrals, not search visits.
        if (domains.includes(host)) return { source, medium: "organic" };
      }
      return { source: "referral", medium: "referral" };
    } catch { return { source: "direct", medium: "none" }; }
  }
  let session;
  try { session = JSON.parse(sessionStorage.getItem(key)); } catch { /* Storage is optional. */ }
  if (!session || !session.session_id || !Number.isFinite(session.started_at) || Date.now() - session.started_at >= ttl) {
    const params = new URL(location.href).searchParams;
    const label = (name, fallback) => {
      const value = (params.get(`utm_${name}`) || "").toLowerCase();
      return /^[a-z0-9][a-z0-9_.-]{0,63}$/.test(value) ? value : fallback;
    };
    const referral = referralSource(document.referrer);
    const explicitSource = label("source", "");
    const aiTaggedSource = ["chatgpt", "chatgpt.com", "perplexity", "perplexity.ai", "gemini", "gemini.google.com", "copilot", "copilot.microsoft.com", "claude", "claude.ai"].includes(explicitSource);
    session = { session_id: crypto.randomUUID(), started_at: Date.now(),
      source: explicitSource || referral.source, medium: label("medium", explicitSource ? (aiTaggedSource ? "ai_referral" : "none") : referral.medium),
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
