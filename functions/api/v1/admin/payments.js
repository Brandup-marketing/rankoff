import { ApiError, defaultBoardSlug, isProduction, requireDatabase } from "../../../_lib/config.js";
import { json, methodNotAllowed } from "../../../_lib/http.js";
import { loadBoard, loadSettledPayments } from "../../../_lib/repository.js";
import { requireAdmin } from "../../../_lib/security.js";
import { normalizeLimit, normalizePage } from "../../../_lib/validation.js";

// Read-only. Every row here carries a real customer's email and phone, so it
// answers only in production and only to a valid ADMIN_API_TOKEN, it is never
// cached (json() sets no-store), and nothing on this path is logged.
export async function onRequestGet(context) {
  if (!isProduction(context.env)) {
    throw new ApiError(503, "production_only", "The owner view is disabled on the preview board.");
  }
  await requireAdmin(context.request, context.env);
  const url = new URL(context.request.url);
  const limit = normalizeLimit(url.searchParams.get("limit"), 50, 100);
  const page = normalizePage(url.searchParams.get("page"));
  const db = requireDatabase(context.env);
  const board = await loadBoard(db, defaultBoardSlug(context.env));
  return json(await loadSettledPayments(db, board, { limit, page }));
}

export function onRequest() {
  return methodNotAllowed(["GET"]);
}
