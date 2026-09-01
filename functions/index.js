import { defaultBoardSlug, isProduction, marketLabel, requireDatabase } from "./_lib/config.js";
import { escapeHtml, formatMoney } from "./_lib/product.js";
import { displayName, profilePath } from "./_lib/platform.js";
import { loadBoard, loadPublicBoard } from "./_lib/repository.js";

const LIMIT = 50;

// The board is drawn by the page's own JavaScript, which a search engine or an
// AI crawler may never run: rankoff.my read as a leaderboard with nothing on it.
// The same rows are written into the HTML here, and the client replaces them.
export function renderBoard(rankings, currency) {
  if (!rankings.length) return "";
  const rows = rankings.map((entry) => {
    const listing = entry.listing || {};
    const identity = String(listing.hostname || "");
    return `<li>`
      + `<span class="board-seo-rank">#${escapeHtml(entry.rank)}</span> `
      + `<a href="${escapeHtml(profilePath(identity))}">${escapeHtml(listing.title || displayName(identity))}</a> `
      + `<span class="board-seo-note">Sponsored · ${escapeHtml(marketLabel(listing.category))} · `
      + `${escapeHtml(formatMoney(entry.bid?.amount_minor, currency))} settled · `
      + `${escapeHtml(Number(entry.clicks || 0))} verified clicks</span>`
      + `</li>`;
  }).join("");
  return `<ol class="board-seo-list">${rows}</ol>`;
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  // The home page must never depend on this function succeeding.
  if (!context.env.ASSETS?.fetch) return context.next();
  let html;
  try {
    const shell = await context.env.ASSETS.fetch(new Request(new URL("/index.html", url.origin)));
    if (!shell.ok) return context.next();
    html = await shell.text();
  } catch {
    return context.next();
  }

  if (isProduction(context.env)) {
    try {
      const db = requireDatabase(context.env);
      const board = await loadBoard(db, defaultBoardSlug(context.env));
      const payload = await loadPublicBoard(db, board, { category: "all", period: "all", limit: LIMIT, page: 1 });
      const currency = String(payload.board?.currency || "MYR").toUpperCase();
      const markup = renderBoard(payload.rankings, currency);
      if (markup) {
        html = html.replace(
          /(<div class="board-list" data-board-list[^>]*>)(<\/div>)/,
          (match, open, close) => `${open}${markup}${close}`,
        );
      }

      // The headline price too: before the API answered the page briefly offered
      // #1 at the board floor, which is not what taking #1 costs.
      const price = formatMoney(payload.next_bid_minor, currency).replace(" ", "\u00a0");
      html = html.replace(
        /(<strong data-hero-next-price[^>]*>)[\s\S]*?(<\/strong>)/,
        (match, open, close) => `${open}${escapeHtml(price)}${close}`,
      );
    } catch {
      /* The page still works: its own script draws the board a moment later. */
    }
  }

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=60, must-revalidate" },
  });
}
