import { isProduction, requireDatabase } from "../../../_lib/config.js";
import { json, methodNotAllowed } from "../../../_lib/http.js";
import { loadPublicBid } from "../../../_lib/repository.js";
import { ApiError } from "../../../_lib/config.js";

export async function onRequestGet(context) {
  if (!isProduction(context.env)) throw new ApiError(404, "bid_not_found", "Preview bids exist only in this browser.");
  return json({ bid: await loadPublicBid(requireDatabase(context.env), String(context.params.bidId)) });
}

export function onRequest() {
  return methodNotAllowed(["GET"]);
}
