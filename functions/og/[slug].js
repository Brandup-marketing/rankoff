import { defaultBoardSlug, isProduction, requireDatabase } from "../_lib/config.js";
import { normalizeSlug } from "../_lib/product.js";
import { findListingByHostname, loadBoard } from "../_lib/repository.js";

const FALLBACK = "/assets/rankoff-og-card.png";
const FETCH_TIMEOUT_MS = 2500;
const HTML_READ_LIMIT = 120_000;
const CACHE_SECONDS = 86_400;

// A merchant already publishes a share image for their own site; pointing at it
// puts their brand in the WhatsApp preview instead of the same Rankoff card for
// everyone, and it carries their own script without us rendering any text.
export async function discoverShareImage(pageUrl, fetcher = fetch) {
  const response = await fetcher(pageUrl, {
    headers: { Accept: "text/html", "User-Agent": "RankoffBot/1.0 (+https://rankoff.my)" },
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) return "";
  const html = (await response.text()).slice(0, HTML_READ_LIMIT);
  const match = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]*>/i);
  if (!match) return "";
  const content = match[0].match(/content=["']([^"']+)["']/i);
  if (!content) return "";
  try {
    const resolved = new URL(content[1], response.url || pageUrl);
    if (resolved.protocol === "https:") return resolved.toString();
    // Plenty of sites still declare their share image over http while serving
    // the same file over https. A crawler will not load mixed content, so try
    // the secure form rather than throwing away the merchant's own picture —
    // verifyImage decides whether it is really there.
    if (resolved.protocol === "http:") {
      resolved.protocol = "https:";
      return resolved.toString();
    }
    return "";
  } catch {
    return "";
  }
}

// Plenty of sites declare a share image that no longer exists. Sending a crawler
// to a 404 leaves the preview with no picture at all — worse than our own card.
export async function verifyImage(imageUrl, fetcher = fetch) {
  if (!imageUrl) return "";
  try {
    const response = await fetcher(imageUrl, {
      headers: { Range: "bytes=0-0", "User-Agent": "RankoffBot/1.0 (+https://rankoff.my)" },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok && response.status !== 206) return "";
    return /^image\//i.test(response.headers.get("content-type") || "") ? imageUrl : "";
  } catch {
    return "";
  }
}

function redirect(target, seconds) {
  return new Response(null, {
    status: 302,
    headers: { Location: target, "Cache-Control": `public, max-age=${seconds}` },
  });
}

// Facebook and WhatsApp sometimes ask for the image with HEAD before fetching
// it; answering that with the shell's HTML makes them skip the picture entirely.
export async function onRequestHead(context) {
  const response = await onRequestGet(context);
  return new Response(null, { status: response.status, headers: response.headers });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const fallback = new URL(FALLBACK, url.origin).toString();
  const hostname = normalizeSlug(context.params.slug);
  // Never follow a bare address: only hostnames that reached the board as listings.
  if (!hostname || /^\d+\.\d+\.\d+\.\d+$/.test(hostname) || !isProduction(context.env)) return redirect(fallback, 300);

  const cache = caches.default;
  const cacheKey = new Request(url.toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  let target = fallback;
  try {
    const db = requireDatabase(context.env);
    const board = await loadBoard(db, defaultBoardSlug(context.env));
    const listing = await findListingByHostname(db, board.id, hostname);
    if (listing && listing.status === "approved") {
      target = (await verifyImage(await discoverShareImage(`https://${hostname}/`))) || fallback;
    }
  } catch {
    /* The Rankoff card is always a valid answer. */
  }

  const response = redirect(target, target === fallback ? 3600 : CACHE_SECONDS);
  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
