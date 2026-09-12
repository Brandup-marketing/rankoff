// A merchant's logo lives on the merchant's own domain. Drawing a cross-origin
// picture into a <canvas> taints it, and a tainted canvas throws SecurityError
// on toBlob — so the rank card could never be turned into a file to share.
// A redirect does not fix that; the browser follows it and still ends up on
// somebody else's origin. This route re-serves the BYTES from rankoff.my.
//
// It is a proxy, so it is fenced in on every side: the slug must be a hostname
// that reached the board as an approved listing, the answer must be a real
// raster image, it may not exceed a size cap, and every fetch has a deadline.

import { defaultBoardSlug, isProduction, requireDatabase } from "../_lib/config.js";
import { fetchInstagramProfile } from "../_lib/instagram.js";
import { identityParts, isUsableHandle } from "../_lib/platform.js";
import { normalizeSlug } from "../_lib/product.js";
import { findListingByHostname, loadBoard } from "../_lib/repository.js";
import { discoverShareImage } from "../og/[slug].js";

const FETCH_TIMEOUT_MS = 3000;
const MAX_BYTES = 2_000_000;
const HIT_CACHE_SECONDS = 86_400;
const MISS_CACHE_SECONDS = 900;
const USER_AGENT = "RankoffBot/1.0 (+https://rankoff.my)";

