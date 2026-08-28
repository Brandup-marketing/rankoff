import { defaultBoardSlug, isProduction, requireDatabase } from "../../_lib/config.js";
import { demoBoard } from "../../_lib/demo.js";
import { json, methodNotAllowed } from "../../_lib/http.js";
import { loadBoard, loadPublicBoard } from "../../_lib/repository.js";
import { normalizeLimit, normalizePage, normalizePeriod } from "../../_lib/validation.js";

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const boardSlug = String(url.searchParams.get("board") || defaultBoardSlug(context.env)).toLowerCase();
  const category = String(url.searchParams.get("category") || "all");
  const period = normalizePeriod(url.searchParams.get("period"));
  const limit = normalizeLimit(url.searchParams.get("limit"));
  const page = normalizePage(url.searchParams.get("page"));

  if (!isProduction(context.env)) return json(demoBoard({ category, period, limit, page }));
  const db = requireDatabase(context.env);
  const board = await loadBoard(db, boardSlug);
  return json(await loadPublicBoard(db, board, { category, period, limit, page }));
}

export function onRequest() {
  return methodNotAllowed(["GET"]);
}
