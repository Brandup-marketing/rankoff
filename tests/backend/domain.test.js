import assert from "node:assert/strict";
import test from "node:test";

import { minimumWinningBid, paymentTransition, rankEligibleBids } from "../../functions/_lib/domain.js";
import { normalizeCategory, normalizeDestinationUrl, parsePositiveMinorUnits } from "../../functions/_lib/validation.js";

test("ranking sums settled payments per listing, then breaks ties by settlement time", () => {
  const listings = [{ id: "a", status: "approved" }, { id: "b", status: "approved" }];
  const bids = [
    { id: "z", listing_id: "a", status: "settled", amount_minor: 500, settled_at: "2026-01-01T00:00:01Z" },
    { id: "a", listing_id: "b", status: "settled", amount_minor: 500, settled_at: "2026-01-01T00:00:00Z" },
    { id: "ignored", listing_id: "a", status: "checkout_created", amount_minor: 900, settled_at: null },
  ];
  // Equal totals: the listing that reached its total first ranks higher.
  assert.deepEqual(rankEligibleBids(listings, bids).map((entry) => entry.listing_id), ["b", "a"]);

  // A repeat payment adds to the same listing's total and overtakes the leader.
  const topUp = { id: "t", listing_id: "a", status: "settled", amount_minor: 100, settled_at: "2026-01-02T00:00:00Z" };
  const ranked = rankEligibleBids(listings, [...bids, topUp]);
  assert.deepEqual(ranked.map((entry) => entry.listing_id), ["a", "b"]);
  assert.equal(ranked[0].total_minor, 600);
  assert.equal(ranked[0].bid.id, "t");

  assert.equal(minimumWinningBid(500, 100), 600);
});

test("payment transitions are monotonic", () => {
  assert.equal(paymentTransition("payment.succeeded", "checkout_created"), "settled");
  assert.equal(paymentTransition("payment.succeeded", "settled"), null);
  assert.equal(paymentTransition("refund.succeeded", "settled"), "reversed");
});

test("URL and money validation reject unsafe inputs", () => {
  assert.equal(normalizeDestinationUrl("https://rankoff.my/path#x").hostname, "rankoff.my");
  assert.throws(() => normalizeDestinationUrl("http://localhost:8788"), /HTTPS/);
  assert.equal(parsePositiveMinorUnits(500, "amount_minor", 1000), 500);
  assert.throws(() => parsePositiveMinorUnits(1.5, "amount_minor", 1000), /integer/);
});

test("legacy category tags normalize to visible launch markets", () => {
  assert.equal(normalizeCategory("Hardware"), "Ecommerce");
  assert.equal(normalizeCategory("SEO"), "Marketing");
  assert.equal(normalizeCategory("AIMedia"), "Agents");
});
