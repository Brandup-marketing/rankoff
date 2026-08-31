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

function clamp(text, limit) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  return value.length > limit ? `${value.slice(0, limit - 1).trimEnd()}…` : value;
}

export function buildProductView({ entry, todayEntry, board, snapshotId }) {
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
  html = html.replace(
    "</head>",
    `  <meta property="og:url" content="${canonical}" />\n`
      + `    <meta name="twitter:card" content="summary_large_image" />\n`
      + `    <meta name="twitter:title" content="${title}" />\n`
      + `    <meta name="twitter:description" content="${description}" />\n`
      + `    <meta name="twitter:image" content="${SITE_ORIGIN}/assets/rankoff-og-card.png" />\n`
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
  html = html.replace(
    /(<a class="secondary-action listing-visit" data-visit)/,
    `$1 href="${escapeHtml(`${SITE_ORIGIN}/go/${view.id}${view.snapshotId ? `?snapshot=${view.snapshotId}` : ""}`)}"`,
  );
  return html;
}
