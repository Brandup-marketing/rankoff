import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { DEFAULT_CHECKOUT_RETURN_URL, buildCheckoutReturnUrl } from "../../functions/_lib/payment.js";

const appSource = readFileSync(new URL("../../app.js", import.meta.url), "utf8");

test("the checkout return carries the bid id on the default URL", () => {
  const url = new URL(buildCheckoutReturnUrl(undefined, "bid_123"));
  assert.equal(url.origin + url.pathname, "https://rankoff.my/");
  assert.equal(url.searchParams.get("checkout"), "returned");
  assert.equal(url.searchParams.get("bid"), "bid_123");
});

test("an owner-configured return URL is honoured, not replaced", () => {
  const configured = "https://rankoff.my/thanks?utm_source=dodo#top";
  const url = new URL(buildCheckoutReturnUrl(configured, "bid_abc"));
  assert.equal(url.pathname, "/thanks");
  assert.equal(url.searchParams.get("utm_source"), "dodo");
  assert.equal(url.hash, "#top");
  // The page needs both: "checkout" to greet the buyer, "bid" to identify them.
  assert.equal(url.searchParams.get("checkout"), "returned");
  assert.equal(url.searchParams.get("bid"), "bid_abc");
});

test("a configured checkout marker is not overwritten", () => {
  const url = new URL(buildCheckoutReturnUrl("https://rankoff.my/?checkout=done", "bid_9"));
  assert.equal(url.searchParams.get("checkout"), "done");
  assert.equal(url.searchParams.get("bid"), "bid_9");
});

test("a missing bid id leaves the return URL exactly as configured", () => {
  assert.equal(buildCheckoutReturnUrl("", ""), DEFAULT_CHECKOUT_RETURN_URL);
  assert.equal(buildCheckoutReturnUrl("https://rankoff.my/x", null), "https://rankoff.my/x");
  assert.equal(buildCheckoutReturnUrl("https://rankoff.my/x", "   "), "https://rankoff.my/x");
});

test("a relative or malformed return URL still carries the bid id", () => {
  assert.equal(buildCheckoutReturnUrl("/thanks", "bid_1"), "/thanks?checkout=returned&bid=bid_1");
  // The fragment stays at the end where the browser expects it.
  assert.equal(buildCheckoutReturnUrl("/thanks?a=1#end", "bid 2"), "/thanks?a=1&checkout=returned&bid=bid%202#end");
});

test("the return page polls on a bounded, backing-off schedule", () => {
  const match = appSource.match(/const CHECKOUT_POLL_DELAYS = \[([^\]]+)\]/);
  assert.ok(match, "app.js must declare CHECKOUT_POLL_DELAYS");
  const delays = match[1].split(",").map((value) => Number(value.trim()));
  assert.ok(delays.length >= 4, "a settlement webhook can take more than one retry");
  assert.ok(delays.every(Number.isFinite));
  for (let index = 1; index < delays.length; index += 1) {
    assert.ok(delays[index] > delays[index - 1], "each retry must back off");
  }
  const total = delays.reduce((sum, value) => sum + value, 0);
  assert.ok(total > 30_000, "give the webhook a real chance to land");
  assert.ok(total <= 180_000, "the watch must give up, not poll forever");
});

test("the pending settlement line exists in both languages", () => {
  const match = appSource.match(/function settlementPendingCopy\(\)[\s\S]{0,400}?\n {2}}/);
  assert.ok(match, "app.js must declare settlementPendingCopy");
  const body = match[0];
  assert.match(body, /verified payment settlement/);
  assert.match(body, /[一-鿿]/, "the same honest line must exist in 中文");
});

test("a rank is only claimed after the board confirms the paid bid", () => {
  const match = appSource.match(/async function watchCheckoutSettlement\([\s\S]*?\n {2}}/);
  assert.ok(match, "app.js must declare watchCheckoutSettlement");
  const body = match[0];
  const boardLookup = body.indexOf("findSettledBoardEntry");
  const successToast = body.indexOf("Payment settled");
  const shareCall = body.indexOf("openSettlementShare");
  assert.ok(boardLookup > -1 && successToast > boardLookup, "the board check must precede the claim");
  assert.ok(shareCall > successToast, "the share is offered only after the position is real");
  assert.match(body, /if \(!found\) continue;/, "an unlisted bid must keep waiting, never congratulate");
});

