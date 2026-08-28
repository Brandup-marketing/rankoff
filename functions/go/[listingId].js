import { ApiError, isProduction, requireDatabase, sessionHashSalt } from "../_lib/config.js";
import { getClientIp } from "../_lib/http.js";
import { loadApprovedDestination, recordClick } from "../_lib/repository.js";
import { sha256Hex } from "../_lib/security.js";

export async function onRequestGet(context) {
  if (!isProduction(context.env)) throw new ApiError(404, "listing_not_found", "Preview listings do not use tracked redirects.");
  const db = requireDatabase(context.env);
  const listing = await loadApprovedDestination(db, String(context.params.listingId));
  if (!listing) throw new ApiError(404, "listing_not_found", "That listing is not available.");
  const url = new URL(context.request.url);
  const session = url.searchParams.get("sid") || getClientIp(context.request);
  context.waitUntil(recordClick(db, { id: crypto.randomUUID(), boardId: listing.board_id, listingId: listing.id, snapshotId: url.searchParams.get("snapshot"), rank: Number(url.searchParams.get("rank")) || null, sessionHash: await sha256Hex(`${sessionHashSalt(context.env)}:${session}`), destinationHost: listing.hostname, occurredAt: new Date().toISOString() }));
  return Response.redirect(listing.destination_url, 302);
}
