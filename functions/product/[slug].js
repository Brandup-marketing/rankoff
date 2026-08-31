import { ApiError, defaultBoardSlug, isProduction, requireDatabase } from "../_lib/config.js";
import { methodNotAllowed } from "../_lib/http.js";
import { buildProductView, normalizeSlug, renderProductPage } from "../_lib/product.js";
import { loadBoard, loadPublicBoard } from "../_lib/repository.js";

const PAGE_LIMIT = 100;
const MAX_PAGES = 10;

async function findRanking(db, board, period, hostname) {
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const payload = await loadPublicBoard(db, board, { category: "all", period, limit: PAGE_LIMIT, page });
    const match = payload.rankings.find((entry) => normalizeSlug(entry.listing?.hostname) === hostname);
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

export async function onRequestGet(context) {
  const hostname = normalizeSlug(context.params.slug);
  const template = await shell(context);
  if (!hostname || !isProduction(context.env)) return notFound(template);

  const db = requireDatabase(context.env);
  const board = await loadBoard(db, defaultBoardSlug(context.env));
  const { match, payload } = await findRanking(db, board, "all", hostname);
  if (!match) return notFound(template);

  const today = await findRanking(db, board, "today", hostname);
  const view = buildProductView({
    entry: match,
    todayEntry: today.match,
    board: payload.board,
    snapshotId: payload.snapshot_id,
  });

  return new Response(renderProductPage(template, view), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60, must-revalidate",
      Link: `<${view.canonical}>; rel="canonical"`,
    },
  });
}

export function onRequest() {
  return methodNotAllowed(["GET"]);
}
