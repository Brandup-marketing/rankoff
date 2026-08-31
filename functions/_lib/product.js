// Server-rendered listing pages. The board decides the numbers; this file only
// formats them into the shell that /listing already ships, so a crawler, a
// WhatsApp preview and a reader without JavaScript all see the same record.

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

function clamp(text, limit) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  return value.length > limit ? `${value.slice(0, limit - 1).trimEnd()}…` : value;
}

export function buildProductView({ entry, todayEntry, board, snapshotId, record }) {
  const listing = entry.listing || {};
  const hostname = normalizeSlug(listing.hostname);
  const currency = String(board?.currency || "MYR").toUpperCase();
  const bid = formatMoney(entry.bid?.amount_minor, currency);
  const clicks = Number(entry.clicks || 0);
  const title = String(listing.title || hostname);
  const description = String(listing.description || "");
  const rank = Number(entry.rank);

  return {
    id: String(listing.id || ""),
    hostname,
    title,
    description,
    category: String(listing.category || "Other"),
    destination: String(listing.url || ""),
    canonical: `${SITE_ORIGIN}${productPath(hostname)}`,
    rank,
    bid,
    clicks,
    todayRank: todayEntry ? Number(todayEntry.rank) : null,
    todayBid: todayEntry ? formatMoney(todayEntry.bid?.amount_minor, currency) : null,
    todayClicks: todayEntry ? Number(todayEntry.clicks || 0) : null,
    snapshotId: snapshotId || "",
    facts: recordFacts(record),
    pageTitle: `${title} — #${rank} on RANKOFF`,
    metaDescription: clamp(
      `${title} holds #${rank} on Rankoff with ${bid} in settled bids and ${clicks} verified clicks. ${description}`,
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
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: view.pageTitle,
    url: view.canonical,
    description: view.metaDescription,
    isPartOf: { "@type": "WebSite", name: "RANKOFF", url: `${SITE_ORIGIN}/` },
    about: { "@type": "Organization", name: view.title, url: view.destination },
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
    `<meta property="og:image" content="${escapeHtml(`${SITE_ORIGIN}/og/${view.hostname}`)}" />`,
  );
  html = html.replace(/\s*<meta property="og:image:(?:width|height)" content="[^"]*"\s*\/>/g, "");
  html = html.replace(
    "</head>",
    `  <meta property="og:url" content="${canonical}" />\n`
      + `    <meta name="twitter:card" content="summary_large_image" />\n`
      + `    <meta name="twitter:title" content="${title}" />\n`
      + `    <meta name="twitter:description" content="${description}" />\n`
      + `    <meta name="twitter:image" content="${escapeHtml(`${SITE_ORIGIN}/og/${view.hostname}`)}" />\n`
      + `    <script type="application/ld+json">${jsonLd}</script>\n`
      + `  </head>`,
  );

  // The shell hydrates from the board API; hand it the listing it is standing on.
  html = html.replace(/<body(\s[^>]*)?>/, (match, attributes) => `<body${attributes || ""} data-listing-id="${escapeHtml(view.id)}">`);

  // Content a crawler can read without running the page's JavaScript.
  html = html.replace(/(<div class="listing-loading" data-loading)>/, "$1 hidden>");
  html = html.replace(/(<div class="listing-content" data-content)\s+hidden>/, "$1>");
  html = html.replace(/(<section id="listing-detail"[^>]*)aria-busy="true"/, '$1aria-busy="false"');
  html = html.replace(/(<h1 data-title)>[\s\S]*?<\/h1>/, `$1>${escapeHtml(view.title)}</h1>`);
  html = html.replace(/(<p class="listing-host" data-host)>[\s\S]*?<\/p>/, `$1>${escapeHtml(view.hostname)}</p>`);
  html = html.replace(/(<p class="listing-story" data-description)>[\s\S]*?<\/p>/, `$1>${escapeHtml(view.description)}</p>`);
  html = html.replace(/(<span data-category)>[\s\S]*?<\/span>/, `$1>${escapeHtml(view.category)}</span>`);
  html = html.replace(/(<dd data-rank)>[\s\S]*?<\/dd>/, `$1>#${escapeHtml(view.rank)}</dd>`);
  html = html.replace(/(<dd data-bid)>[\s\S]*?<\/dd>/, `$1>${escapeHtml(view.bid)}</dd>`);
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
