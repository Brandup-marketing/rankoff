(() => {
  "use strict";

  if (!/^https?:$/.test(window.location.protocol)) return;
  const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
  const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  Promise.all([
    fetch("./api/v1/board?board=global&period=all&limit=100", { headers: { Accept: "application/json" }, cache: "no-store" }),
    fetch("./api/v1/stats?board=global", { headers: { Accept: "application/json" }, cache: "no-store" }),
  ]).then(async ([boardResponse, statsResponse]) => {
    if (!boardResponse.ok || !statsResponse.ok) return;
    const [board, stats] = await Promise.all([boardResponse.json(), statsResponse.json()]);
    const listingCount = document.querySelector("[data-about-listings]");
    const clickCount = document.querySelector("[data-about-clicks]");
    const topBid = document.querySelector("[data-about-bid]");
    const disclosure = document.querySelector(".about-disclosure");
    if (listingCount) listingCount.textContent = compact.format(board.rankings?.length || 0);
    if (clickCount) clickCount.textContent = compact.format(Number(stats.total_clicks || 0));
    if (topBid) topBid.textContent = currency.format(Number(board.rankings?.[0]?.bid?.amount_minor || 0) / 100);
    if (disclosure) disclosure.textContent = board.mode === "production" ? "Live board values." : "Connected preview values.";
  }).catch(() => {});
})();
