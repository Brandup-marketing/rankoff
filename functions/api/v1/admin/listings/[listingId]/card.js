import { ApiError, isProduction, requireDatabase } from "../../../../../_lib/config.js";
import { json, methodNotAllowed } from "../../../../../_lib/http.js";
import { readImageHeader } from "../../../../../_lib/imageheader.js";
import { loadListingReview, saveListingShareCard } from "../../../../../_lib/repository.js";
import { requireAdmin } from "../../../../../_lib/security.js";

// The rank card is painted on a canvas in a browser, because Workers have no
// canvas. That means the bytes have to arrive from a page — and an open upload
// would let anyone choose the picture that represents a paying merchant in
// every share of their listing. So this is admin-only, and the image is
// measured from its own header rather than believed.
const MAX_BYTES = 600 * 1024;
const EXPECTED_WIDTH = 1200;
const EXPECTED_HEIGHT = 630;

export async function onRequestPut(context) {
  if (!isProduction(context.env)) {
    throw new ApiError(503, "production_only", "Share cards are stored on the production board only.");
  }
  await requireAdmin(context.request, context.env);

  const db = requireDatabase(context.env);
  const listingId = String(context.params.listingId || "");
  const listing = await loadListingReview(db, listingId);
  if (!listing) throw new ApiError(404, "listing_not_found", "That listing could not be found.");

  const declared = Number(context.request.headers.get("content-length") || 0);
  if (declared > MAX_BYTES) {
    throw new ApiError(413, "card_too_large", "The share card is larger than the limit.");
  }

  const buffer = await context.request.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (!bytes.length) throw new ApiError(422, "card_empty", "No image was sent.");
  if (bytes.length > MAX_BYTES) {
    throw new ApiError(413, "card_too_large", "The share card is larger than the limit.");
  }

  const header = readImageHeader(bytes);
  if (!header) {
    throw new ApiError(415, "card_not_an_image", "Only PNG and JPEG share cards are accepted.");
  }
  if (header.width !== EXPECTED_WIDTH || header.height !== EXPECTED_HEIGHT) {
    throw new ApiError(
      422,
      "card_wrong_size",
      `A share card must be ${EXPECTED_WIDTH}x${EXPECTED_HEIGHT}.`,
      { width: header.width, height: header.height },
    );
  }

  const now = new Date().toISOString();
  await saveListingShareCard(db, {
    listingId: listing.id,
    contentType: header.contentType,
    width: header.width,
    height: header.height,
    bytes: bytes.length,
    image: bytes,
    // Recorded so a stale card is recognisable later, never to be displayed.
    sourceRank: Number.isInteger(Number(context.request.headers.get("x-rankoff-rank")))
      ? Number(context.request.headers.get("x-rankoff-rank"))
      : null,
    sourceTotal: (context.request.headers.get("x-rankoff-total") || "").slice(0, 32) || null,
    updatedAt: now,
  });

  return json({
    listing_id: listing.id,
    content_type: header.contentType,
    width: header.width,
    height: header.height,
    bytes: bytes.length,
    updated_at: now,
  });
}

export function onRequest() {
  return methodNotAllowed(["PUT"]);
}
