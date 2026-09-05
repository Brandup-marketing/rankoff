// Server-rendered listing pages. The board decides the numbers; this file only
// formats them into the shell that /listing already ships, so a crawler, a
// WhatsApp preview and a reader without JavaScript all see the same record.

import { destinationAction, displayName, identityParts, profilePath } from "./platform.js";
export const SITE_ORIGIN = "https://rankoff.my";

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

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

export function formatMoney(amountMinor, currency) {
  const amount = Math.ceil(Number(amountMinor || 0) / 100);
  return currency === "MYR" ? `RM ${amount}` : `${currency} ${amount}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(value) {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

// Only facts the board itself produced. Nothing here is inferred about the merchant.
export function recordFacts(record) {
  const facts = [];
  const firstListed = formatDate(record?.first_settled_at);
  const lastUpdated = formatDate(record?.last_settled_at);
  const bidCount = Number(record?.bid_count || 0);
  if (firstListed) facts.push({ label: "First listed", value: firstListed });
  if (bidCount > 0) facts.push({ label: "Settled bids", value: String(bidCount) });
  if (lastUpdated) facts.push({ label: "Last updated", value: lastUpdated });
  return facts;
}

export const ACTION_LABELS = Object.freeze({
  visit: "Visit website",
  viewInstagram: "View Instagram",
  viewFacebook: "View Facebook Page",
  viewTiktok: "View TikTok",
  viewProfile: "View profile",
});

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

export function buildProductView({ entry, todayEntry, board, snapshotId, record, marketRank = null, marketName = "" }) {
  const listing = entry.listing || {};
  const identity = String(listing.hostname || "");
  const parts = identityParts(identity);
  const label = displayName(identity);
  const currency = String(board?.currency || "MYR").toUpperCase();
  const bid = formatMoney(entry.bid?.amount_minor, currency);
  const clicks = Number(entry.clicks || 0);
  const title = String(listing.title || label);
  const description = String(listing.description || "");
  const rank = Number(entry.rank);
  const useMarket = Boolean(marketRank && marketName) && marketRank < rank;
  const headline = useMarket ? `#${marketRank} in ${marketName} | RANKOFF` : `#${rank} on RANKOFF`;
  const position = useMarket ? `#${marketRank} in ${marketName}` : `#${rank}`;

  return {
    id: String(listing.id || ""),
    identity,
    platform: parts.platform,
    action: destinationAction(identity),
    hostname: label,
    // A platform profile hides its picture from crawlers, so only a website can
    // hand us a share image of its own.
    shareImage: parts.platform
      ? `${SITE_ORIGIN}/assets/rankoff-og-card.png`
      : `${SITE_ORIGIN}/og/${parts.hostname}`,
    title,
    description,
    category: String(listing.category || "Other"),
    destination: String(listing.url || ""),
    canonical: `${SITE_ORIGIN}${profilePath(identity)}`,
    rank,
    bid,
    clicks,
    todayRank: todayEntry ? Number(todayEntry.rank) : null,
    todayBid: todayEntry ? formatMoney(todayEntry.bid?.amount_minor, currency) : null,
    todayClicks: todayEntry ? Number(todayEntry.clicks || 0) : null,
    snapshotId: snapshotId || "",
    facts: recordFacts(record),
    marketRank,
    marketName,
    // Same frame the title uses, so the page and its own headline agree.
    rankLabel: useMarket ? `Rank in ${marketName}` : "Current rank",
    rankValue: useMarket ? `#${marketRank}` : `#${rank}`,
    rankNote: useMarket ? `#${rank} on the whole board` : "",
    logo: String(listing.favicon_url || ""),
    initials: initialsFor(title, label),
    // Both positions are true; a merchant shares the one worth sharing. #3 of a
    // young board says nothing, #1 of a market says something — and once the
    // board is large the overall number wins this comparison on its own.
    pageTitle: `${title} — ${headline}`,
    metaDescription: clamp(
      `${title} holds ${position} on Rankoff with ${bid} in settled bids and ${clicks} verified clicks. ${description}`,
      200,
    ),
  };
}

