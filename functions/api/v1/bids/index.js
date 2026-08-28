import { ApiError, defaultCurrency, isProduction, maxBidMinor, paymentConfigurationReady, requireDatabase } from "../../../_lib/config.js";
import { getRequestId, json, methodNotAllowed, readJson } from "../../../_lib/http.js";
import { createDodoCheckout } from "../../../_lib/payment.js";
import { createPendingBid, findIdempotentBid, loadListingForBid, loadMinimumBid, markBidSetupFailed, publicBid, updateBidCheckout } from "../../../_lib/repository.js";
import { sha256Hex } from "../../../_lib/security.js";
import { normalizeCurrency, parsePositiveMinorUnits, requireString } from "../../../_lib/validation.js";

export async function onRequestPost(context) {
  if (!isProduction(context.env) || !paymentConfigurationReady(context.env)) {
    throw new ApiError(503, "checkout_disabled", "Live checkout is not enabled. No charge was made.");
  }
  const input = await readJson(context.request);
  const idempotencyKey = requireString(context.request.headers.get("Idempotency-Key"), "Idempotency-Key", { min: 8, max: 128 });
  const listingId = requireString(input.listing_id, "listing_id", { max: 128 });
  const amountMinor = parsePositiveMinorUnits(input.amount_minor, "amount_minor", maxBidMinor(context.env));
  const currency = normalizeCurrency(input.currency || defaultCurrency(context.env));
  const db = requireDatabase(context.env);
  const listing = await loadListingForBid(db, listingId);
  if (currency !== listing.currency) throw new ApiError(422, "currency_mismatch", `This board accepts ${listing.currency} only.`);
  const minimum = await loadMinimumBid(db, listing);
  if (amountMinor < minimum) throw new ApiError(409, "bid_too_low", `The current minimum is ${minimum} minor units.`, { minimum_amount_minor: minimum });

  const fingerprint = await sha256Hex(JSON.stringify({ listingId, amountMinor, currency }));
  const existing = await findIdempotentBid(db, listingId, idempotencyKey);
  if (existing) {
    if (existing.request_fingerprint !== fingerprint) throw new ApiError(409, "idempotency_conflict", "That idempotency key was already used for a different request.");
    return json({ bid: publicBid(existing), checkout_url: existing.checkout_url || null });
  }

  const now = new Date().toISOString();
  const bid = { id: crypto.randomUUID(), boardId: listing.board_id, listingId, amountMinor, currency, idempotencyKey, fingerprint, snapshotId: input.snapshot_id || null, createdAt: now };
  await createPendingBid(db, bid);
  try {
    const checkout = await createDodoCheckout(context.env, bid);
    await updateBidCheckout(db, bid.id, checkout, now);
    return json({ bid: { id: bid.id, listing_id: listingId, amount_minor: amountMinor, currency, status: "checkout_created", created_at: now, settled_at: null }, checkout_url: checkout.checkoutUrl, request_id: getRequestId(context) }, { status: 201 });
  } catch (error) {
    await markBidSetupFailed(db, bid.id, new Date().toISOString());
    throw error;
  }
}

export function onRequest() {
  return methodNotAllowed(["POST"]);
}
