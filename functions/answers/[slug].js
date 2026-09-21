import { defaultBoardSlug, isProduction, requireDatabase } from "../_lib/config.js";
import { escapeHtml, formatMoney } from "../_lib/product.js";
import { loadBoard, loadPublicBoard, loadPublicStats } from "../_lib/repository.js";

const SLUGS = new Set(["pay-to-rank-leaderboard", "how-rankoff-ranking-works", "sponsor-a-public-link", "business-exposure-malaysia"]);

// These pages exist to be believed, so their figures are read from the board at
// request time. A number typed into the copy would be wrong by morning.
// Clicks are tracked redirects, not verified visitors, and the page must say
// "paid", not "settled" — llms.txt tells answer engines the same thing. When
// earlier ringgit payments are counted in US dollars, the sentence says so.
export function liveSummary(listings, paid, clicks, currency, converted = false) {
  const total = formatMoney(paid, currency);
  const en = `${listings} live ${listings === 1 ? "listing" : "listings"}, ${total} in total paid${converted ? " (earlier ringgit payments converted at a fixed rate)" : ""} and ${clicks} tracked ${clicks === 1 ? "click" : "clicks"}`;
  const zh = `${listings} 个正式条目、累计已付 ${total}${converted ? "（早期马币付款按固定汇率换算）" : ""}、${clicks} 次追踪点击`;
  return { en, zh };
}

// "What is the starting amount?" is the question an answer engine lifts word
// for word, so the answer names the live minimum instead of only pointing at
// the board. Applied to the visible answer and its FAQPage JSON-LD alike.
export function withLiveMinimum(html, minimum) {
  if (!minimum) return String(html);
  return String(html)
    .replaceAll(
      "The live board shows the current minimum and currency. The applicable published price is shown before payment.",
      `Entry is currently ${minimum}. The live board shows the current minimum and currency. The applicable published price is shown before payment.`,
    )
    .replaceAll(
      "实时榜单会显示当前最低金额和币种，付款前会显示适用的公开价格。",
      `目前起步金额为 ${minimum}。实时榜单会显示当前最低金额和币种，付款前会显示适用的公开价格。`,
    );
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const slug = String(context.params.slug || "").toLowerCase().replace(/\.html$/, "");
  if (!SLUGS.has(slug) || !context.env.ASSETS?.fetch) return context.next();

  const asset = await context.env.ASSETS.fetch(new Request(new URL(`/answers/${slug}.html`, url.origin)));
  if (!asset.ok) return context.next();
  let html = await asset.text();

  if (isProduction(context.env)) {
    try {
      const db = requireDatabase(context.env);
      const board = await loadBoard(db, defaultBoardSlug(context.env));
      const [payload, stats] = await Promise.all([
        loadPublicBoard(db, board, { category: "all", period: "all", limit: 1, page: 1 }),
        loadPublicStats(db, board),
      ]);
      const currency = String(payload.board?.currency || "USD").toUpperCase();
      const summary = liveSummary(
        Number(payload.pagination?.total || 0),
        Number(stats.settled_revenue_minor || 0),
        Number(stats.total_clicks || 0),
        currency,
        Array.isArray(stats.currency_conversion) && stats.currency_conversion.length > 0,
      );
      html = withLiveMinimum(html, formatMoney(payload.board?.min_increment_minor, currency));
      html = html
        .replace(/<span data-live-summary>[\s\S]*?<\/span>/g, `<span data-live-summary>${escapeHtml(summary.en)}</span>`)
        .replace(/<span data-live-summary-zh>[\s\S]*?<\/span>/g, `<span data-live-summary-zh>${escapeHtml(summary.zh)}</span>`);
    } catch {
      /* The sentence still reads correctly: it points at the board. */
    }
  }

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300, must-revalidate" },
  });
}
