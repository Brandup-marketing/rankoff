import { applyLiveCurrency, serveLocalizedAsset } from "./_lib/static-localization.js";
import { defaultBoardSlug, isProduction, requireDatabase } from "./_lib/config.js";
import { loadBoard, loadPublicBoard, loadPublicStats } from "./_lib/repository.js";
import { escapeHtml, formatMoney } from "./_lib/product.js";
import { pricingUnavailable } from "./_lib/unavailable.js";

export async function onRequestGet(context) {
  const response = await serveLocalizedAsset(context, "/about.html", "about");
  if (!isProduction(context.env) || !response.ok) return response;
  try {
    const board = await loadBoard(requireDatabase(context.env), defaultBoardSlug(context.env));
    const floor = escapeHtml(formatMoney(board.min_increment_minor, board.currency).replace(" ", "\u00a0"));
    // One shared pass, run after localisation, so the Chinese copy is covered too.
    let html = applyLiveCurrency(await response.text(), floor, board.currency, Number(board.min_increment_minor));
    html = await withBoardNumbers(html, requireDatabase(context.env), board);
    return new Response(html, { status: response.status, headers: response.headers });
  } catch {
    return pricingUnavailable(context.request);
  }
}

// "The board, right now" was filled only by the page script, so crawlers and
// answer engines read three dashes. The same three numbers, formatted exactly
// as about.js formats them, are written into the first paint. Any failure
// leaves the dashes, which the script replaces or explains.
export async function withBoardNumbers(html, db, board) {
  try {
    const [payload, stats] = await Promise.all([
      loadPublicBoard(db, board, { category: "all", period: "all", limit: 1, page: 1 }),
      loadPublicStats(db, board),
    ]);
    const code = String(payload.board?.currency || board.currency || "USD").toUpperCase();
    const money = new Intl.NumberFormat(code === "MYR" ? "en-MY" : "en-US", { style: "currency", currency: code, minimumFractionDigits: 0, maximumFractionDigits: 2 });
    const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
    const values = {
      listings: compact.format(Number(payload.pagination?.total || 0)),
      clicks: compact.format(Number(stats.total_clicks || 0)),
      bid: money.format(Number(payload.rankings?.[0]?.bid?.amount_minor || 0) / 100).replace(/^\$/, "US$"),
    };
    let output = String(html);
    for (const [key, value] of Object.entries(values)) {
      output = output.replace(new RegExp(`(<strong data-about-${key} data-no-translate>)[^<]*(</strong>)`), (match, open, close) => `${open}${escapeHtml(value)}${close}`);
    }
    return output;
  } catch {
    return String(html);
  }
}
