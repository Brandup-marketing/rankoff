import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildProductView, canonicalDetailPath, escapeHtml, formatDate, formatMoney, normalizeProductLanguage, normalizeSlug, productPath, renderProductPage } from "../../functions/_lib/product.js";
import { renderDetail } from "../../functions/_lib/detail.js";
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
  assert.equal(canonicalDetailPath("instagram:agent_ali"), "/profile/instagram/agent_ali");
  assert.equal(canonicalDetailPath("instagram:not/valid"), "");
  assert.equal(canonicalDetailPath("not a domain"), "");
});

test("money follows the board currency", () => {
  assert.equal(formatMoney(500, "MYR"), "RM 5");
  assert.equal(formatMoney(1250, "USD"), "US$ 12.5");
  assert.equal(formatDate("2026-08-31T23:59:59.000Z", "zh"), "2026年8月31日");
  assert.equal(normalizeProductLanguage("zh-Hans"), "zh");
  assert.equal(normalizeProductLanguage("de"), "en");
});

test("the rendered page carries this listing's own title, description and canonical", () => {
  const view = buildProductView({ entry, todayEntry: entry, board: { currency: "MYR" }, snapshotId: "snap-1" });
  const html = renderProductPage(shell, view);

  assert.match(html, /<title>BrandUp Design Marketing — #1 on RANKOFF<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/rankoff\.my\/product\/brandupdesignmarketing\.com" \/>/);
  assert.match(html, /<meta property="og:title" content="BrandUp Design Marketing — #1 on RANKOFF" \/>/);
  assert.match(html, /<meta name="robots" content="index, follow, max-image-preview:large" \/>/);
  assert.match(html, /<meta property="og:url" content="https:\/\/rankoff\.my\/product\/brandupdesignmarketing\.com" \/>/);
  assert.equal(html.match(/<meta property="og:url"/g)?.length, 1, "a share crawler must see one authoritative URL");
  assert.match(html, /<meta name="twitter:card" content="summary_large_image" \/>/);
  assert.match(html, /"@type": ?"WebPage"/);
  assert.ok(!html.includes("Sponsored listing | RANKOFF"), "the generic shell title must be gone");
});

test("the generic listing shell is not an indexable empty result", () => {
  assert.match(shell, /<meta name="robots" content="noindex, follow" \/>/);
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
  const hydration = html.match(/<script id="listing-hydration" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(hydration, "the client must receive the exact record used for SSR");
  assert.deepEqual(JSON.parse(hydration[1]), {
    id: "listing-1",
    identity: "brandupdesignmarketing.com",
    title: "BrandUp Design Marketing",
    description: "AI-powered lead-generation infrastructure.",
    descriptionZh: "",
    url: "https://brandupdesignmarketing.com/",
    category: "Marketing",
    icon: "",
    rank: 1,
    bid: 5,
    clicks: 41,
    todayRank: null,
    todayBid: null,
    todayClicks: null,
    nextBid: null,
    marketRank: null,
    snapshot: "",
    mode: "production",
    currency: "MYR",
  });
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
  const hydration = html.match(/<script id="listing-hydration" type="application\/json">([\s\S]*?)<\/script>/)[1];
  assert.ok(!jsonLd.includes("<"), "structured data must not carry a raw < that could close the block");
  assert.ok(!hydration.includes("<"), "hydration data must not carry a raw < that could close the block");
  const markup = html.replace(jsonLd, "").replace(hydration, "");
  assert.ok(!markup.includes("<script>alert(1)</script>"), "script tags must not survive");
  assert.ok(!markup.includes("<img src=x"), "injected tags must not survive");
  assert.ok(!markup.includes("</title><script>"), "the title must not be closed early");
  // The payload still reads back, inert, as text rather than markup.
  assert.match(markup, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(markup, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.equal(escapeHtml('<b>&"'), "&lt;b&gt;&amp;&quot;");
});

test("the sitemap lists one entry per live listing, dated by its settled bid", () => {
  const xml = productEntries([
    entry,
    { ...entry, listing: { ...entry.listing, hostname: "instagram:agent_ali" } },
    { ...entry, listing: { ...entry.listing, hostname: "not a domain" } },
  ]);
  assert.match(xml, /<loc>https:\/\/rankoff\.my\/product\/brandupdesignmarketing\.com<\/loc>/);
  assert.match(xml, /<loc>https:\/\/rankoff\.my\/profile\/instagram\/agent_ali<\/loc>/);
  assert.match(xml, /hreflang="zh-Hans" href="https:\/\/rankoff\.my\/product\/brandupdesignmarketing\.com\?lang=zh"/);
  assert.match(xml, /<lastmod>2026-08-31<\/lastmod>/);
  assert.match(xml, /<loc>https:\/\/rankoff\.my\/profile\/instagram\/agent_ali\?lang=zh<\/loc>/);
  assert.equal(xml.match(/<url>/g).length, 4, "each usable identity needs separate English and Chinese URL entries");
});

test("the record block shows only what the board itself recorded", () => {
  const record = { bid_count: 3, total_minor: 1500, first_settled_at: "2026-08-31T11:04:27.190Z", last_settled_at: "2026-09-02T04:00:00.000Z" };
  const html = renderProductPage(
    shell,
    buildProductView({ entry, todayEntry: null, board: { currency: "MYR" }, snapshotId: "", record }),
  );

  assert.match(html, /data-record-key="firstListed"><span>First listed<\/span><strong data-record-date="2026-08-31T11:04:27.190Z">31 Aug 2026<\/strong>/);
  assert.match(html, /data-record-key="settledBids"><span>Payments<\/span><strong>3<\/strong>/);
  assert.match(html, /data-record-key="lastUpdated"><span>Last updated<\/span><strong data-record-date="2026-09-02T04:00:00.000Z">2 Sep 2026<\/strong>/);
  assert.equal(formatDate("not a date"), "");
});

test("an explicit Chinese product locale renders indexable Chinese metadata and true record dates", () => {
  const record = { bid_count: 3, first_settled_at: "2026-08-31T23:59:59.000Z", last_settled_at: "2026-09-02T04:00:00.000Z" };
  const view = buildProductView({
    entry: { ...entry, rank: 3 },
    todayEntry: null,
    board: { currency: "MYR" },
    snapshotId: "snap-zh",
    record,
    marketRank: 1,
    marketName: "Marketing & Advertising",
    language: "zh",
    nextBidMinor: 600,
  });
  const html = renderProductPage(shell, view);

  assert.equal(view.pageTitle, "BrandUp Design Marketing — 营销与广告第 1 名 | RANKOFF");
  assert.match(view.metaDescription, /RM 5 累计付款.*营销与广告第 1 名.*41 次追踪点击/);
  assert.equal(view.canonical, "https://rankoff.my/product/brandupdesignmarketing.com?lang=zh");
  assert.match(html, /<html lang="zh-Hans"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/rankoff\.my\/product\/brandupdesignmarketing\.com\?lang=zh"/);
  assert.match(html, /hreflang="en" href="https:\/\/rankoff\.my\/product\/brandupdesignmarketing\.com"/);
  assert.match(html, /hreflang="zh-Hans" href="https:\/\/rankoff\.my\/product\/brandupdesignmarketing\.com\?lang=zh"/);
  assert.match(html, /hreflang="x-default" href="https:\/\/rankoff\.my\/product\/brandupdesignmarketing\.com"/);
  assert.match(html, /<meta property="og:locale" content="zh_MY"/);
  assert.equal(html.match(/<meta property="og:url"/g)?.length, 1, "the Chinese page must not retain the generic shell URL");
  assert.match(html, /"inLanguage":"zh-Hans"/);
  assert.match(html, /alt="RANKOFF — 竞价登上第 1 名"/);
  assert.match(html, /data-category>营销与广告<\/span>/);
  assert.match(html, /data-rank-label>营销与广告排名<\/dt>/);
  assert.match(html, /data-rank-note>全站第 3 名<\/p>/);
  assert.match(html, /data-placement-label>已验证展示<\/span>/);
  assert.match(html, /data-click-label>追踪点击<\/dt>/);
  assert.match(html, /data-copy="sponsored">赞助<\/span>/);
  assert.match(html, /data-copy="share">分享排名<\/button>/);
  assert.match(html, /data-copy="evidence">公开排名记录<\/h2>/);
  assert.match(html, /data-evidence-note>排名与金额来自已结算的付款/);
  assert.match(html, /data-copy="allTimeBid">累计付款<\/dt>/);
  assert.match(html, /data-copy="startClaim">拿下此排名<\/span>/);
  assert.match(html, /data-next-bid>RM 6<\/strong>/);
  assert.match(html, /href="\/categories\?lang=zh"/);
  assert.match(html, /href="\/\?lang=zh#claim"/);
  assert.match(html, /data-record-key="firstListed"><span>首次上榜<\/span><strong data-record-date="2026-08-31T23:59:59.000Z">2026年8月31日<\/strong>/);
  assert.match(html, /data-record-key="settledBids"><span>付款次数<\/span><strong>3<\/strong>/);
  assert.match(html, /data-record-key="lastUpdated"><span>最近更新<\/span><strong data-record-date="2026-09-02T04:00:00.000Z">2026年9月2日<\/strong>/);
});

test("a localized missing detail keeps root assets and language headers", async () => {
  const response = await renderDetail({
    request: new Request("https://rankoff.my/profile/instagram/missing?lang=zh"),
    env: { RANKOFF_MODE: "demo", ASSETS: { fetch: async () => new Response(shell) } },
  }, "instagram:missing");
  const html = await response.text();

  assert.equal(response.status, 404);
  assert.equal(response.headers.get("content-language"), "zh-Hans");
  assert.ok(!html.includes('href="./'), "404 styles must resolve from the site root");
  assert.ok(!html.includes('src="./'), "404 scripts and images must resolve from the site root");
  assert.match(html, /alt="RANKOFF — 竞价登上第 1 名"/);
});

test("a Chinese social profile keeps its permanent profile URL and localized action", () => {
  const social = {
    ...entry,
    listing: {
      ...entry.listing,
      hostname: "instagram:agent_ali",
      url: "https://www.instagram.com/agent_ali/",
    },
  };
  const view = buildProductView({ entry: social, board: { currency: "MYR" }, language: "zh" });
  const html = renderProductPage(shell, view);
  assert.equal(view.canonical, "https://rankoff.my/profile/instagram/agent_ali?lang=zh");
  assert.match(html, /hreflang="en" href="https:\/\/rankoff\.my\/profile\/instagram\/agent_ali"/);
  assert.match(html, /<span data-copy="viewInstagram">查看 Instagram<\/span>/);
  assert.match(html, /"@type":"ProfilePage"/);
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
  assert.match(html, /<meta property="og:image" content="https:\/\/rankoff\.my\/og\/brandupdesignmarketing\.com\?currency=MYR" \/>/);
  assert.match(html, /<meta name="twitter:image" content="https:\/\/rankoff\.my\/og\/brandupdesignmarketing\.com\?currency=MYR" \/>/);
  // The merchant's image is whatever size they publish, so a fixed one would lie.
  assert.ok(!html.includes("og:image:width"), "a hardcoded size must not survive");
  assert.ok(!html.includes("og:image:height"), "a hardcoded size must not survive");
});

test("share image discovery reads the image a page declares, over https", async () => {
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
    "https://insecure.example/a.png",
    "a crawler will not load mixed content, so the same file is tried over https",
  );
  assert.equal(
    await discoverShareImage("https://example.com/", page('<meta property="og:image" content="ftp://example.com/a.png">')),
    "",
    "only the web protocols are worth trying",
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

test("a listing below the top of the board shares its market position instead", () => {
  const view = buildProductView({
    entry: {
      rank: 3,
      clicks: 0,
      bid: { amount_minor: 500 },
      listing: { id: "l3", hostname: "orientalwellness.my", title: "中华健康 Oriental Wellness", description: "Traditional massage and TCM.", category: "Beauty", url: "https://www.orientalwellness.my/" },
    },
    board: { currency: "MYR" },
    marketRank: 1,
    marketName: "Beauty & Wellness",
  });
  assert.equal(view.pageTitle, "中华健康 Oriental Wellness — #1 in Beauty & Wellness | RANKOFF");
  assert.match(view.metaDescription, /holds #1 in Beauty & Wellness on Rankoff/);
  assert.equal(view.initials, "中");
});

test("holding the top of the board keeps the bigger claim", () => {
  const view = buildProductView({
    entry: {
      rank: 1,
      clicks: 5,
      bid: { amount_minor: 1000 },
      listing: { id: "l1", hostname: "rakanjayahardware.com", title: "Rakan Jaya Hardware", description: "Industrial hardware supplier.", category: "Hardware", url: "https://rakanjayahardware.com/", favicon_url: "https://rakanjayahardware.com/logo.png" },
    },
    board: { currency: "MYR" },
    marketRank: 1,
    marketName: "Hardware & Construction",
  });
  assert.equal(view.pageTitle, "Rakan Jaya Hardware — #1 on RANKOFF");
  assert.equal(view.initials, "RJ");
  assert.match(renderProductPage(shell, view), /class="listing-mark has-icon"[^>]*>.*rakanjayahardware\.com\/logo\.png/s);
});

test("a market leader's page leads with the market, and still shows the whole board", () => {
  const view = buildProductView({
    entry: {
      rank: 4,
      clicks: 2,
      bid: { amount_minor: 500 },
      listing: { id: "l4", hostname: "uscpap.my", title: "USCPAP", description: "CPAP importer.", category: "Health", url: "https://uscpap.my/" },
    },
    board: { currency: "MYR" },
    marketRank: 1,
    marketName: "Health & Medical",
  });
  assert.equal(view.rankLabel, "Rank in Health & Medical");
  assert.equal(view.rankValue, "#1");
  assert.equal(view.rankNote, "#4 on the whole board");
  const html = renderProductPage(shell, view);
  assert.match(html, /<dt data-rank-label>Rank in Health &amp; Medical<\/dt>/);
  assert.match(html, /<dd data-rank>#1<\/dd>/);
  assert.match(html, /data-rank-note>#4 on the whole board<\/p>/);
});

test("holding the whole board needs no qualifier", () => {
  const view = buildProductView({
    entry: {
      rank: 1,
      clicks: 6,
      bid: { amount_minor: 1000 },
      listing: { id: "l1", hostname: "rakanjayahardware.com", title: "Rakan Jaya Hardware", description: "Hardware.", category: "Hardware", url: "https://rakanjayahardware.com/" },
    },
    board: { currency: "MYR" },
    marketRank: 1,
    marketName: "Hardware & Construction",
  });
  assert.equal(view.rankLabel, "Current rank");
  assert.equal(view.rankValue, "#1");
  assert.equal(view.rankNote, "");
  assert.match(renderProductPage(shell, view), /data-rank-note hidden><\/p>/);
});
