import { ApiError, isProduction, requireDatabase } from "../../_lib/config.js";
import { paymentTransition } from "../../_lib/domain.js";
import { getRequestId, json, MAX_WEBHOOK_BYTES, methodNotAllowed, readText } from "../../_lib/http.js";
import { applyProviderEvent, loadBidForWebhook, recordSnapshotEntries } from "../../_lib/repository.js";
import { pingIndexNow } from "../../_lib/indexnow.js";
import { profilePath } from "../../_lib/platform.js";
import { verifyStandardWebhook } from "../../_lib/security.js";

// Dodo sends the buyer with every payment event. It was being stored only
// inside the raw payload, which meant the business could not reach a single
// person who had paid. The full card number is never sent and never stored.
export function buyerFrom(data) {
  const text = (value) => {
    const trimmed = String(value ?? "").trim();
    return trimmed && trimmed !== "None" ? trimmed.slice(0, 320) : null;
  };
  const customer = data?.customer || {};
  const billing = data?.billing || {};
  return {
    email: text(customer.email),
    name: text(customer.name),
    phone: text(customer.phone_number),
    customerId: text(customer.customer_id),
    country: text(billing.country),
    state: text(billing.state),
    city: text(billing.city),
    street: text(billing.street),
    zipcode: text(billing.zipcode),
    invoiceUrl: text(data?.invoice_url),
    cardLastFour: text(data?.card_last_four),
    cardNetwork: text(data?.card_network),
  };
}

export async function onRequestPost(context) {
  if (!isProduction(context.env)) throw new ApiError(503, "production_only", "Webhooks are disabled on the preview board.");
  const rawBody = await readText(context.request, {
    maxBytes: MAX_WEBHOOK_BYTES,
    errorCode: "webhook_too_large",
  });
  const providerEventId = await verifyStandardWebhook(rawBody, context.request.headers, context.env.DODO_PAYMENTS_WEBHOOK_KEY);
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new ApiError(400, "invalid_webhook", "Webhook payload is invalid JSON.");
  }
  const eventType = String(payload?.type || "");
  const data = payload?.data?.object || payload?.data || {};
  const bidId = String(data?.metadata?.rankoff_bid_id || "");
  if (!bidId) return json({ received: true, ignored: true });

  const db = requireDatabase(context.env);
  const bid = await loadBidForWebhook(db, bidId);
  if (!bid) throw new ApiError(422, "unknown_bid", "Webhook references an unknown bid.");
  const nextStatus = paymentTransition(eventType, bid.status);
  if (!nextStatus) return json({ received: true, ignored: true });

  const paymentId = data.payment_id ? String(data.payment_id) : null;
  const checkoutId = data.checkout_session_id ? String(data.checkout_session_id) : null;
  if (checkoutId && bid.provider_checkout_id && checkoutId !== bid.provider_checkout_id) {
    throw new ApiError(422, "checkout_mismatch", "Webhook checkout reference does not match the bid.");
  }
  if (paymentId && bid.provider_payment_id && paymentId !== bid.provider_payment_id) {
    throw new ApiError(422, "payment_reference_mismatch", "Webhook payment reference does not match the bid.");
  }
  if (nextStatus === "settled") {
    if (Number(data.total_amount) !== Number(bid.amount_minor) || String(data.currency || "").toUpperCase() !== bid.currency) {
      throw new ApiError(422, "payment_mismatch", "Webhook amount or currency does not match the bid.");
    }
  }

  let snapshotId = null;
  try {
    snapshotId = await applyProviderEvent(db, {
      providerEventId,
      eventType,
      eventTimestamp: payload.timestamp || null,
      payloadJson: rawBody,
      receivedAt: new Date().toISOString(),
      bidId: bid.id,
      boardId: bid.board_id,
      paymentId,
      previousStatus: bid.status,
      nextStatus,
      buyer: buyerFrom(data),
      requestId: getRequestId(context),
    });
  } catch (error) {
    if (/UNIQUE constraint failed: webhook_events/i.test(String(error?.message || error))) {
      return json({ received: true, duplicate: true });
    }
    throw error;
  }

  // The payment is already recorded. Ranking history is a separate promise, so a
  // failure to write it is logged by the platform and never fails the webhook.
  if (snapshotId) {
    try {
      await recordSnapshotEntries(db, snapshotId, bid.board_id);
    } catch {
      /* The board still ranks from the bids themselves. */
    }

    // A settled payment changes the board and publishes a listing's page, so the
    // engines are told now rather than at whatever hour they next crawl.
    const origin = new URL(context.request.url).origin;
    const listingPath = bid.hostname ? profilePath(String(bid.hostname)) : "";
    context.waitUntil(
      pingIndexNow(origin, [`${origin}/`, `${origin}/sitemap.xml`, listingPath ? `${origin}${listingPath}` : ""])
        .catch(() => false),
    );
  }
  return json({ received: true });
}

export function onRequest() {
  return methodNotAllowed(["POST"]);
}
