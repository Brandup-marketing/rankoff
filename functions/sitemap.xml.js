import { defaultBoardSlug, isProduction, requireDatabase } from "./_lib/config.js";
import { SITE_ORIGIN, escapeHtml, normalizeSlug, productPath } from "./_lib/product.js";
import { loadBoard, loadPublicBoard } from "./_lib/repository.js";

const PAGE_LIMIT = 100;
const MAX_PAGES = 10;

// The owner view is noindex and shows real customer contact detail. It must
// never be advertised to a crawler, so the assembled document is filtered
// rather than trusted: a hand-edited sitemap.xml cannot leak it by accident.
const PRIVATE_PATHS = Object.freeze(["/admin.html"]);

export function stripPrivatePaths(xml) {
  return String(xml).replace(/[ \t]*<url>[\s\S]*?<\/url>\n?/g, (block) => {
    const loc = (/<loc>([\s\S]*?)<\/loc>/.exec(block)?.[1] || "").trim();
    let path = loc;
    try {
      path = new URL(loc).pathname;
    } catch {
      /* A relative <loc> is compared as written. */
    }
    return PRIVATE_PATHS.includes(path) ? "" : block;
  });
}

export function productEntries(rankings) {
  return rankings
    .map((entry) => ({
      hostname: normalizeSlug(entry.listing?.hostname),
      lastmod: String(entry.bid?.settled_at || "").slice(0, 10),
    }))
    .filter((entry) => entry.hostname)
    .map((entry) => `  <url>\n    <loc>${escapeHtml(`${SITE_ORIGIN}${productPath(entry.hostname)}`)}</loc>\n`
      + (/^\d{4}-\d{2}-\d{2}$/.test(entry.lastmod) ? `    <lastmod>${entry.lastmod}</lastmod>\n` : "")
      + `    <changefreq>daily</changefreq>\n    <priority>0.6</priority>\n  </url>`)
    .join("\n");
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const base = await context.env.ASSETS.fetch(new Request(new URL("/sitemap.xml", url.origin)));
  let xml = await base.text();

  if (isProduction(context.env)) {
    try {
      const db = requireDatabase(context.env);
      const board = await loadBoard(db, defaultBoardSlug(context.env));
      const rankings = [];
      for (let page = 1; page <= MAX_PAGES; page += 1) {
        const payload = await loadPublicBoard(db, board, { category: "all", period: "all", limit: PAGE_LIMIT, page });
        rankings.push(...payload.rankings);
        if (!payload.pagination?.has_next) break;
      }
      const entries = productEntries(rankings);
      if (entries) xml = xml.replace("</urlset>", `${entries}\n</urlset>`);
    } catch {
      /* The hand-maintained pages still ship even when the board cannot be read. */
    }
  }

  return new Response(stripPrivatePaths(xml), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300, must-revalidate" },
  });
}
