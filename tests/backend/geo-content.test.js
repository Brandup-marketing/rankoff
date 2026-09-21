import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { liveSummary, onRequestGet as renderAnswer, withLiveMinimum } from "../../functions/answers/[slug].js";
import { onRequestGet as renderAbout } from "../../functions/about.js";
import { translateMs } from "../../ms-copy.js";
import { seedListing, seedPayment, testDatabase } from "../helpers/sqlite.js";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const schemas = (html) => [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

function usdBoard() {
  const db = testDatabase();
  db.sqlite.exec("UPDATE boards SET currency = 'USD', min_increment_minor = 10000, checkout_enabled = 1 WHERE id = 'board_global'");
  seedListing(db, "leader");
  seedPayment(db, { id: "leader-payment", listing: "leader", amount: 490, currency: "USD" });
  db.sqlite.exec("INSERT INTO click_events (id, board_id, listing_id, snapshot_id, displayed_rank, session_hash, destination_host, occurred_at) VALUES ('c1','board_global','leader',NULL,1,'s1','leader.example.com','2026-09-20T00:00:00.000Z'), ('c2','board_global','leader',NULL,1,'s2','leader.example.com','2026-09-20T00:00:00.000Z')");
  return db;
}

test("the live summary says tracked clicks and total paid, never verified or settled", () => {
  const { en, zh } = liveSummary(12, 3059, 243, "USD", true);
  assert.equal(en, "12 live listings, US$ 30.59 in total paid (earlier ringgit payments converted at a fixed rate) and 243 tracked clicks");
  assert.doesNotMatch(en, /verified|settled/i);
  assert.match(zh, /累计已付 US\$ 30\.59（早期马币付款按固定汇率换算）、243 次追踪点击/);
  assert.equal(liveSummary(1, 500, 1, "USD").en, "1 live listing, US$ 5 in total paid and 1 tracked click");
});

test("the starting-amount answer names the live minimum in the page and in its FAQ schema", async () => {
  const db = usdBoard();
  const response = await renderAnswer({
    request: new Request("https://rankoff.my/answers/sponsor-a-public-link"),
    params: { slug: "sponsor-a-public-link" },
    env: { RANKOFF_MODE: "production", BOARD_SLUG: "global", DB: db, ASSETS: { fetch: async () => new Response(read("answers/sponsor-a-public-link.html")) } },
    next: () => new Response("missing", { status: 404 }),
  });
  const html = await response.text();
  db.sqlite.close();
  assert.match(html, /<p lang="en">Entry is currently US\$ 100\. The live board shows the current minimum/);
  assert.match(html, /目前起步金额为 US\$ 100。/);
  const faq = schemas(html).find((s) => s["@type"] === "FAQPage");
  const answer = faq.mainEntity.find((q) => q.name.startsWith("What is the starting amount?")).acceptedAnswer.text;
  assert.match(answer, /^Entry is currently US\$ 100\./);
  assert.match(html, /<span data-live-summary>1 live listing, US\$ 4\.9 in total paid and 2 tracked clicks<\/span>/);
  assert.doesNotMatch(html, /verified click/i);
  assert.equal(withLiveMinimum("unchanged", ""), "unchanged");
});

test("the About page writes the board's numbers into the first paint", async () => {
  const db = usdBoard();
  const response = await renderAbout({
    request: new Request("https://rankoff.my/about"),
    env: { RANKOFF_MODE: "production", BOARD_SLUG: "global", DB: db, ASSETS: { fetch: async () => new Response(read("about.html")) } },
    next: () => new Response("missing", { status: 404 }),
  });
  const html = await response.text();
  db.sqlite.close();
  assert.match(html, /<strong data-about-listings data-no-translate>1<\/strong>/);
  assert.match(html, /<strong data-about-clicks data-no-translate>2<\/strong>/);
  assert.match(html, /<strong data-about-bid data-no-translate>US\$4\.9<\/strong>/);
});

test("Rankoff is one entity with its own profiles, distinct from a same-named gaming organisation", () => {
  for (const page of ["index.html", "about.html"]) {
    const org = schemas(read(page)).map((s) => s.publisher || s.mainEntity).find(Boolean);
    assert.equal(org["@id"], "https://rankoff.my/#organization", page);
    assert.deepEqual(org.sameAs, ["https://www.instagram.com/rankoff.my/", "https://www.facebook.com/1356018630922623"], page);
    assert.match(org.disambiguatingDescription, /not an esports or gaming organisation/, page);
    assert.equal(org.foundingDate, "2026-08-31", page);
  }
  const llms = read("llms.txt");
  assert.match(llms, /## Key Facts \(as of 22 September 2026\)/);
  assert.match(llms, /minimum payment is US\$100/);
  assert.match(llms, /answers\/how-rankoff-ranking-works/);
  assert.equal((llms.match(/verified/gi) || []).length, 1, "only the instruction not to call clicks verified");
});

test("the new answer sentences have Malay copy", () => {
  assert.equal(
    translateMs("12 live listings, US$ 30.59 in total paid (earlier ringgit payments converted at a fixed rate) and 243 tracked clicks"),
    "12 penyenaraian aktif, US$ 30.59 jumlah dibayar (bayaran ringgit terdahulu ditukar pada kadar tetap) dan 243 klik direkodkan",
  );
  assert.match(
    translateMs("Entry is currently US$ 100. The live board shows the current minimum and currency. The applicable published price is shown before payment."),
    /^Harga masuk kini US\$ 100\. Papan langsung menunjukkan minimum/,
  );
});
