import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

import { priceAboveMinor } from "../../functions/_lib/pricing.js";
import { onRequestGet as renderHome } from "../../functions/index.js";
import { seedListing, seedPayment, testDatabase } from "../helpers/sqlite.js";

const CASES = [
  // [holder, minimum, price] in minor units
  [490, 10000, 10000],   // US$4.90 leader, US$100 minimum: the minimum already takes #1
  [0, 10000, 10000],     // empty board
  [10000, 10000, 10100], // a US$100 leader is passed by US$101, not US$200
  [15000, 10000, 15100],
  [1200, 200, 1300],
  [225, 100, 300],       // converted cents: the next whole unit strictly above
  [499, 100, 500],
];

test("a place costs one whole unit above its holder and never less than the minimum payment", () => {
  for (const [holder, floor, expected] of CASES) {
    assert.equal(priceAboveMinor(holder, floor), expected, `${holder} / ${floor}`);
    assert.ok(priceAboveMinor(holder, floor) > holder, "a tie loses, so the quote must be strictly above");
  }
});

test("the page quotes the same price as the server", () => {
  const app = readFileSync(new URL("../../app.js", import.meta.url), "utf8");
  const start = app.indexOf("  function nextWholeAbove(");
  const end = app.indexOf("\n  }\n", app.indexOf("  function priceAbove(")) + 4;
  assert.ok(start > 0 && end > start);
  const source = app.slice(start, end);
  for (const [holder, floor] of [...CASES.map(([h, f]) => [h, f]), [367, 10000], [0, 200]]) {
    const context = vm.createContext({ boardMinimum: () => floor / 100 });
    const dollars = vm.runInContext(`${source}\npriceAbove(${holder / 100})`, context);
    assert.equal(Math.round(dollars * 100), priceAboveMinor(holder, floor), `${holder} / ${floor}`);
  }
});

async function home({ leaderMinor, floorMinor, path = "/" }) {
  const db = testDatabase();
  db.sqlite.exec(`UPDATE boards SET currency = 'USD', min_increment_minor = ${floorMinor}, checkout_enabled = 1 WHERE id = 'board_global'`);
  seedListing(db, "leader");
  seedPayment(db, { id: "leader-payment", listing: "leader", amount: leaderMinor, currency: "USD" });
  const shell = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  const response = await renderHome({
    request: new Request(`https://rankoff.my${path}`),
    env: { RANKOFF_MODE: "production", BOARD_SLUG: "global", DB: db, ASSETS: { fetch: async () => new Response(shell) } },
    next: () => new Response("fallback", { status: 404 }),
  });
  const html = await response.text();
  db.sqlite.close();
  return html;
}

test("while the minimum already takes #1, the first paint offers one button at the minimum", async () => {
  const html = await home({ leaderMinor: 490, floorMinor: 10000 });
  assert.match(html, /<div class="hero-paths" data-hero-paths data-solo="top">/);
  assert.match(html, /<button\b[^>]*\bdata-hero-list hidden\b/);
  assert.doesNotMatch(html, /<button\b[^>]*\bdata-hero-top hidden\b/);
  assert.match(html, /data-hero-top-price>US\$\s100</);
  assert.match(html, /data-hero-next-price>US\$\s100</);
  assert.doesNotMatch(html, /US\$\s105/);
});

test("when #1 costs more than the minimum, both prices show", async () => {
  const html = await home({ leaderMinor: 15000, floorMinor: 10000 });
  assert.doesNotMatch(html, /data-solo=/);
  assert.doesNotMatch(html, /\bdata-hero-list hidden\b/);
  assert.match(html, /data-hero-top-price>US\$\s151</);
  assert.match(html, /data-hero-entry-price>from US\$\s100</);
});

test("Past 24h offers listing, never a #1 quote", async () => {
  const html = await home({ leaderMinor: 490, floorMinor: 10000, path: "/?period=today" });
  assert.match(html, /data-solo="list"/);
  assert.match(html, /<button\b[^>]*\bdata-hero-top hidden\b/);
  assert.doesNotMatch(html, /\bdata-hero-list hidden\b/);
});
