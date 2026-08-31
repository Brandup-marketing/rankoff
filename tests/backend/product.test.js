import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildProductView, escapeHtml, formatDate, formatMoney, normalizeSlug, productPath, renderProductPage } from "../../functions/_lib/product.js";
import { discoverShareImage, verifyImage } from "../../functions/og/[slug].js";
import { productEntries } from "../../functions/sitemap.xml.js";

const shell = readFileSync(new URL("../../listing.html", import.meta.url), "utf8");

const entry = {
  rank: 1,
  listing: {
    id: "listing-1",
    title: "BrandUp Design Marketing",
    description: "AI-powered lead-generation infrastructure.",
    url: "https://brandupdesignmarketing.com/",
    hostname: "brandupdesignmarketing.com",
    category: "Marketing",
  },
  bid: { amount_minor: 500, settled_at: "2026-08-31T11:04:27.190Z" },
  clicks: 41,
};

test("a listing slug is a hostname, never a path or an injection", () => {
  assert.equal(normalizeSlug("BrandUpDesignMarketing.com"), "brandupdesignmarketing.com");
  assert.equal(normalizeSlug("example.com."), "example.com");
  assert.equal(normalizeSlug("example.com/pricing"), "");
  assert.equal(normalizeSlug("../../etc/passwd"), "");
  assert.equal(normalizeSlug("javascript:alert(1)"), "");
  assert.equal(normalizeSlug("localhost"), "");
  assert.equal(normalizeSlug(""), "");
  assert.equal(productPath("Example.COM"), "/product/example.com");
});

test("money follows the board currency", () => {
  assert.equal(formatMoney(500, "MYR"), "RM 5");
  assert.equal(formatMoney(1250, "USD"), "USD 13");
});

