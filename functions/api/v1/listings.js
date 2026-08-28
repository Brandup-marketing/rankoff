import { ApiError, defaultBoardSlug, isProduction, requireDatabase } from "../../_lib/config.js";
import { json, methodNotAllowed, readJson } from "../../_lib/http.js";
import { createListing, loadBoard } from "../../_lib/repository.js";
import { requireAdmin, sha256Hex } from "../../_lib/security.js";
import { normalizeCategory, normalizeDestinationUrl, optionalString, requireString } from "../../_lib/validation.js";

export async function onRequestPost(context) {
  if (!isProduction(context.env)) {
    throw new ApiError(503, "production_only", "Listing submission is disabled on the preview board.");
  }
  await requireAdmin(context.request, context.env);
  const input = await readJson(context.request);
  const db = requireDatabase(context.env);
  const board = await loadBoard(db, defaultBoardSlug(context.env));
  const destination = normalizeDestinationUrl(input.url);
  const createdAt = new Date().toISOString();
  const listing = {
    id: crypto.randomUUID(),
    boardId: board.id,
    ownerReferenceHash: await sha256Hex(requireString(input.owner_reference, "owner_reference", { max: 256 })),
    title: requireString(input.title, "title", { max: 96 }),
    description: optionalString(input.description, "description", { max: 240 }),
    destinationUrl: destination.url,
    hostname: destination.hostname,
    faviconUrl: destination.faviconUrl,
    category: normalizeCategory(input.category),
    createdAt,
  };
  await createListing(db, listing);
  return json({
    listing: {
      id: listing.id,
      status: "pending_review",
      title: listing.title,
      url: listing.destinationUrl,
      category: listing.category,
    },
    review: {
      required: true,
      checkout_available: false,
      message: "Submitted for review. Approval is required before bidding can begin.",
      status_url: `/api/v1/listings/${listing.id}`,
    },
  }, { status: 201 });
}

export function onRequest() {
  return methodNotAllowed(["POST"]);
}
