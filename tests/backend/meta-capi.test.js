import assert from "node:assert/strict";
import test from "node:test";

import { buyerMatchKeys, reportSettledPurchase } from "../../functions/_lib/meta-capi.js";

const BID = { id: "bid_abc", amount_minor: 500, currency: "MYR" };
const BUYER = { email: " Jake@Example.COM ", phone: "+60 12-345 6789", name: "Jake Ning", city: "Johor Bahru", state: "Johor", zipcode: "80100", country: "MY" };
const ENV = { META_CAPI_TOKEN: "token-value", META_PIXEL_ID: "1381116680322454" };

function recorder(response = { ok: true, json: async () => ({ events_received: 1 }) }) {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url: String(url), init, body: JSON.parse(init.body) });
    return response;
  };
  return { calls, fetcher };
}

test("a settled payment is reported with the real amount and the bid as event id", async () => {
  const { calls, fetcher } = recorder();
  assert.equal(await reportSettledPurchase({ bid: BID, buyer: BUYER, eventSourceUrl: "https://rankoff.my/profile/instagram/x", eventTime: 1_757_000_000_000, env: ENV, fetcher }), true);
  assert.equal(calls.length, 1);

  const [call] = calls;
  assert.match(call.url, /^https:\/\/graph\.facebook\.com\/v[0-9.]+\/1381116680322454\/events$/);
  assert.equal(call.init.method, "POST");
  const [event] = call.body.data;
  assert.equal(event.event_name, "Purchase");
  assert.equal(event.action_source, "website");
  // The bid id is the event id in both channels, which is what lets Meta treat
  // the browser Purchase and this one as a single sale.
  assert.equal(event.event_id, "bid_abc");
  assert.deepEqual(event.custom_data, { value: 5, currency: "MYR" });
  assert.equal(event.event_time, 1_757_000_000);
  assert.equal(event.event_source_url, "https://rankoff.my/profile/instagram/x");
});

test("the buyer is matched by hash only, and never by the provider's own request", async () => {
  const { calls, fetcher } = recorder();
  await reportSettledPurchase({ bid: BID, buyer: BUYER, env: ENV, fetcher });
  const [event] = calls[0].body.data;

  const serialized = JSON.stringify(event);
  for (const plain of ["Jake@Example.COM", "jake@example.com", "123456789", "Johor Bahru", "Jake"]) {
    assert.ok(!serialized.includes(plain), `${plain} must not be sent in the clear`);
  }
  for (const key of ["em", "ph", "fn", "ct", "st", "zp", "country"]) {
    assert.match(event.user_data[key][0], /^[0-9a-f]{64}$/);
  }
  // The webhook request comes from the payment provider, so the buyer's own IP
  // and user agent are unknown here and must not be guessed.
  assert.equal(event.user_data.client_ip_address, undefined);
  assert.equal(event.user_data.client_user_agent, undefined);

  // Identical normalisation on both sides, or the hash never matches.
  const keys = await buyerMatchKeys({ email: "jake@example.com", phone: "0123456789", name: "jake", city: "johorbahru", state: "johor", zipcode: "80100", country: "my" });
  assert.equal(keys.em[0], event.user_data.em[0]);
  assert.equal(keys.ct[0], event.user_data.ct[0]);
});

test("absent credentials and unreal amounts report nothing at all", async () => {
  for (const [bid, env] of [
    [BID, {}],
    [BID, { META_CAPI_TOKEN: "" }],
    [{ ...BID, amount_minor: 0 }, ENV],
    [{ ...BID, amount_minor: Number.NaN }, ENV],
    [{ ...BID, currency: "" }, ENV],
    [{ ...BID, id: "" }, ENV],
  ]) {
    const { calls, fetcher } = recorder();
    assert.equal(await reportSettledPurchase({ bid, buyer: BUYER, env, fetcher }), null);
    assert.equal(calls.length, 0);
  }
});

test("a refusal or a network failure is reported as false, never thrown", async () => {
  const refused = recorder({ ok: false, status: 400, json: async () => ({ error: { message: "Invalid parameter" } }) });
  assert.equal(await reportSettledPurchase({ bid: BID, buyer: BUYER, env: ENV, fetcher: refused.fetcher }), false);

  const thrown = async () => { throw new Error("network down"); };
  assert.equal(await reportSettledPurchase({ bid: BID, buyer: BUYER, env: ENV, fetcher: thrown }), false);
});

test("the settlement webhook reports a purchase without being able to fail a payment", async () => {
  const source = await import("node:fs").then(({ readFileSync }) => readFileSync(new URL("../../functions/api/webhooks/dodo.js", import.meta.url), "utf8"));
  // Exactly one call site, so a settlement cannot report the same sale twice.
  assert.equal(source.split("reportSettledPurchase({").length - 1, 1);
  assert.match(source, /import \{ reportSettledPurchase \} from "\.\.\/\.\.\/_lib\/meta-capi\.js"/);
  // Only a settled payment, only after the response, and never unguarded.
  const call = source.indexOf("reportSettledPurchase({");
  assert.ok(source.lastIndexOf('if (nextStatus === "settled") {', call) > 0);
  assert.ok(source.lastIndexOf("context.waitUntil(", call) > 0);
  assert.match(source.slice(call), /\.catch\(\(\) => false\)/);
});