test("the settlement share is offered through the shared share sheet", () => {
  const match = appSource.match(/async function openSettlementShare\([\s\S]*?\n {2}}/);
  assert.ok(match, "app.js must declare openSettlementShare");
  assert.match(match[0], /window\.RankoffShare\?\.open/);
  // The merchant's own logo and words, exactly as the board card's share does.
  assert.match(match[0], /image: shareData\.image/);
  assert.match(match[0], /description: shareData\.description/);
});

test("no price in the settlement share is invented in the client", () => {
  const match = appSource.match(/function settlementShareData\([\s\S]*?\n {2}}/);
  assert.ok(match, "app.js must declare settlementShareData");
  const body = match[0];
  // Both amounts come from the board payload; neither is defaulted to a number.
  assert.match(body, /Number\.isSafeInteger\(totalMinor\) && totalMinor > 0/);
  assert.match(body, /: null;/);
  assert.match(body, /nextBid/);
  assert.doesNotMatch(body, /RM ?\d/);
});

// The share message is built inside app.js's IIFE, so it is lifted out here and
// run against stubs. It is the one place a client-side price could be invented.
function loadSettlementShareData(language = "en") {
  const match = appSource.match(/function settlementShareData\([\s\S]*?\n {2}}/);
  assert.ok(match, "app.js must declare settlementShareData");
  const factory = new Function(
    "state",
    "money",
    "dollarsFromMinor",
    "listingDetailPath",
    `${match[0]}\nreturn settlementShareData;`,
  );
  return factory(
    { language },
    (value) => `RM ${value}`,
    (value, fallback) => {
      const minor = Number(value);
      if (!Number.isSafeInteger(minor) || minor < 0) return fallback;
      return Math.max(1, Math.ceil(minor / 100));
    },
    (listing) => (listing?.identity ? `/product/${listing.identity}` : ""),
  );
}

const settledEntry = {
  rank: 3,
  listing: {
    id: "listing_1",
    title: "Kedai Kopi",
    hostname: "kedaikopi.my",
    description: "Third-wave coffee in JB.",
    favicon_url: "https://rankoff.my/og/kedaikopi.my",
  },
  bid: { amount_minor: 1500 },
};

test("the settled share names the real position, total and next price", () => {
  const build = loadSettlementShareData();
  const share = build(settledEntry, 20);
  assert.equal(share.title, "Kedai Kopi — #3 on RANKOFF");
  assert.match(share.text, /holds #3 on RANKOFF with a RM 15 sponsored bid/);
  assert.match(share.text, /Claim #1 from RM 20\./);
  assert.equal(share.url, "https://rankoff.my/product/kedaikopi.my");
  assert.equal(share.image, "https://rankoff.my/og/kedaikopi.my");
  assert.equal(share.description, "Third-wave coffee in JB.");
});

test("an amount the board did not return is omitted, never printed as zero", () => {
  const build = loadSettlementShareData();
  const share = build({ ...settledEntry, bid: { amount_minor: null } }, null);
  assert.doesNotMatch(share.text, /RM 0/);
  assert.doesNotMatch(share.text, /sponsored bid/);
  assert.doesNotMatch(share.text, /Claim #1/);
  assert.match(share.text, /holds #3 on RANKOFF\./);
});

test("no rank means no share at all", () => {
  const build = loadSettlementShareData();
  assert.equal(build({ ...settledEntry, rank: 0 }, 20), null);
  assert.equal(build({ ...settledEntry, rank: undefined }, 20), null);
  assert.equal(build({ rank: 2, listing: { id: "x" } }, 20), null);
});

test("a listing without its own page falls back to the board anchor", () => {
  const build = loadSettlementShareData();
  const share = build({ ...settledEntry, listing: { ...settledEntry.listing, hostname: "" } }, 20);
  assert.equal(share.url, "https://rankoff.my/#listing-listing_1");
});

test("the settled share speaks 中文 when the visitor does", () => {
  const build = loadSettlementShareData("zh");
  const share = build(settledEntry, 20);
  assert.equal(share.title, "Kedai Kopi — RANKOFF 第 3 名");
  assert.match(share.text, /第 3 名/);
  assert.match(share.text, /RM 20 起认领第 1 名/);
  assert.doesNotMatch(share.text, /holds/);
});
