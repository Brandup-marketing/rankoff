import { ApiError, defaultBoardSlug, isProduction, requireDatabase, sessionHashSalt } from "../../_lib/config.js";
import { getClientIp, json, methodNotAllowed, readJson } from "../../_lib/http.js";
import { loadBoard, recordBoardView } from "../../_lib/repository.js";
import { sha256Hex } from "../../_lib/security.js";

export async function onRequestPost(context) {
  if (!isProduction(context.env)) return json({ accepted: true, mode: "demo" }, { status: 202 });
  const input = await readJson(context.request);
  if (input.type !== "board_viewed") throw new ApiError(422, "invalid_event", "Only board_viewed is accepted here.");
  const db = requireDatabase(context.env);
  const board = await loadBoard(db, defaultBoardSlug(context.env));
  const session = String(input.session_id || getClientIp(context.request)).slice(0, 256);
  await recordBoardView(db, { id: crypto.randomUUID(), boardId: board.id, snapshotId: input.snapshot_id || null, sessionHash: await sha256Hex(`${sessionHashSalt(context.env)}:${session}`), occurredAt: new Date().toISOString() });
  return json({ accepted: true }, { status: 202 });
}

export function onRequest() {
  return methodNotAllowed(["POST"]);
}
