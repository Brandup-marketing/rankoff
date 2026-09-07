import { currencyNotice } from "../../currency.js";
// Server-rendered listing pages. The board decides the numbers; this file only
// formats them into the shell that /listing already ships, so a crawler, a
// WhatsApp preview and a reader without JavaScript all see the same record.

import { destinationAction, displayName, identityParts, isUsableHandle, profilePath } from "./platform.js";
export const SITE_ORIGIN = "https://rankoff.my";

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

const PRODUCT_COPY = Object.freeze({
  en: Object.freeze({
    skipListing: "Skip to listing details", categories: "Categories", about: "About", back: "← Back to leaderboard",
    loading: "Loading ranking details…", notFoundTitle: "Listing not found", notFoundCopy: "This listing may have moved or is no longer on the public board.", returnBoard: "Return to the board",
    sponsored: "Sponsored", share: "Share rank", evidence: "Public ranking record", allTimeBid: "All-time total", past24: "Past 24h", past24Bid: "Past 24h total",
    board: "Board", rule: "Highest total takes #1", claimNumberOne: "Claim #1 for", startClaim: "Claim this rank", footerParent: "A Brandup Marketing product",
    claimUrl: "Your website or public profile", claimAmount: "Your payment", claimAgree: "I understand this is a paid sponsored placement for a public link. It gives me no rights over that account, and the listed party may request removal. I agree to the ", termsOfService: "Terms of Service", claimAgreeSuffix: ".", payClaim: "Pay & claim #1",
    rules: "Rules", terms: "Terms", privacy: "Privacy", payments: "Payments", verifiedData: "Live data", past24Clicks: "Past 24h clicks",
    verifiedEvidence: "Rank and total come from settled payments. Clicks are redirects recorded by Rankoff; repeats and automated traffic are not filtered, so a click is not a unique visitor, enquiry or sale.",
    claimCopy: "Put your business above this one. Your full description stays on the board until someone pays more.",
    liveDisclosure: "Payment is confirmed only after secure hosted checkout settles.",
    currentRank: "Current rank",
    firstListed: "First listed",
    settledBids: "Payments",
    lastUpdated: "Last updated",
    verifiedPlacement: "Verified placement",
    verifiedClicks: "Tracked clicks",
  }),
  zh: Object.freeze({
    skipListing: "跳至条目详情", categories: "分类", about: "关于", back: "← 返回榜单",
    loading: "正在加载排名信息…", notFoundTitle: "找不到此条目", notFoundCopy: "此条目可能已移动，或已不在公开榜单中。", returnBoard: "返回榜单",
    sponsored: "赞助", share: "分享排名", evidence: "公开排名记录", allTimeBid: "累计付款", past24: "近 24 小时", past24Bid: "近 24 小时付款",
    board: "榜单", rule: "累计付款最高者第 1 名", claimNumberOne: "拿下第 1 名，只需", startClaim: "拿下此排名", footerParent: "Brandup Marketing 旗下产品",
    claimUrl: "你的网站或公开主页", claimAmount: "付款金额", claimAgree: "我了解这是针对公开链接的付费赞助展示，不赋予我对该账号的任何权利，被列出的一方可要求移除。我同意", termsOfService: "《服务条款》", claimAgreeSuffix: "。", payClaim: "付款并拿下第 1 名",
    rules: "规则", terms: "条款", privacy: "隐私", payments: "付款", verifiedData: "实时数据", past24Clicks: "近 24 小时点击",
    verifiedEvidence: "排名与金额来自已结算的付款。点击是 Rankoff 记录的跳转次数；重复与自动化流量未过滤，所以一次点击不等于一位访客、一条询问或一笔成交。",
    claimCopy: "把你的生意排在这家之上。完整介绍会一直留在榜单上，直到有人付得更多。",
    liveDisclosure: "付款会在安全的托管付款页面完成并确认。",
    currentRank: "当前排名",
    firstListed: "首次上榜",
    settledBids: "付款次数",
    lastUpdated: "最近更新",
    verifiedPlacement: "已验证展示",
    verifiedClicks: "追踪点击",
  }),
});

