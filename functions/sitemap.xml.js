import { defaultBoardSlug, isProduction, requireDatabase } from "./_lib/config.js";
import { SITE_ORIGIN, escapeHtml, normalizeSlug, productPath } from "./_lib/product.js";
import { loadBoard, loadPublicBoard } from "./_lib/repository.js";

const PAGE_LIMIT = 100;
const MAX_PAGES = 10;

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

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300, must-revalidate" },
  });
}