// SVG is deliberately absent. It is a document format, and serving one from our
// own origin hands a merchant's server a same-origin page on rankoff.my.
export const ALLOWED_IMAGE_TYPES = Object.freeze([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/bmp",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

export function allowedImageType(header) {
  const type = String(header || "").split(";")[0].trim().toLowerCase();
  return ALLOWED_IMAGE_TYPES.includes(type) ? type : "";
}

// A logo that is 40 MB is not a logo. Trusting Content-Length alone is not
// enough — it is the remote server's claim — so the stream is counted too.
export async function readCapped(body, limit = MAX_BYTES) {
  if (!body) return null;
  const reader = body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

// An apple-touch-icon is a square logo drawn for exactly this purpose, so it is
// asked for first. og:image is usually a wide banner but is always intentional.
// favicon.ico is the last resort: small, but it is still their mark.
export function candidateSources(hostname) {
  return [`https://${hostname}/apple-touch-icon.png`, `https://${hostname}/favicon.ico`];
}

export async function fetchImageBytes(imageUrl, fetcher = fetch) {
  if (!imageUrl) return null;
  let response;
  try {
    response = await fetcher(imageUrl, {
      headers: { Accept: "image/*", "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  const type = allowedImageType(response.headers.get("content-type"));
  if (!type) return null;
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BYTES) return null;
  const bytes = await readCapped(response.body);
  if (!bytes || bytes.byteLength === 0) return null;
  return { type, bytes };
}

// The listing already stores the best logo discovered at submission time. Use
// that first, then fall back to conventional icon paths and finally og:image.
// This keeps a deliberate brand mark from being replaced by a page photograph.
export async function resolveMerchantImage(hostname, deps = {}) {
  const fetcher = deps.fetcher || fetch;
  const discover = deps.discover || discoverShareImage;
  let preferred = "";
  try {
    const parsed = new URL(String(deps.preferredUrl || ""));
    if (parsed.protocol === "https:") preferred = parsed.toString();
  } catch {
    /* Conventional site icons remain available below. */
  }
  const sources = [preferred, ...(deps.discoverFirst ? [] : candidateSources(hostname))].filter((source, index, all) => source && all.indexOf(source) === index);
  for (const source of sources) {
    const found = await fetchImageBytes(source, fetcher);
    if (found) return found;
  }
  let shareImage = "";
  try {
    shareImage = await discover(`https://${hostname}/`, fetcher);
  } catch {
    shareImage = "";
  }
  const discovered = shareImage ? await fetchImageBytes(shareImage, fetcher) : null;
  if (discovered) return discovered;
  if (deps.discoverFirst) for (const source of candidateSources(hostname)) {
    const found = await fetchImageBytes(source, fetcher); if (found) return found;
  }
  return null;
}

function imageResponse(found) {
  return new Response(found.bytes, {
    status: 200,
    headers: {
      "Content-Type": found.type,
      "Content-Length": String(found.bytes.byteLength),
      "Cache-Control": `public, max-age=${HIT_CACHE_SECONDS}`,
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}

// The card draws initials when this comes back empty, so a miss is a normal
// answer rather than an error the caller has to survive.
function missResponse() {
  return new Response(null, {
    status: 404,
    headers: {
      "Cache-Control": `public, max-age=${MISS_CACHE_SECONDS}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function onRequestHead(context) {
  const response = await onRequestGet(context);
  return new Response(null, { status: response.status, headers: response.headers });
}

// An Instagram listing is addressed by its identity, "instagram:<handle>", the
// same string the board stores. Only Instagram: Business Discovery is the one
// official way to read a public profile picture, and it covers no other
// platform, so those keep their initials rather than have this fetch a guess.
export function instagramIdentityFrom(slug) {
  let value = String(slug || "");
  try { value = decodeURIComponent(value); } catch { /* keep as given */ }
  value = value.trim().toLowerCase();
  const parts = identityParts(value);
  if (parts.platform !== "instagram" || !isUsableHandle(parts.handle)) return "";
  return `instagram:${parts.handle}`;
}

export function socialIdentityFrom(slug) {
  let value = String(slug || '');
  try { value = decodeURIComponent(value); } catch {}
  const parts = identityParts(value.trim().toLowerCase());
  return parts.platform && parts.platform !== 'instagram' && isUsableHandle(parts.handle)
    ? `${parts.platform}:${parts.handle}` : '';
}

// A profile picture is never stored here as a picture. Meta hands back a CDN
// link signed for a few days, so anything kept in the database dies quietly
// and the card falls back to initials while the account carries on posting.
// Instead the picture is asked for fresh — the token is permanent, the link is
// not — and only the bytes are cached, for a day. An account that changes its
// picture is current on the board within that day. If Meta declines (a personal
// account, a token without scope), the link the listing was created with is
// tried while it is still alive, and after that the tile shows initials.
export async function resolveProfileImage(identity, env, deps = {}) {
  const fetcher = deps.fetcher || fetch;
  const discover = deps.discover || ((handle) => fetchInstagramProfile(handle, env, fetcher));
  const handle = identityParts(identity).handle;
  if (!handle) return null;
  let profile = null;
  try {
    profile = await discover(handle);
  } catch {
    profile = null;
  }
  const fresh = /^https:\/\//i.test(String(profile?.logo || "")) ? profile.logo : "";
  const stored = /^https:\/\//i.test(String(deps.storedUrl || "")) ? deps.storedUrl : "";
  for (const source of [...new Set([fresh, stored].filter(Boolean))]) {
    const found = await fetchImageBytes(source, fetcher);
    if (found) return found;
  }
  return null;
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const identity = instagramIdentityFrom(context.params.slug) || socialIdentityFrom(context.params.slug);
  const hostname = identity ? "" : normalizeSlug(context.params.slug);
  // Never follow a bare address, and never proxy for a board that is not live:
  // only listings that reached this board may be fetched, by hostname or by
  // Instagram identity.
  if ((!hostname && !identity) || /^\d+\.\d+\.\d+\.\d+$/.test(hostname) || !isProduction(context.env)) return missResponse();

  const cache = caches.default;
  const cacheKey = new Request(url.toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  let found = null;
  try {
    const db = requireDatabase(context.env);
    const board = await loadBoard(db, defaultBoardSlug(context.env));
    const listing = await findListingByHostname(db, board.id, identity || hostname);
    if (listing && listing.status === "approved") {
      found = identity && identity.startsWith('instagram:')
        ? await resolveProfileImage(identity, context.env, { storedUrl: listing.favicon_url })
        : identity
          ? await resolveMerchantImage(`www.${identity.split(':')[0]}.com`, { preferredUrl: listing.favicon_url, discoverFirst: true, discover: (url, fetcher) => discoverShareImage(`https://${identity.split(':')[0]}.com/${identity.split(':')[1]}`, fetcher) })
        : await resolveMerchantImage(hostname, { preferredUrl: listing.favicon_url });
    }
  } catch {
    /* Initials are always a valid card. */
  }

  const response = found ? imageResponse(found) : missResponse();
  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