test("the rendered page carries this listing's own title, description and canonical", () => {
  const view = buildProductView({ entry, todayEntry: entry, board: { currency: "MYR" }, snapshotId: "snap-1" });
  const html = renderProductPage(shell, view);

  assert.match(html, /<title>BrandUp Design Marketing — #1 on RANKOFF<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/rankoff\.my\/product\/brandupdesignmarketing\.com" \/>/);
  assert.match(html, /<meta property="og:title" content="BrandUp Design Marketing — #1 on RANKOFF" \/>/);
  assert.match(html, /<meta property="og:url" content="https:\/\/rankoff\.my\/product\/brandupdesignmarketing\.com" \/>/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image" \/>/);
  assert.match(html, /"@type": ?"WebPage"/);
  assert.ok(!html.includes("Sponsored listing | RANKOFF"), "the generic shell title must be gone");
});

test("a reader without JavaScript sees the record itself", () => {
  const view = buildProductView({ entry, todayEntry: null, board: { currency: "MYR" }, snapshotId: "" });
  const html = renderProductPage(shell, view);

  assert.match(html, /<h1 data-title>BrandUp Design Marketing<\/h1>/);
  assert.match(html, /<dd data-rank>#1<\/dd>/);
  assert.match(html, /<dd data-bid>RM 5<\/dd>/);
  assert.match(html, /<dd data-clicks>41<\/dd>/);
  assert.match(html, /<div class="listing-content" data-content>/);
  // One level deeper than the shell, so every asset has to be addressed from the root.
  assert.ok(!html.includes('href="./'), "relative stylesheet links would 404 under /product/");
  assert.ok(!html.includes('src="./'), "relative script links would 404 under /product/");
  assert.match(html, /<link rel="stylesheet" href="\/styles\.css/);
  assert.match(html, /<div class="listing-loading" data-loading hidden>/);
  assert.match(html, /<body data-listing-id="listing-1">/);
});

test("merchant text cannot inject markup into the page", () => {
  const hostile = {
    ...entry,
    listing: {
      ...entry.listing,
      title: '</title><script>alert(1)</script>',
      description: '"><img src=x onerror=alert(1)>',
    },
  };
  const html = renderProductPage(
    shell,
    buildProductView({ entry: hostile, todayEntry: null, board: { currency: "MYR" }, snapshotId: "" }),
  );

  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
  assert.ok(!jsonLd.includes("<"), "structured data must not carry a raw < that could close the block");
  const markup = html.replace(jsonLd, "");
  assert.ok(!markup.includes("<script>alert(1)</script>"), "script tags must not survive");
  assert.ok(!markup.includes("<img src=x"), "injected tags must not survive");
  assert.ok(!markup.includes("</title><script>"), "the title must not be closed early");
  // The payload still reads back, inert, as text rather than markup.
  assert.match(markup, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(markup, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.equal(escapeHtml('<b>&"'), "&lt;b&gt;&amp;&quot;");
});

test("the sitemap lists one entry per live listing, dated by its settled bid", () => {
  const xml = productEntries([entry, { ...entry, listing: { ...entry.listing, hostname: "not a domain" } }]);
  assert.match(xml, /<loc>https:\/\/rankoff\.my\/product\/brandupdesignmarketing\.com<\/loc>/);
  assert.match(xml, /<lastmod>2026-08-31<\/lastmod>/);
  assert.equal(xml.match(/<url>/g).length, 1, "an unusable hostname must not reach the sitemap");
});

test("the record block shows only what the board itself recorded", () => {
  const record = { bid_count: 3, total_minor: 1500, first_settled_at: "2026-08-31T11:04:27.190Z", last_settled_at: "2026-09-02T04:00:00.000Z" };
  const html = renderProductPage(
    shell,
    buildProductView({ entry, todayEntry: null, board: { currency: "MYR" }, snapshotId: "", record }),
  );

  assert.match(html, /<span>First listed<\/span><strong>31 Aug 2026<\/strong>/);
  assert.match(html, /<span>Settled bids<\/span><strong>3<\/strong>/);
  assert.match(html, /<span>Last updated<\/span><strong>2 Sep 2026<\/strong>/);
  assert.equal(formatDate("not a date"), "");
});

test("a listing with no settled history renders no record block at all", () => {
  const html = renderProductPage(
    shell,
    buildProductView({ entry, todayEntry: null, board: { currency: "MYR" }, snapshotId: "", record: null }),
  );
  assert.match(html, /<ul class="listing-record" data-record hidden><\/ul>/);
});

test("the share image points at this listing's own resolver", () => {
  const html = renderProductPage(
    shell,
    buildProductView({ entry, todayEntry: null, board: { currency: "MYR" }, snapshotId: "", record: null }),
  );
  assert.match(html, /<meta property="og:image" content="https:\/\/rankoff\.my\/og\/brandupdesignmarketing\.com" \/>/);
  assert.match(html, /<meta name="twitter:image" content="https:\/\/rankoff\.my\/og\/brandupdesignmarketing\.com" \/>/);
  // The merchant's image is whatever size they publish, so a fixed one would lie.
  assert.ok(!html.includes("og:image:width"), "a hardcoded size must not survive");
  assert.ok(!html.includes("og:image:height"), "a hardcoded size must not survive");
});

test("share image discovery takes only an https image the page itself declares", async () => {
  const page = (body, url = "https://example.com/") => async () => ({ ok: true, url, text: async () => body });
  assert.equal(
    await discoverShareImage("https://example.com/", page('<meta property="og:image" content="/card.png">')),
    "https://example.com/card.png",
  );
  assert.equal(
    await discoverShareImage("https://example.com/", page('<meta name="twitter:image" content="https://cdn.example.com/a.jpg">')),
    "https://cdn.example.com/a.jpg",
  );
  assert.equal(
    await discoverShareImage("https://example.com/", page('<meta property="og:image" content="http://insecure.example/a.png">')),
    "",
    "an http image would break the page's https lock",
  );
  assert.equal(await discoverShareImage("https://example.com/", page("<p>no meta here</p>")), "");
  assert.equal(await discoverShareImage("https://example.com/", async () => ({ ok: false })), "");
});

test("a declared share image is only used when it really is an image", async () => {
  const reply = (status, contentType) => async () => ({
    ok: status < 400,
    status,
    headers: { get: () => contentType },
  });
  assert.equal(await verifyImage("https://example.com/a.png", reply(200, "image/png")), "https://example.com/a.png");
  assert.equal(await verifyImage("https://example.com/a.png", reply(206, "image/jpeg")), "https://example.com/a.png");
  assert.equal(await verifyImage("https://example.com/a.png", reply(200, "text/html; charset=utf-8")), "", "a 404 page is not a share image");
  assert.equal(await verifyImage("https://example.com/a.png", reply(404, "image/png")), "");
  assert.equal(await verifyImage(""), "");
  assert.equal(await verifyImage("https://example.com/a.png", async () => { throw new Error("network"); }), "");
});
