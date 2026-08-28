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

test("preview bid endpoint never creates a charge", async () => {
  await assert.rejects(
    createBid({ request: new Request("https://rankoff.my/api/v1/bids", { method: "POST" }), env: { RANKOFF_MODE: "demo" } }),
    (error) => error.code === "checkout_disabled" && error.status === 503,
  );
});
