import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { localizeStaticPage, serveLocalizedAsset } from "../../functions/_lib/static-localization.js";
import { onRequestGet as renderAbout } from "../../functions/about.js";
import { onRequestGet as renderCategories } from "../../functions/categories.js";
import { renderBoard, renderRankingSchema } from "../../functions/index.js";

const homeShell = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
const categoryShell = readFileSync(new URL("../../categories.html", import.meta.url), "utf8");
const aboutShell = readFileSync(new URL("../../about.html", import.meta.url), "utf8");

test("the English static pages pass through unchanged", () => {
  assert.equal(localizeStaticPage(homeShell, "home", "en"), homeShell);
  assert.equal(localizeStaticPage(categoryShell, "categories", "en"), categoryShell);
  assert.equal(localizeStaticPage(aboutShell, "about", "en"), aboutShell);
  assert.match(homeShell, /"inLanguage": "en-MY"/);
});

test("the Chinese home page is indexable before JavaScript runs", () => {
  const html = localizeStaticPage(homeShell, "home", "zh");
  const schema = JSON.parse(html.match(/<script id="website-schema" type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);

  assert.match(html, /<html lang="zh-Hans"/);
  assert.match(html, /<title>RANKOFF｜付费排名榜，US\$1 起<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/rankoff\.my\/\?lang=zh" \/>/);
  assert.match(html, /<meta property="og:locale" content="zh_MY" \/>/);
  assert.match(html, /<meta property="og:locale:alternate" content="en_MY" \/>/);
  assert.match(html, /<h1 id="page-title"><strong data-hero-next-price>US\$ 1<\/strong>.*拿下.*data-hero-rank>第 1 名<\/span>.*<\/h1>/);
  assert.doesNotMatch(html, /class="(?:discovery-intro|claim-copy)"/);
  assert.match(html, /data-i18n-placeholder="searchPlaceholder"[^>]*placeholder="搜索商家和市场…"/);
  assert.match(html, /data-i18n-aria-label="rankingTimeframe"[^>]*aria-label="排名时间范围"/);
  assert.match(html, /data-entry-toggle-label>输入你的网站<\/span>/);
  assert.match(html, /data-share-heading>分享此排名<\/h2>/);
  assert.match(html, /href="\/categories\?lang=zh"/);
  assert.match(html, /href="\/\?lang=zh&amp;period=today#board"/);
  assert.equal(schema.url, "https://rankoff.my/?lang=zh");
  assert.equal(schema.inLanguage, "zh-Hans");
  assert.match(readFileSync(new URL("../../app.js", import.meta.url), "utf8"), /schema\.inLanguage = state\.language === "zh" \? "zh-Hans" : "en-MY"/);
});

test("server-rendered board links stay in the requested language", () => {
  const serverRenderedRows = [{ rank: 1, listing: { hostname: "instagram:agent_ali", title: "Ali Property KL", category: "Property" }, bid: { amount_minor: 500 }, clicks: 4 }];
  assert.match(renderBoard(serverRenderedRows, "MYR", "zh"), /href="\/profile\/instagram\/agent_ali\?lang=zh"/);
  assert.match(renderBoard(serverRenderedRows, "MYR", "en"), /href="\/profile\/instagram\/agent_ali"/);
  assert.doesNotMatch(renderBoard(serverRenderedRows, "MYR", "en"), /\?lang=zh/);
  const html = localizeStaticPage(
    homeShell.replace(
      '<div class="board-list" data-board-list aria-live="polite" data-i18n-aria-label="boardListings" aria-label="Sponsored listings"></div>',
      `<div class="board-list" data-board-list aria-live="polite" data-i18n-aria-label="boardListings" aria-label="Sponsored listings">${renderBoard(serverRenderedRows, "MYR", "zh")}</div>`,
    ),
    "home",
    "zh",
  );
  assert.match(html, /data-english-copy="Sponsored · Property &amp; Agents · RM 5 paid · 4 tracked clicks"/);
  assert.match(html, />广告 · 房产与经纪 · 已付 RM 5 · 4 次追踪点击<\/span>/);
  assert.doesNotMatch(html, /&amp;amp;/);
});

test("the ranking is declared as an ItemList that matches the rendered rows", () => {
  const rankings = [
    { rank: 1, listing: { hostname: "instagram:agent_ali", title: "Ali Property KL", category: "Property" }, bid: { amount_minor: 500 }, clicks: 4 },
    { rank: 2, listing: { hostname: "rakanjayahardware.com", title: "Rakan Jaya Hardware", category: "Construction" }, bid: { amount_minor: 300 }, clicks: 9 },
  ];
  const parse = (markup) => JSON.parse(markup.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "").replaceAll("\\u003c", "<"));

  const en = parse(renderRankingSchema(rankings, "https://rankoff.my", "en"));
  assert.equal(en["@type"], "ItemList");
  assert.equal(en.numberOfItems, 2);
  assert.deepEqual(en.itemListElement.map((i) => i.position), [1, 2]);
  assert.deepEqual(en.itemListElement.map((i) => i.name), ["Ali Property KL", "Rakan Jaya Hardware"]);

  // The structured data must point where the crawler-facing rows point, or the
  // two descriptions of the same board disagree.
  const rows = renderBoard(rankings, "MYR", "en");
  for (const item of en.itemListElement) {
    assert.match(rows, new RegExp(`href="${item.url.replace("https://rankoff.my", "")}"`));
  }

  const zh = parse(renderRankingSchema(rankings, "https://rankoff.my", "zh"));
  assert.equal(zh.url, "https://rankoff.my/?lang=zh");
  for (const item of zh.itemListElement) assert.match(item.url, /\?lang=zh$/);

  // An empty board must not claim to be a ranking of nothing.
  assert.equal(renderRankingSchema([], "https://rankoff.my", "en"), "");
});

test("search results keep native link navigation semantics", () => {
  assert.doesNotMatch(homeShell, /role="listbox"/);
  assert.doesNotMatch(categoryShell, /role="listbox"/);
  assert.doesNotMatch(readFileSync(new URL("../../search.js", import.meta.url), "utf8"), /setAttribute\("role", "option"\)/);
});

test("the Chinese category page has localized metadata, controls and loading truth", () => {
  const html = localizeStaticPage(categoryShell, "categories", "zh");

  assert.match(html, /<title>RANKOFF｜分类<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/rankoff\.my\/categories\?lang=zh" \/>/);
  assert.match(html, /data-copy="heroCopy">每个市场都有自己的榜单/);
  assert.match(html, /aria-label="榜单状态"/);
  assert.match(html, /data-category-status>实时榜单<\/strong>/);
  assert.match(html, /data-category-count>正在载入…<\/span>/);
  assert.match(html, /placeholder="搜索商家和市场…"/);
  assert.match(html, /href="\/\?lang=zh&amp;category=Property#board">房产与经纪<\/a>/);
  assert.doesNotMatch(html, /data-category-count>0 listings<\/span>/);
});

test("the Chinese about page has no English-only story shell", () => {
  const html = localizeStaticPage(aboutShell, "about", "zh");

  assert.match(html, /<title>关于 RANKOFF<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/rankoff\.my\/about\?lang=zh" \/>/);
  assert.match(html, /<span class="hero-line">注意力，明码标价。<\/span>/);
  assert.match(html, /<h2>Rankoff 始于一个问题。<\/h2>/);
  assert.match(html, /aria-label="Rankoff 原则"/);
  assert.doesNotMatch(html, />Attention has a price\.</);
  assert.doesNotMatch(html, />The board keeps moving\.</);
});

test("the extensionless page handlers serve the requested language", async () => {
  const assetContext = (pathname, source) => ({
    request: new Request(`https://rankoff.my${pathname}?lang=zh`),
    env: { ASSETS: { fetch: async () => new Response(source, { status: 200 }) } },
    next: () => new Response("fallback", { status: 404 }),
  });
  const aboutResponse = await renderAbout(assetContext("/about", aboutShell));
  const categoriesResponse = await renderCategories(assetContext("/categories", categoryShell));

  assert.equal(aboutResponse.status, 200);
  assert.equal(aboutResponse.headers.get("content-language"), "zh-Hans");
  assert.match(await aboutResponse.text(), /关于 RANKOFF/);
  assert.equal(categoriesResponse.status, 200);
  assert.equal(categoriesResponse.headers.get("content-language"), "zh-Hans");
  assert.match(await categoriesResponse.text(), /浏览市场/);
});

test("a missing asset falls through instead of returning an empty localized page", async () => {
  const response = await serveLocalizedAsset({
    request: new Request("https://rankoff.my/about?lang=zh"),
    env: { ASSETS: { fetch: async () => new Response("missing", { status: 404 }) } },
    next: () => new Response("fallback", { status: 418 }),
  }, "/about.html", "about");

  assert.equal(response.status, 418);
  assert.equal(await response.text(), "fallback");
});