const PRODUCT_MARKET_TRANSLATIONS = Object.freeze({
  "AI Tools & Agents": "AI 工具与智能体",
  "Creators & Talent": "创作者与艺人",
  "Property & Agents": "房产与经纪",
  "Interior & Renovation": "室内设计与装修",
  "Beauty & Wellness": "美容与养生",
  "Health & Medical": "健康与医疗",
  "Sports & Fitness": "运动与健身",
  "Food & Beverage": "餐饮",
  "Marketing & Advertising": "营销与广告",
  "Creative & Production": "创意与制作",
  "Professional Services": "专业服务",
  "Education & Training": "教育与培训",
  "Finance & Insurance": "金融与保险",
  "Electronics & Repair": "电子与维修",
  "Retail & Ecommerce": "零售与电商",
  "Hardware & Construction": "五金与建筑",
  "Home Services": "家居服务",
  Automotive: "汽车",
  Other: "其他",
});

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

// Hostnames only: the slug is the merchant's domain, never a path or a query.
export function normalizeSlug(value) {
  const slug = String(value ?? "").trim().toLowerCase().replace(/\.$/, "");
  if (!slug || slug.length > 253) return "";
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(slug)) return "";
  return slug;
}

export function productPath(hostname) {
  return `/product/${normalizeSlug(hostname)}`;
}

export function canonicalDetailPath(identity) {
  const parts = identityParts(identity);
  if (parts.platform) {
    return isUsableHandle(parts.handle)
      ? profilePath(`${parts.platform}:${parts.handle}`)
      : "";
  }
  const hostname = normalizeSlug(parts.hostname);
  return hostname ? productPath(hostname) : "";
}

export function formatMoney(amountMinor, currency) {
  const amount = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(amountMinor || 0) / 100);
  return currency === "MYR" ? `RM ${amount}` : `${currency === "USD" ? "US$" : currency} ${amount}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function normalizeProductLanguage(value) {
  return String(value || "").toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function formatDate(value, language = "en") {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return "";
  if (normalizeProductLanguage(language) === "zh") {
    return `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
  }
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

// Only facts the board itself produced. Nothing here is inferred about the merchant.
export function recordFacts(record, language = "en") {
  const locale = normalizeProductLanguage(language);
  const copy = PRODUCT_COPY[locale];
  const facts = [];
  const firstListed = formatDate(record?.first_settled_at, locale);
  const lastUpdated = formatDate(record?.last_settled_at, locale);
  const bidCount = Number(record?.bid_count || 0);
  if (firstListed) facts.push({ key: "firstListed", label: copy.firstListed, value: firstListed, date: String(record.first_settled_at) });
  if (bidCount > 0) facts.push({ key: "settledBids", label: copy.settledBids, value: String(bidCount) });
  if (lastUpdated) facts.push({ key: "lastUpdated", label: copy.lastUpdated, value: lastUpdated, date: String(record.last_settled_at) });
  return facts;
}

export const ACTION_LABELS = Object.freeze({
  visit: "Visit website",
  viewInstagram: "View Instagram",
  viewFacebook: "View Facebook Page",
  viewTiktok: "View TikTok",
  viewProfile: "View profile",
});

const ACTION_LABELS_ZH = Object.freeze({
  visit: "访问网站",
  viewInstagram: "查看 Instagram",
  viewFacebook: "查看 Facebook 专页",
  viewTiktok: "查看 TikTok",
  viewProfile: "查看主页",
});

// The colour behind those letters. Seeded from the listing's identity so an
// account keeps the same tile on the board, on its own page and on the rank
// card, and so two listings side by side are rarely the same colour. Only a hue
// is produced; the stylesheet fixes lightness and chroma per theme, so contrast
// cannot depend on which number comes out. Mirrored in app.js, listing.js,
// categories.js and share-card.js — a test asserts they agree.
export function markHue(seed) {
  const value = String(seed || "");
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 360;
  }
  return hash;
}

