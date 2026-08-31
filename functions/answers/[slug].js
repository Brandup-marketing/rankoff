import { defaultBoardSlug, isProduction, requireDatabase } from "../_lib/config.js";
import { escapeHtml, formatMoney } from "../_lib/product.js";
import { loadBoard, loadPublicBoard, loadPublicStats } from "../_lib/repository.js";

const SLUGS = new Set(["pay-to-rank-leaderboard", "how-rankoff-ranking-works", "sponsor-a-public-link"]);

// These pages exist to be believed, so their figures are read from the board at
// request time. A number typed into the copy would be wrong by morning.
export function liveSummary(listings, settled, clicks, currency) {
  const total = formatMoney(settled, currency);
  const en = `${listings} live ${listings === 1 ? "listing" : "listings"}, ${total} settled and ${clicks} verified ${clicks === 1 ? "click" : "clicks"}`;
  const zh = `${listings} 个正式条目、${total} 已结算、${clicks} 次验证点击`;
  return { en, zh };
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
      const summary = liveSummary(
        Number(payload.pagination?.total || 0),
        Number(stats.settled_revenue_minor || 0),
        Number(stats.total_clicks || 0),
        String(payload.board?.currency || "MYR").toUpperCase(),
      );
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
