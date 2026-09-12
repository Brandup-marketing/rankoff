import { currencyNotice } from "../currency.js";
import { defaultBoardSlug, isProduction, marketLabel, requireDatabase } from "./_lib/config.js";
import { escapeHtml, formatMoney } from "./_lib/product.js";
import { displayName, profilePath } from "./_lib/platform.js";
import { loadBoard, loadPublicBoard } from "./_lib/repository.js";
import { applyLiveCurrency, localizeStaticPage } from "./_lib/static-localization.js";

const LIMIT = 50;

// The board is drawn by the page's own JavaScript, which a search engine or an
// AI crawler may never run: rankoff.my read as a leaderboard with nothing on it.
// The same rows are written into the HTML here, and the client replaces them.
export function renderBoard(rankings, currency, language = "en") {
  if (!rankings.length) return "";
  const rows = rankings.map((entry) => {
    const listing = entry.listing || {};
    const identity = String(listing.hostname || "");
    const englishBoardNote = `Sponsored · ${marketLabel(listing.category)} · ${formatMoney(entry.bid?.amount_minor, currency)} paid · ${Number(entry.clicks || 0)} tracked clicks`;
    return `<li>`
      + `<span class="board-seo-rank">#${escapeHtml(entry.rank)}</span> `
      + `<a href="${escapeHtml(`${profilePath(identity)}${language === "zh" ? "?lang=zh" : ""}`)}">${escapeHtml(listing.title || displayName(identity))}</a> `
      + `<span class="board-seo-note" data-english-copy="${escapeHtml(englishBoardNote)}">${escapeHtml(englishBoardNote)}</span>`
      + `</li>`;
  }).join("");
  return `<ol class="board-seo-list">${rows}</ol>`;
}

// A leaderboard whose ranking exists only as styled <div>s is not legible as a
// ranking to a search engine or an AI answering "who is #1 on Rankoff". The
// same rows the function above writes are also declared as an ItemList. Every
// value comes from the board payload — position, public name, evidence page —
// so the structured data cannot drift from what the page shows.
export function renderRankingSchema(rankings, origin, language = "en") {
  if (!rankings.length) return "";
  const items = rankings.slice(0, 10).map((entry) => {
    const listing = entry.listing || {};
    const identity = String(listing.hostname || "");
    const suffix = language === "zh" ? "?lang=zh" : "";
    return {
      "@type": "ListItem",
      position: Number(entry.rank),
      name: listing.title || displayName(identity),
      url: `${origin}${profilePath(identity)}${suffix}`,
    };
  });
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: language === "zh" ? "实时赞助榜单" : "Sponsored leaderboard",
    description: language === "zh"
      ? "按累计已付金额排序的公开赞助榜单。"
      : "Public sponsored leaderboard, ordered by the total each listing has paid.",
    url: `${origin}/${language === "zh" ? "?lang=zh" : ""}`,
    numberOfItems: items.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: items,
  };
  // </script> inside JSON would close the tag early.
  return `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>`;
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const language = url.searchParams.get("lang") === "zh" ? "zh" : "en";
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

  // Learned inside the production block, applied after localisation below.
  let liveFloor = "";
  let liveCurrency = "";
  if (isProduction(context.env)) {
    try {
      const db = requireDatabase(context.env);
      const board = await loadBoard(db, defaultBoardSlug(context.env));
      const payload = await loadPublicBoard(db, board, { category: "all", period: "all", limit: LIMIT, page: 1 });
      const currency = String(payload.board?.currency || "USD").toUpperCase();
      const markup = renderBoard(payload.rankings, currency, language);
      const notice = currencyNotice(payload.board?.currency_conversion, language);
      if (notice) html = html.replace('<p class="currency-note" data-currency-note hidden></p>', `<p class="currency-note" data-currency-note>${escapeHtml(notice)}</p>`);
      if (markup) {
        html = html.replace(
          /(<div class="board-list" data-board-list[^>]*>)(<\/div>)/,
          (match, open, close) => `${open}${markup}${close}`,
        );
      }

      const rankingSchema = renderRankingSchema(payload.rankings, url.origin, language);
      if (rankingSchema) html = html.replace("</head>", `${rankingSchema}</head>`);

      // The headline price too: before the API answered the page briefly offered
      // #1 at the board floor, which is not what taking #1 costs.
      const price = formatMoney(payload.next_bid_minor, currency).replace(" ", "\u00a0");
      html = html.replace(
        /(<strong data-hero-next-price[^>]*>)[\s\S]*?(<\/strong>)/,
        (match, open, close) => `${open}${escapeHtml(price)}${close}`,
      );
      // The static shell is also consumed by link unfurlers and assistive
      // technology before the browser bundle hydrates. Its provisional USD
      // wording is swapped for the board's currency — but only after
      // localisation, or the Chinese metadata is injected too late to be seen.
      liveFloor = formatMoney(payload.board?.min_increment_minor, currency).replace(" ", "\u00a0");
      liveCurrency = currency;
    } catch {
      /* The page still works: its own script draws the board a moment later. */
    }
  }

  html = localizeStaticPage(html, "home", language);
  html = applyLiveCurrency(html, liveFloor, liveCurrency);
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Content-Language": language === "zh" ? "zh-Hans" : "en", "Cache-Control": "public, max-age=60, must-revalidate" },
  });
}
