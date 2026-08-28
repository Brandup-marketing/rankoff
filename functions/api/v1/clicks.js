import { ApiError, isProduction, requireDatabase, sessionHashSalt } from "../../_lib/config.js";
import { getClientIp, json, methodNotAllowed, readJson } from "../../_lib/http.js";
import { loadApprovedDestination, recordClick } from "../../_lib/repository.js";
import { sha256Hex } from "../../_lib/security.js";
import { requireString } from "../../_lib/validation.js";

export async function onRequestPost(context) {
  if (!isProduction(context.env)) return json({ accepted: true, mode: "demo" }, { status: 202 });
  const input = await readJson(context.request);
  const db = requireDatabase(context.env);
  const listingId = requireString(input.listing_id, "listing_id", { max: 128 });
  const listing = await loadApprovedDestination(db, listingId);
  if (!listing) throw new ApiError(404, "listing_not_found", "That listing is not available.");
  const id = crypto.randomUUID();
  const session = String(input.session_id || getClientIp(context.request)).slice(0, 256);
  await recordClick(db, { id, boardId: listing.board_id, listingId, snapshotId: input.snapshot_id || null, rank: Number.isInteger(input.rank) ? input.rank : null, sessionHash: await sha256Hex(`${sessionHashSalt(context.env)}:${session}`), destinationHost: listing.hostname, occurredAt: new Date().toISOString() });
  return json({ click_id: id }, { status: 202 });
}

export function onRequest() {
  return methodNotAllowed(["POST"]);
}
