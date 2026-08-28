import { defaultBoardSlug, isProduction, requireDatabase } from "../../_lib/config.js";
import { demoStats } from "../../_lib/demo.js";
import { json, methodNotAllowed } from "../../_lib/http.js";
import { loadBoard, loadPublicStats } from "../../_lib/repository.js";

export async function onRequestGet(context) {
  if (!isProduction(context.env)) return json(demoStats());
  const url = new URL(context.request.url);
  const db = requireDatabase(context.env);
  const board = await loadBoard(db, String(url.searchParams.get("board") || defaultBoardSlug(context.env)).toLowerCase());
  return json(await loadPublicStats(db, board));
}

export function onRequest() {
  return methodNotAllowed(["GET"]);
}
