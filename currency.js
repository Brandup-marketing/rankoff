// Shared by server rendering and the browser. No floating exchange rates.
export function currencyNotice(rates, language = "en") {
  if (!Array.isArray(rates) || !rates.length) return "";
  return rates.map((rate) => {
    const ratio = `${rate.denominator} ${rate.source_currency} = ${rate.numerator} ${rate.target_currency}`;
    return language === "zh"
      ? `早期 ${rate.source_currency} 付款按固定比率 ${ratio}（${rate.rate_date}）计入 ${rate.target_currency} 等值排名。原始付款记录与收据保持原币种。`
      : `Earlier ${rate.source_currency} payments count toward ${rate.target_currency} equivalent totals at the fixed rate ${ratio} (${rate.rate_date}). Original payment records and receipts keep their original currency.`;
  }).join(" ");
}

if (typeof document !== "undefined") {
  const nodes = [...document.querySelectorAll("[data-currency-note]")];
  if (nodes.length) {
    let rates = null;
    const render = () => {
      if (!rates) return;
      const copy = currencyNotice(rates, document.documentElement.lang.startsWith("zh") ? "zh" : "en");
      for (const node of nodes) {
        node.textContent = copy;
        node.hidden = !copy;
      }
    };
    new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    fetch("/api/v1/board?board=global&category=all&period=all&limit=1", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (payload?.mode !== "production") return;
        rates = payload.board?.currency_conversion || [];
        render();
      }).catch(() => {}); // Keep the server-rendered notice during an outage.
  }
}