function replaceTag(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html;
}

export function renderProductPage(shell, view) {
  const title = escapeHtml(view.pageTitle);
  const description = escapeHtml(view.metaDescription);
  const canonical = escapeHtml(view.canonical);
  const subject = { "@type": "Organization", name: view.title, url: view.destination };
  if (view.platform) subject.alternateName = view.hostname;
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    // A social account's page is a profile page; a website's listing is not.
    "@type": view.platform ? "ProfilePage" : "WebPage",
    name: view.pageTitle,
    url: view.canonical,
    description: view.metaDescription,
    isPartOf: { "@type": "WebSite", name: "RANKOFF", url: `${SITE_ORIGIN}/` },
    ...(view.platform ? { mainEntity: subject } : { about: subject }),
  }).replace(/</g, "\\u003c");

  // The shell lives at /listing and links its assets relatively; one level deeper
  // at /product/<hostname> those would resolve to /product/styles.css.
  let html = shell.replace(/(href|src)="\.\//g, '$1="/');
  html = replaceTag(html, /<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  html = replaceTag(html, /<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${description}" />`);
  html = replaceTag(html, /<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${canonical}" />`);
  html = replaceTag(html, /<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${title}" />`);
  html = replaceTag(html, /<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${description}" />`);
  // The merchant's own share image when they publish one; /og resolves it and
  // falls back to the Rankoff card. Its size is theirs, so the shell's fixed
  // 1200x630 declaration has to go with it.
  html = replaceTag(
    html,
    /<meta property="og:image" content="[^"]*"\s*\/>/,
    `<meta property="og:image" content="${escapeHtml(view.shareImage)}" />`,
  );
  html = html.replace(/\s*<meta property="og:image:(?:width|height)" content="[^"]*"\s*\/>/g, "");
  html = html.replace(
    "</head>",
    `  <meta property="og:url" content="${canonical}" />\n`
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
    `<span data-copy="${escapeHtml(view.action)}">${escapeHtml(ACTION_LABELS[view.action] || ACTION_LABELS.visit)}</span>`,
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
    `<span class="listing-mark${view.logo ? " has-icon" : ""}" data-mark aria-hidden="true">${markInner}</span>`,
  );
  html = html.replace(/(<h1 data-title)>[\s\S]*?<\/h1>/, `$1>${escapeHtml(view.title)}</h1>`);
  html = html.replace(/(<p class="listing-host" data-host)>[\s\S]*?<\/p>/, `$1>${escapeHtml(view.hostname)}</p>`);
  html = html.replace(/(<p class="listing-story" data-description)>[\s\S]*?<\/p>/, `$1>${escapeHtml(view.description)}</p>`);
  html = html.replace(/(<span data-category)>[\s\S]*?<\/span>/, `$1>${escapeHtml(view.marketName || view.category)}</span>`);
  html = html.replace(/(<span class="verified-chip" data-placement-label)>[\s\S]*?<\/span>/, `$1>Verified placement</span>`);
  html = html.replace(/(<dt data-rank-label)>[\s\S]*?<\/dt>/, `$1>${escapeHtml(view.rankLabel)}</dt>`);
  html = html.replace(/(<dd data-rank)>[\s\S]*?<\/dd>/, `$1>${escapeHtml(view.rankValue)}</dd>`);
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
  html = html.replace(/(<dt data-click-label)>[\s\S]*?<\/dt>/, `$1>Verified clicks</dt>`);
  html = html.replace(/(<dd data-clicks)>[\s\S]*?<\/dd>/, `$1>${escapeHtml(view.clicks)}</dd>`);
  if (view.facts?.length) {
    const items = view.facts
      .map((fact) => `<li><span>${escapeHtml(fact.label)}</span><strong>${escapeHtml(fact.value)}</strong></li>`)
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
  return html;
}
