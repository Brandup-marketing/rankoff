import assert from "node:assert/strict";
import test from "node:test";

import { onRequestGet as getBoard } from "../../functions/api/v1/board.js";
import { onRequestPost as createBid } from "../../functions/api/v1/bids/index.js";

test("preview board is a stable safe API response", async () => {
  const response = await getBoard({
    request: new Request("https://rankoff.my/api/v1/board?period=today&limit=3"),
    env: { RANKOFF_MODE: "demo" },
  });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.mode, "demo");
  assert.equal(payload.rankings.length, 3);
  assert.ok(payload.next_bid_minor > payload.rankings[0].bid.amount_minor);
});

test("legacy category filters resolve to their broader launch market", async () => {
  const response = await getBoard({
    request: new Request("https://rankoff.my/api/v1/board?category=SEO&period=all&limit=50"),
    env: { RANKOFF_MODE: "demo" },
  });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(payload.rankings.map((entry) => entry.listing.id), ["trackline"]);
});

test("preview board paginates rankings without resetting their public rank", async () => {
  const response = await getBoard({
    request: new Request("https://rankoff.my/api/v1/board?period=all&limit=3&page=2"),
    env: { RANKOFF_MODE: "demo" },
  });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(payload.rankings.map((entry) => entry.rank), [4, 5]);
  assert.deepEqual(payload.pagination, {
    page: 2,
    page_size: 3,
    total: 5,
    total_pages: 2,
    has_previous: true,
    has_next: false,
  });
});

test("preview bid endpoint never creates a charge", async () => {
  await assert.rejects(
    createBid({ request: new Request("https://rankoff.my/api/v1/bids", { method: "POST" }), env: { RANKOFF_MODE: "demo" } }),
    (error) => error.code === "checkout_disabled" && error.status === 503,
  );
});

test("a bid without an accepted Terms of Service is refused before any charge", async () => {
  const env = {
    RANKOFF_MODE: "production",
    PAYMENTS_ENABLED: "true",
    DODO_ENVIRONMENT: "live_mode",
    DODO_PRODUCT_ID: "pdt_test",
    DODO_PAYMENTS_API_KEY: "key_test",
    DODO_PAYMENTS_WEBHOOK_KEY: "whk_test",
  };
  const body = { listing_id: "listing_1", amount_minor: 500, currency: "MYR" };
  const request = (payload) => new Request("https://rankoff.my/api/v1/bids", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": "idem_key_12345678" },
    body: JSON.stringify(payload),
  });

  await assert.rejects(
    createBid({ request: request(body), env }),
    (error) => error.code === "terms_not_accepted" && error.status === 422,
  );
  await assert.rejects(
    createBid({ request: request({ ...body, agreed_terms: "yes" }), env }),
    (error) => error.code === "terms_not_accepted",
  );
  // Consent present: it gets past the gate and fails later, on the missing database.
  await assert.rejects(
    createBid({ request: request({ ...body, agreed_terms: true }), env }),
    (error) => error.code !== "terms_not_accepted",
  );
});
