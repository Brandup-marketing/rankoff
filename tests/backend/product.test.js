import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildProductView, escapeHtml, formatMoney, normalizeSlug, productPath, renderProductPage } from "../../functions/_lib/product.js";
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
