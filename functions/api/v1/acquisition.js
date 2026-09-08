import { defaultBoardSlug, isProduction, requireDatabase } from "../../_lib/config.js";
import { json, methodNotAllowed, readJson } from "../../_lib/http.js";
import { recordAcquisition } from "../../_lib/acquisition.js";
import { loadBoard } from "../../_lib/repository.js";

export async function onRequestPost(context) {
  const input = await readJson(context.request);
  if (!isProduction(context.env)) return json({ accepted: true, mode: "demo" }, { status: 202 });
  const db = requireDatabase(context.env);
  const board = await loadBoard(db, defaultBoardSlug(context.env));
  await recordAcquisition(db, context.env, board.id, input, input.type);
  return json({ accepted: true }, { status: 202 });
}

export function onRequest() { return methodNotAllowed(["POST"]); }
