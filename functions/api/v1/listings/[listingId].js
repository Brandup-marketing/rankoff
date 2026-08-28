import { ApiError, isProduction, requireDatabase } from "../../../_lib/config.js";
import { json, methodNotAllowed } from "../../../_lib/http.js";
import { loadListingReview } from "../../../_lib/repository.js";

export async function onRequestGet(context) {
  if (!isProduction(context.env)) {
    throw new ApiError(404, "listing_not_found", "Preview listings exist only in this browser.");
  }
  const listing = await loadListingReview(requireDatabase(context.env), String(context.params.listingId));
  if (!listing) throw new ApiError(404, "listing_not_found", "That listing could not be found.");
  return json({
    listing: {
      id: listing.id,
      title: listing.title,
      url: listing.destination_url,
      category: listing.category,
      status: listing.status,
      created_at: listing.created_at,
      updated_at: listing.updated_at,
    },
    review: {
      complete: listing.status !== "pending_review",
      checkout_available: listing.status === "approved",
    },
  });
}

export function onRequest() {
  return methodNotAllowed(["GET"]);
}