// The mark falls back to letters when a merchant publishes no logo. A CJK name
// gets one character; a latin one gets its initials.
export function initialsFor(title, fallback) {
  const source = String(title || fallback || "").trim();
  if (!source) return "R";
  if (/[\u3400-\u9fff]/.test(source)) return (source.match(/[\u3400-\u9fff]/) || ["R"])[0];
  const words = source.replace(/[^A-Za-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  if (!words.length) return source.slice(0, 1).toUpperCase();
  return (words[0][0] + (words[1]?.[0] || "")).toUpperCase();
}

function clamp(text, limit) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  return value.length > limit ? `${value.slice(0, limit - 1).trimEnd()}…` : value;
}

export function buildProductView({ entry, todayEntry, board, snapshotId, record, marketRank = null, marketName = "", language = "en", nextBidMinor = null }) {
  const listing = entry.listing || {};
  const locale = normalizeProductLanguage(language);
  const copy = PRODUCT_COPY[locale];
  const identity = String(listing.hostname || "");
  const parts = identityParts(identity);
  const label = displayName(identity);
  const currency = String(board?.currency || "USD").toUpperCase();
  const bidAmount = Number(entry.bid?.amount_minor || 0) / 100;
  const todayBidAmount = todayEntry ? Number(todayEntry.bid?.amount_minor || 0) / 100 : null;
  const nextBidAmount = nextBidMinor !== null && Number.isFinite(Number(nextBidMinor))
    ? Math.ceil(Number(nextBidMinor) / 100)
    : null;
  const bid = formatMoney(entry.bid?.amount_minor, currency);
  const clicks = Number(entry.clicks || 0);
  const title = String(listing.title || label);
  const description = String(listing.description || "");
  const rank = Number(entry.rank);
  const useMarket = Boolean(marketRank && marketName) && marketRank < rank;
  const localizedMarketName = locale === "zh" ? (PRODUCT_MARKET_TRANSLATIONS[marketName] || marketName) : marketName;
  const headline = locale === "zh"
    ? (useMarket ? `${localizedMarketName}第 ${marketRank} 名 | RANKOFF` : `RANKOFF 第 ${rank} 名`)
    : (useMarket ? `#${marketRank} in ${marketName} | RANKOFF` : `#${rank} on RANKOFF`);
  const position = locale === "zh"
    ? (useMarket ? `${localizedMarketName}第 ${marketRank} 名` : `全站第 ${rank} 名`)
    : (useMarket ? `#${marketRank} in ${marketName}` : `#${rank}`);
  const action = destinationAction(identity);
  const canonicalBase = `${SITE_ORIGIN}${canonicalDetailPath(identity)}`;

  return {
    id: String(listing.id || ""),
    identity,
    platform: parts.platform,
    action,
    hostname: label,
    // A platform profile hides its picture from crawlers, so only a website can
    // hand us a share image of its own.
    shareImage: parts.platform
      ? `${SITE_ORIGIN}/assets/rankoff-og-card.png`
      : `${SITE_ORIGIN}/og/${parts.hostname}?currency=${encodeURIComponent(currency)}`,
    title,
    description,
    category: String(listing.category || "Other"),
    destination: String(listing.url || ""),
    language: locale,
    canonicalBase,
    canonical: locale === "zh" ? `${canonicalBase}?lang=zh` : canonicalBase,
    rank,
    bid,
    bidAmount,
    currency,
    currencyConversion: board?.currency_conversion || null,
    clicks,
    todayRank: todayEntry ? Number(todayEntry.rank) : null,
    todayBid: todayEntry ? formatMoney(todayEntry.bid?.amount_minor, currency) : null,
    todayBidAmount,
    todayClicks: todayEntry ? Number(todayEntry.clicks || 0) : null,
    nextBid: nextBidMinor !== null && Number.isFinite(Number(nextBidMinor)) ? formatMoney(nextBidMinor, currency) : "",
    nextBidAmount,
    snapshotId: snapshotId || "",
    facts: recordFacts(record, locale),
    marketRank,
    marketName: localizedMarketName,
    // Same frame the title uses, so the page and its own headline agree.
    rankLabel: useMarket
      ? (locale === "zh" ? `${localizedMarketName}排名` : `Rank in ${marketName}`)
      : copy.currentRank,
    rankValue: useMarket ? `#${marketRank}` : `#${rank}`,
    rankNote: useMarket ? (locale === "zh" ? `全站第 ${rank} 名` : `#${rank} on the whole board`) : "",
    placementLabel: copy.verifiedPlacement,
    clickLabel: copy.verifiedClicks,
    actionLabel: locale === "zh" ? (ACTION_LABELS_ZH[action] || ACTION_LABELS_ZH.visit) : (ACTION_LABELS[action] || ACTION_LABELS.visit),
    logo: String(listing.favicon_url || ""),
    initials: initialsFor(title, label),
    markHue: markHue(listing.hostname || label),
    // Both positions are true; a merchant shares the one worth sharing. #3 of a
    // young board says nothing, #1 of a market says something — and once the
    // board is large the overall number wins this comparison on its own.
    pageTitle: `${title} — ${headline}`,
    metaDescription: clamp(locale === "zh"
      ? `${title}以 ${bid}${board?.currency_conversion?.length ? " 等值" : ""} 累计付款位列 Rankoff ${position}，获得 ${clicks} 次追踪点击。`
      : `${title} holds ${position} on Rankoff with ${bid}${board?.currency_conversion?.length ? " equivalent" : ""} paid and ${clicks} tracked clicks. ${description}`,
    200),
  };
}

function replaceTag(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, () => replacement) : html;
}

