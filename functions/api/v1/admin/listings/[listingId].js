import { ApiError, isProduction, requireDatabase } from "../../../../_lib/config.js";
import { validateModerationTransition } from "../../../../_lib/domain.js";
import { getRequestId, json, methodNotAllowed, readJson } from "../../../../_lib/http.js";
import { loadListingReview, moderateListing } from "../../../../_lib/repository.js";
import { requireAdmin } from "../../../../_lib/security.js";
import { optionalString, requireString } from "../../../../_lib/validation.js";

export async function onRequestPatch(context) {
  if (!isProduction(context.env)) throw new ApiError(503, "production_only", "Moderation is disabled on the preview board.");
  await requireAdmin(context.request, context.env);
  const input = await readJson(context.request);
  const status = requireString(input.status, "status", { max: 32 });
  const reason = optionalString(input.reason, "reason", { max: 500 });
  const db = requireDatabase(context.env);
  const listing = await loadListingReview(db, String(context.params.listingId));
  if (!listing) throw new ApiError(404, "listing_not_found", "That listing could not be found.");
  validateModerationTransition(listing.status, status, reason);
  const updated = await moderateListing(db, listing, {
    status,
    reason,
    requestId: getRequestId(context),
    createdAt: new Date().toISOString(),
  });
  return json({ listing: updated });
}

export function onRequest() {
  return methodNotAllowed(["PATCH"]);
}
