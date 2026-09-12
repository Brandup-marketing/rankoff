import { ApiError, defaultBoardSlug, isProduction, marketLabel, requireDatabase } from "./config.js";
import { buildProductView, localizeProductShell, normalizeProductLanguage, renderProductPage } from "./product.js";
import { loadBoard, loadListingRecord, loadPublicBoard } from "./repository.js";
import { businessFactsFor } from "./business-facts.js";

const PAGE_LIMIT = 100;
const MAX_PAGES = 10;

async function findRanking(db, board, period, identity, category = "all") {
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const payload = await loadPublicBoard(db, board, { category, period, limit: PAGE_LIMIT, page });
    const match = payload.rankings.find((entry) => String(entry.listing?.hostname || "") === identity);
    if (match) return { match, payload };
    if (!payload.pagination?.has_next) return { match: null, payload };
  }
  return { match: null, payload: null };
}

async function shell(context) {
  if (!context.env.ASSETS || typeof context.env.ASSETS.fetch !== "function") {
    throw new ApiError(503, "assets_unavailable", "The page shell is not available.");
  }
  const response = await context.env.ASSETS.fetch(new Request(new URL("/listing", context.request.url)));
  return response.text();
}

function notFound(html, language = "en") {
  const locale = normalizeProductLanguage(language);
  let noindexed = localizeProductShell(String(html).replace(/(href|src)="\.\//g, '$1="/'), locale).replace(/<meta name="robots" content="[^"]*"\s*\/>/, '<meta name="robots" content="noindex, follow" />');
  if (locale === "zh") {
    noindexed = noindexed.replace(/<title>[\s\S]*?<\/title>/, "<title>找不到此条目 | RANKOFF</title>");
    noindexed = noindexed.replace(/<meta name="description" content="[^"]*"\s*\/>/, '<meta name="description" content="此条目可能已移动，或已不在 Rankoff 公开榜单中。" />');
  }
  noindexed = noindexed.replace(/(<div class="listing-loading" data-loading)>/, "$1 hidden>");
  noindexed = noindexed.replace(/(<div class="listing-error" data-error) hidden>/, "$1>");
  noindexed = noindexed.replace(/(<section id="listing-detail"[^>]*)aria-busy="true"/, '$1aria-busy="false"');
  return new Response(noindexed, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "Content-Language": locale === "zh" ? "zh-Hans" : "en", "Cache-Control": "public, max-age=60, must-revalidate" },
  });
}

// One renderer for both addresses a listing can live at: /product/<hostname> for
// a website, /profile/<platform>/<handle> for a social account.
export async function renderDetail(context, identity) {
  const template = await shell(context);
  // Language is explicit so each indexable representation has a stable URL and
  // cache key. Unknown values keep the default English representation.
  const language = normalizeProductLanguage(new URL(context.request.url).searchParams.get("lang"));
  if (!identity || !isProduction(context.env)) return notFound(template, language);

  const db = requireDatabase(context.env);
  const board = await loadBoard(db, defaultBoardSlug(context.env));
  const { match, payload } = await findRanking(db, board, "all", identity);
  if (!match) return notFound(template, language);

  // A listing bought first place in its market; the board's own ordering is the
  // smaller story and the one a merchant would never share.
  const [today, record, inMarket] = await Promise.all([
    findRanking(db, board, "today", identity),
    loadListingRecord(db, String(match.listing?.id || "")),
    findRanking(db, board, "all", identity, String(match.listing?.category || "all")),
  ]);
  const view = buildProductView({
    entry: match,
    todayEntry: today.match,
    board: payload.board,
    snapshotId: payload.snapshot_id,
    record,
    marketRank: inMarket.match ? Number(inMarket.match.rank) : null,
    marketName: marketLabel(match.listing?.category),
    language,
    nextBidMinor: payload.next_bid_minor,
    businessFacts: businessFactsFor(identity),
  });

  return new Response(renderProductPage(template, view), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Language": language === "zh" ? "zh-Hans" : "en",
      "Cache-Control": "public, max-age=60, must-revalidate",
      Link: `<${view.canonical}>; rel="canonical"`,
    },
  });
}