function replaceDataCopy(html, key, value) {
  const pattern = new RegExp(`(<([a-z][a-z0-9-]*)\\b[^>]*\\bdata-copy="${key}"[^>]*>)[\\s\\S]*?(<\\/\\2>)`, "gi");
  return html.replace(pattern, (match, open, tag, close) => `${open}${escapeHtml(value)}${close}`);
}

export function localizeProductShell(shell, language = "en") {
  const locale = normalizeProductLanguage(language);
  const copy = PRODUCT_COPY[locale];
  let html = String(shell).replace(/<html lang="[^"]*"/, `<html lang="${locale === "zh" ? "zh-Hans" : "en"}"`);
  for (const [key, value] of Object.entries(copy)) html = replaceDataCopy(html, key, value);
  if (locale !== "zh") return html;
  html = html.replace(/aria-label="RANKOFF home"/g, 'aria-label="RANKOFF 首页"');
  html = html.replace(/alt="RANKOFF — Bid your way to number one"/g, 'alt="RANKOFF — 竞价登上第 1 名"');
  html = html.replace(/aria-label="Main navigation"/g, 'aria-label="主导航"');
  html = html.replace(/aria-label="Search businesses and markets"/g, 'aria-label="搜索商家和市场"');
  html = html.replace(/(<button class="language-toggle"[^>]*>)[\s\S]*?(<\/button>)/, "$1EN$2");
  html = html.replace(/(<button class="theme-toggle"[^>]*aria-label=")[^"]*("[^>]*>)[\s\S]*?(<\/button>)/, "$1切换至浅色主题$2浅色$3");
  html = html.replace(/href="\/categories"/g, 'href="/categories?lang=zh"');
  html = html.replace(/href="\/about"/g, 'href="/about?lang=zh"');
  html = html.replace(/href="\/"/g, 'href="/?lang=zh"');
  html = html.replace(/href="\/#claim"/g, 'href="/?lang=zh#claim"');
  html = html.replace(/placeholder="example\.com or instagram\.com\/yourname"/g, 'placeholder="example.com 或 instagram.com/yourname"');
  return html;
}

export function renderProductPage(shell, view) {
  const title = escapeHtml(view.pageTitle);
  const notice = currencyNotice(view.currencyConversion, view.language);
  if (notice) shell = shell.replace('<p class="currency-note" data-currency-note hidden></p>', `<p class="currency-note" data-currency-note>${escapeHtml(notice)}</p>`);
  const description = escapeHtml(view.metaDescription);
  const canonical = escapeHtml(view.canonical);
  const canonicalBase = escapeHtml(view.canonicalBase || view.canonical);
  const chineseCanonical = escapeHtml(`${view.canonicalBase || view.canonical}?lang=zh`);
  const subject = { "@type": "Thing", name: view.title, url: view.destination };
  if (view.platform) subject.alternateName = view.hostname;
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    // A social account's page is a profile page; a website's listing is not.
    "@type": view.platform ? "ProfilePage" : "WebPage",
    name: view.pageTitle,
    url: view.canonical,
    description: view.metaDescription,
    inLanguage: view.language === "zh" ? "zh-Hans" : "en-MY",
    isPartOf: { "@type": "WebSite", name: "RANKOFF", url: `${SITE_ORIGIN}/` },
    ...(view.platform ? { mainEntity: subject } : { about: subject }),
  }).replace(/</g, "\\u003c");
  // Hydrate from the exact record that produced the HTML. Refetching page one of
  // the board could lose a lower-ranked listing or replace correct SSR content
  // during a transient API failure.
  const hydrationJson = JSON.stringify({
    id: view.id,
    identity: view.identity,
    title: view.title,
    description: view.description,
    descriptionZh: "",
    url: view.destination,
    category: view.category,
    icon: view.logo,
    rank: view.rank,
    bid: view.bidAmount,
    clicks: view.clicks,
    todayRank: view.todayRank,
    todayBid: view.todayBidAmount,
    todayClicks: view.todayClicks,
    nextBid: view.nextBidAmount,
    marketRank: view.marketRank,
    snapshot: view.snapshotId,
    mode: "production",
    currency: view.currency,
  }).replace(/</g, "\\u003c");

  // The shell lives at /listing and links its assets relatively; one level deeper
  // at /product/<hostname> those would resolve to /product/styles.css.
  let html = localizeProductShell(shell.replace(/(href|src)="\.\//g, '$1="/'), view.language);
  html = replaceTag(html, /<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  html = replaceTag(html, /<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${description}" />`);
  html = replaceTag(html, /<meta name="robots" content="[^"]*"\s*\/>/, '<meta name="robots" content="index, follow, max-image-preview:large" />');
  html = replaceTag(html, /<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${canonical}" />`);
  html = replaceTag(html, /<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${title}" />`);
  html = replaceTag(html, /<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${description}" />`);
  html = replaceTag(html, /<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${canonical}" />`);
  html = replaceTag(html, /<meta name="twitter:title" content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${title}" />`);
  html = replaceTag(html, /<meta name="twitter:description" content="[^"]*"\s*\/>/, `<meta name="twitter:description" content="${description}" />`);
  // The merchant's own share image when they publish one; /og resolves it and
  // falls back to the Rankoff card. Its size is theirs, so the shell's fixed
  // 1200x630 declaration has to go with it.
  html = replaceTag(
    html,
    /<meta property="og:image" content="[^"]*"\s*\/>/,
    `<meta property="og:image" content="${escapeHtml(view.shareImage)}" />`,
  );
  html = replaceTag(
    html,
    /<meta name="twitter:image" content="[^"]*"\s*\/>/,
    `<meta name="twitter:image" content="${escapeHtml(view.shareImage)}" />`,
  );
  html = html.replace(/\s*<meta property="og:image:(?:width|height)" content="[^"]*"\s*\/>/g, "");
  html = html.replace(/\s*<link rel="alternate" hreflang="[^"]+" href="[^"]*"\s*\/>/g, "");
  html = html.replace(/\s*<meta property="og:locale(?::alternate)?" content="[^"]*"\s*\/>/g, "");
  html = html.replace(/\s*<meta name="twitter:(?:card|title|description|image)" content="[^"]*"\s*\/>/g, "");
  html = html.replace(
    "</head>",
    `  <link rel="alternate" hreflang="en" href="${canonicalBase}" />\n`
      + `    <link rel="alternate" hreflang="zh-Hans" href="${chineseCanonical}" />\n`
      + `    <link rel="alternate" hreflang="x-default" href="${canonicalBase}" />\n`
      + `    <meta property="og:locale" content="${view.language === "zh" ? "zh_MY" : "en_MY"}" />\n`
      + `    <meta property="og:locale:alternate" content="${view.language === "zh" ? "en_MY" : "zh_MY"}" />\n`
      + `    <meta name="twitter:card" content="summary_large_image" />\n`
      + `    <meta name="twitter:title" content="${title}" />\n`
      + `    <meta name="twitter:description" content="${description}" />\n`
      + `    <meta name="twitter:image" content="${escapeHtml(view.shareImage)}" />\n`
      + `    <script type="application/ld+json">${jsonLd}</script>\n`
      + `  </head>`,
  );

  // "Visit website" is wrong for a profile; the button says where it actually goes.
  html = html.replace(
    /<span data-copy="visit">[\s\S]*?<\/span>/,
    `<span data-copy="${escapeHtml(view.action)}">${escapeHtml(view.actionLabel || ACTION_LABELS[view.action] || ACTION_LABELS.visit)}</span>`,
  );

  // The shell hydrates from the board API; hand it the listing it is standing on.
  html = html.replace(/<body(\s[^>]*)?>/, (match, attributes) => `<body${attributes || ""} data-listing-id="${escapeHtml(view.id)}">`);

  // Content a crawler can read without running the page's JavaScript.
  html = html.replace(/(<div class="listing-loading" data-loading)>/, "$1 hidden>");
  html = html.replace(/(<div class="listing-content" data-content)\s+hidden>/, "$1>");
  html = html.replace(/(<section id="listing-detail"[^>]*)aria-busy="true"/, '$1aria-busy="false"');
  // Their logo, on the page they are being asked to send to people. Without this
  // the shell ships a hardcoded "R" until the page's JavaScript replaces it.
  const markInner = `<span data-initials>${escapeHtml(view.initials)}</span>`
    + (view.logo
      ? `<img src="${escapeHtml(view.logo)}" alt="" referrerpolicy="no-referrer" decoding="async" />`
      : "");
  html = html.replace(
    /<span class="listing-mark" data-mark aria-hidden="true">[\s\S]*?<\/span>\s*<\/span>/,
    `<span class="listing-mark${view.logo ? " has-icon" : ""}" data-mark aria-hidden="true" style="--mark-hue:${Number(view.markHue) || 0}">${markInner}</span>`,
  );
  html = html.replace(/(<h1 data-title)>[\s\S]*?<\/h1>/, `$1>${escapeHtml(view.title)}</h1>`);
  html = html.replace(/(<p class="listing-host" data-host)>[\s\S]*?<\/p>/, `$1>${escapeHtml(view.hostname)}</p>`);
  html = html.replace(/(<p class="listing-story" data-description)>[\s\S]*?<\/p>/, `$1>${escapeHtml(view.description)}</p>`);
  html = html.replace(/(<span data-category)>[\s\S]*?<\/span>/, `$1>${escapeHtml(view.marketName || view.category)}</span>`);
  html = html.replace(/(<dt data-rank-label)>[\s\S]*?<\/dt>/, `$1>${escapeHtml(view.rankLabel)}</dt>`);
  html = html.replace(/(<dd data-rank)>[\s\S]*?<\/dd>/, `$1>${escapeHtml(view.rankValue)}</dd>`);
  html = html.replace(
    /(<span class="verified-chip" data-placement-label>)[\s\S]*?<\/span>/,
`$1${escapeHtml(view.placementLabel || PRODUCT_COPY.en.verifiedPlacement)}</span>`,
  );
  html = html.replace(
    /(<p[^>]*data-evidence-note[^>]*>)[\s\S]*?<\/p>/,
    `$1${escapeHtml(PRODUCT_COPY[view.language].verifiedEvidence)}</p>`,
  );
  html = html.replace(
    /(<span class="evidence-status[^>]*data-mode>)[\s\S]*?<\/span>/,
    `$1${escapeHtml(PRODUCT_COPY[view.language].verifiedData)}</span>`,
  );
  html = html.replace(
    /(<p data-claim-copy>)[\s\S]*?<\/p>/,
    `$1${escapeHtml(PRODUCT_COPY[view.language].claimCopy)}</p>`,
  );
  html = html.replace(
    /(<p class="claim-disclosure" data-claim-disclosure>)[\s\S]*?<\/p>/,
    `$1${escapeHtml(PRODUCT_COPY[view.language].liveDisclosure)}</p>`,
  );
  if (view.rankNote) {
    html = html.replace(
      /<p class="evidence-qualifier" data-rank-note hidden><\/p>/,
      `<p class="evidence-qualifier" data-rank-note>${escapeHtml(view.rankNote)}</p>`,
    );
  }
  html = html.replace(/(<dd data-bid)>[\s\S]*?<\/dd>/, `$1>${escapeHtml(view.bid)}</dd>`);
  // The shell ships the preview wording, "Referral clicks". Writing the count
  // without its label left every crawler and no-JS reader with the unverified
  // word beside a verified figure.
  html = html.replace(/(<dd data-clicks)>[\s\S]*?<\/dd>/, `$1>${escapeHtml(view.clicks)}</dd>`);
  html = html.replace(
    /(<dt data-click-label>)[\s\S]*?<\/dt>/,
    `$1${escapeHtml(view.clickLabel || PRODUCT_COPY.en.verifiedClicks)}</dt>`,
  );
  html = html.replace(
    /(<span data-click-label-today>)[\s\S]*?<\/span>/,
    `$1${escapeHtml(PRODUCT_COPY[view.language].past24Clicks)}</span>`,
  );
  if (view.todayRank !== null) html = html.replace(/(<strong data-today-rank>)[\s\S]*?<\/strong>/, `$1#${escapeHtml(view.todayRank)}</strong>`);
  if (view.todayBid) html = html.replace(/(<strong data-today-bid>)[\s\S]*?<\/strong>/, `$1${escapeHtml(view.todayBid)}</strong>`);
  if (view.todayClicks !== null) html = html.replace(/(<strong data-today-clicks>)[\s\S]*?<\/strong>/, `$1${escapeHtml(view.todayClicks)}</strong>`);
  if (view.nextBid) html = html.replace(/(<strong data-next-bid>)[\s\S]*?<\/strong>/, `$1${escapeHtml(view.nextBid)}</strong>`);
  if (view.facts?.length) {
    const items = view.facts
      .map((fact) => `<li data-record-key="${escapeHtml(fact.key)}"><span>${escapeHtml(fact.label)}</span><strong${fact.date ? ` data-record-date="${escapeHtml(fact.date)}"` : ""}>${escapeHtml(fact.value)}</strong></li>`)
      .join("");
    html = html.replace(
      /<ul class="listing-record" data-record hidden><\/ul>/,
      `<ul class="listing-record" data-record>${items}</ul>`,
    );
  }
  html = html.replace(
    /(<a class="secondary-action listing-visit" data-visit)/,
    `$1 href="${escapeHtml(`${SITE_ORIGIN}/go/${view.id}${view.snapshotId ? `?snapshot=${view.snapshotId}` : ""}`)}"`,
  );
  html = html.replace(
    "</body>",
    `  <script id="listing-hydration" type="application/json">${hydrationJson}</script>\n  </body>`,
  );
  return html;
}
