import { ApiError, isProduction, requireDatabase } from "../../_lib/config.js";
import { paymentTransition } from "../../_lib/domain.js";
import { getRequestId, json, methodNotAllowed } from "../../_lib/http.js";
import { applyProviderEvent, loadBidForWebhook } from "../../_lib/repository.js";
import { verifyStandardWebhook } from "../../_lib/security.js";

export async function onRequestPost(context) {
  if (!isProduction(context.env)) throw new ApiError(503, "production_only", "Webhooks are disabled on the preview board.");
  const rawBody = await context.request.text();
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
  if (nextStatus === "settled") {
    if (Number(data.total_amount) !== Number(bid.amount_minor) || String(data.currency || "").toUpperCase() !== bid.currency) {
      throw new ApiError(422, "payment_mismatch", "Webhook amount or currency does not match the bid.");
    }
  }

  try {
    await applyProviderEvent(db, {
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
      requestId: getRequestId(context),
    });
  } catch (error) {
    if (/UNIQUE constraint failed: webhook_events/i.test(String(error?.message || error))) {
      return json({ received: true, duplicate: true });
    }
    throw error;
  }
  return json({ received: true });
}

export function onRequest() {
  return methodNotAllowed(["POST"]);
}
