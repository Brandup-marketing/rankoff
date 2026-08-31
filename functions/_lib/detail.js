import { ApiError, defaultBoardSlug, isProduction, requireDatabase } from "./config.js";
import { buildProductView, renderProductPage } from "./product.js";
import { loadBoard, loadListingRecord, loadPublicBoard } from "./repository.js";

const PAGE_LIMIT = 100;
const MAX_PAGES = 10;

async function findRanking(db, board, period, identity) {
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const payload = await loadPublicBoard(db, board, { category: "all", period, limit: PAGE_LIMIT, page });
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

function notFound(html) {
  const noindexed = html.replace(/<meta name="robots" content="[^"]*"\s*\/>/, '<meta name="robots" content="noindex, follow" />');
  return new Response(noindexed, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=60, must-revalidate" },
  });
}

// One renderer for both addresses a listing can live at: /product/<hostname> for
// a website, /profile/<platform>/<handle> for a social account.
export async function renderDetail(context, identity) {
  const template = await shell(context);
  if (!identity || !isProduction(context.env)) return notFound(template);

  const db = requireDatabase(context.env);
  const board = await loadBoard(db, defaultBoardSlug(context.env));
  const { match, payload } = await findRanking(db, board, "all", identity);
  if (!match) return notFound(template);

  const [today, record] = await Promise.all([
    findRanking(db, board, "today", identity),
    loadListingRecord(db, String(match.listing?.id || "")),
  ]);
  const view = buildProductView({
    entry: match,
    todayEntry: today.match,
    board: payload.board,
    snapshotId: payload.snapshot_id,
    record,
  });

  return new Response(renderProductPage(template, view), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60, must-revalidate",
      Link: `<${view.canonical}>; rel="canonical"`,
    },
  });
}
