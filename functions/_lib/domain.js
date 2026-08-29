import { ApiError } from "./config.js";

const MODERATION_TRANSITIONS = Object.freeze({
  pending_review: new Set(["approved", "suspended", "removed"]),
  approved: new Set(["suspended", "removed"]),
  suspended: new Set(["approved", "removed"]),
  removed: new Set(),
});

export function validateModerationTransition(currentStatus, nextStatus, reason = "") {
  if (!Object.hasOwn(MODERATION_TRANSITIONS, currentStatus)) {
    throw new ApiError(409, "invalid_listing_state", "The listing has an unknown moderation state.");
  }
  if (!MODERATION_TRANSITIONS[currentStatus].has(nextStatus)) {
    throw new ApiError(409, "invalid_moderation_transition", `A ${currentStatus} listing cannot become ${nextStatus}.`);
  }
  if (["suspended", "removed"].includes(nextStatus) && !String(reason).trim()) {
    throw new ApiError(422, "moderation_reason_required", "A reason is required to suspend or remove a listing.");
  }
  return nextStatus;
}

export function rankEligibleBids(listings, bids) {
  const approved = new Set(
    listings.filter((listing) => listing.status === "approved").map((listing) => listing.id),
  );
  const totals = new Map();

  for (const bid of bids) {
    if (bid.status !== "settled" || !approved.has(bid.listing_id) || !bid.settled_at) continue;
    const entry = totals.get(bid.listing_id) || { listing_id: bid.listing_id, total_minor: 0, last_bid: null };
    entry.total_minor += Number(bid.amount_minor);
    if (!entry.last_bid || compareBidRecency(bid, entry.last_bid) < 0) entry.last_bid = bid;
    totals.set(bid.listing_id, entry);
  }

  return [...totals.values()].sort(compareTotals).map((entry, index) => ({
    rank: index + 1,
    listing_id: entry.listing_id,
    total_minor: entry.total_minor,
    bid: entry.last_bid,
  }));
}

export function compareTotals(left, right) {
  if (left.total_minor !== right.total_minor) return right.total_minor - left.total_minor;
  // Equal totals: the listing that reached its total first (older last bid) ranks higher.
  const settledComparison = String(left.last_bid.settled_at).localeCompare(String(right.last_bid.settled_at));
  if (settledComparison !== 0) return settledComparison;
  return String(left.listing_id).localeCompare(String(right.listing_id));
}

function compareBidRecency(left, right) {
  const settledComparison = String(right.settled_at).localeCompare(String(left.settled_at));
  if (settledComparison !== 0) return settledComparison;
  return String(right.id).localeCompare(String(left.id));
}

export function paymentTransition(eventType, currentStatus) {
  if (eventType === "payment.succeeded") {
    return ["pending_payment", "checkout_created", "payment_failed"].includes(currentStatus)
      ? "settled"
      : null;
  }
  if (eventType === "payment.failed") {
    return ["pending_payment", "checkout_created"].includes(currentStatus)
      ? "payment_failed"
      : null;
  }
  if (
    ["payment.refunded", "refund.succeeded", "dispute.opened", "dispute.created"].includes(
      eventType,
    )
  ) {
    return currentStatus === "settled" ? "reversed" : null;
  }
  return null;
}

export function minimumWinningBid(currentTopMinor, incrementMinor) {
  return Math.max(0, currentTopMinor) + Math.max(1, incrementMinor);
}
