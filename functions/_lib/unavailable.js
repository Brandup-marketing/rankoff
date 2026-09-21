// A failed live read must never turn the static price placeholder into an offer.
export function pricingUnavailable(request) {
  const language = new URL(request.url).searchParams.get("lang");
  const copy = language === "zh"
    ? { lang: "zh-Hans", title: "榜单暂时无法载入", text: "暂时无法确认实时榜单与付款金额。请稍后重新载入；当前无法开始付款。", retry: "重新载入" }
    : language === "ms"
      ? { lang: "ms", title: "Papan tidak tersedia buat sementara waktu", text: "Papan langsung dan jumlah bayaran belum dapat disahkan. Sila muat semula sebentar lagi; pembayaran tidak boleh dimulakan sekarang.", retry: "Muat semula" }
      : { lang: "en", title: "The board is temporarily unavailable", text: "We could not confirm the live board and payment amounts. Please reload shortly; checkout cannot start right now.", retry: "Reload" };
  const html = `<!doctype html><html lang="${copy.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>RANKOFF | ${copy.title}</title><link rel="stylesheet" href="/styles.css"></head><body><main class="pricing-unavailable"><a href="/" aria-label="RANKOFF">RANKOFF</a><h1>${copy.title}</h1><p>${copy.text}</p><a href="">${copy.retry}</a></main></body></html>`;
  return new Response(html, { status: 503, headers: {
    "Content-Type": "text/html; charset=utf-8", "Content-Language": copy.lang,
    "Cache-Control": "no-store", "Retry-After": "60", "X-Robots-Tag": "noindex",
  } });
}
