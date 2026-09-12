import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { businessFactsFor } from "../../functions/_lib/business-facts.js";
import { buildProductView, renderProductPage } from "../../functions/_lib/product.js";
import { productEntries } from "../../functions/sitemap.xml.js";

const shell = readFileSync(new URL("../../listing.html", import.meta.url), "utf8");
const entry = { rank: 3, clicks: 8, bid: { amount_minor: 500, settled_at: "2026-09-01T00:00:00Z" }, listing: { id: "profile-test", hostname: "brandupdesignmarketing.com", title: "BrandUp Design Marketing", description: "Saved description", category: "Marketing", url: "https://brandupdesignmarketing.com/" } };
const render = (options = {}) => renderProductPage(shell, buildProductView({ entry, board: { currency: "MYR" }, businessFacts: businessFactsFor(entry.listing.hostname), ...options }));
const schema = (html) => JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);

test("business facts and sources are readable without JavaScript and agree with structured data", () => {
  for (const language of ["en", "zh"]) {
    const facts = businessFactsFor(entry.listing.hostname);
    const html = render({ language });
    const data = schema(html);
    assert.equal(data.mainEntity["@type"], "Organization");
    assert.equal(data.mainEntity.description, facts.summary[language]);
    assert.deepEqual(data.mainEntity.areaServed, facts.areas[language]);
    assert.equal(data.citation, facts.source);
    assert.ok(html.includes(facts.summary[language]));
    assert.ok(html.includes(facts.services[language][2]));
    assert.match(html, /<time datetime="2026-09-12">2026-09-12<\/time>/);
    assert.match(html, /rel="sponsored nofollow noopener noreferrer"/);
    assert.ok(!JSON.stringify(data).includes("aggregateRating"));
    assert.ok(!JSON.stringify(data).includes("dateModified"), "source check is not a claim that the business changed");
    const model = JSON.parse(html.match(/id="listing-hydration" type="application\/json">(.*?)<\/script>/s)[1]);
    assert.equal(model.descriptionEn, facts.summary.en);
    assert.equal(model.descriptionZh, facts.summary.zh);
  }
});

test("unknown social listings keep saved bios without invented businesses, services, locations or review dates", () => {
  assert.equal(businessFactsFor("instagram:new_creator"), null);
  const html = render({ businessFacts: null, entry: { ...entry, listing: { ...entry.listing, hostname: "instagram:new_creator", title: "New creator", url: "https://www.instagram.com/new_creator", description: "My original bio" } } });
  const data = schema(html);
  assert.equal(data.mainEntity["@type"], "Thing");
  assert.equal(data.mainEntity.description, "My original bio");
  assert.equal(data.mainEntity.areaServed, undefined);
  assert.equal(data.citation, undefined);
  assert.ok(!html.includes('<time datetime='));
  assert.match(html, /Description saved with this listing/);
  assert.ok(!html.includes('data-business-en="Services &amp; products"'));
});

test("business content escapes HTML and rejects executable source URLs", () => {
  const facts = businessFactsFor(entry.listing.hostname);
  facts.source = 'javascript:alert(1)';
  facts.services.en = ['</dd><script>alert(1)</script>'];
  const html = render({ businessFacts: facts });
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(!html.includes('</dd><script>alert(1)</script>'));
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test("sitemap uses the later of the payment and actual editorial review dates", () => {
  assert.match(productEntries([entry]), /<lastmod>2026-09-12<\/lastmod>/);
  assert.match(productEntries([{ ...entry, bid: { settled_at: "2026-09-15T01:00:00Z" } }]), /<lastmod>2026-09-15<\/lastmod>/);
});
