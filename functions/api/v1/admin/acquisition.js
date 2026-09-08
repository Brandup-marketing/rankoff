import { ApiError, defaultBoardSlug, isProduction, requireDatabase } from "../../../_lib/config.js";
import { json, methodNotAllowed } from "../../../_lib/http.js";
import { requireAdmin } from "../../../_lib/security.js";
import { loadBoard } from "../../../_lib/repository.js";
import { acquisitionReport } from "../../../_lib/acquisition.js";

export async function onRequestGet(context) {
  await requireAdmin(context.request, context.env);
  if (!isProduction(context.env)) throw new ApiError(503, "production_only", "The owner view is disabled on the preview board.");
  const db = requireDatabase(context.env);
  const board = await loadBoard(db, defaultBoardSlug(context.env));
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  return json(await acquisitionReport(db, board.id, since));
}

export function onRequest() { return methodNotAllowed(["GET"]); }
