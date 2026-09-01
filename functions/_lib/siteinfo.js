// A merchant should not have to type what their own website already says. When a
// listing arrives without a title or description, the destination is asked for
// the ones it publishes for every other link preview in the world.

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };
const FETCH_TIMEOUT_MS = 3000;
const READ_LIMIT = 150_000;

export function decodeEntities(value) {
  return String(value || "")
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (match, name) => {
      const key = name.toLowerCase();
      if (ENTITIES[key]) return ENTITIES[key];
      if (key.startsWith("#x")) return String.fromCodePoint(parseInt(key.slice(2), 16));
      if (key.startsWith("#")) return String.fromCodePoint(Number(key.slice(1)));
      return match;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function metaContent(html, patterns) {
  for (const pattern of patterns) {
    const tag = html.match(pattern);
    if (!tag) continue;
    const content = tag[0].match(/content=["']([^"']*)["']/i);
    const value = decodeEntities(content?.[1]);
    if (value) return value;
  }
  return "";
}

// "Home", "Welcome to our website" and a bare domain say nothing worth showing.
function usableDescription(value, hostname) {
  const text = decodeEntities(value);
  if (text.length < 40) return "";
  if (text.toLowerCase() === hostname.toLowerCase()) return "";
  if (/^(home|welcome|untitled|shopify store|my store)\b/i.test(text)) return "";
  return text.length > 240 ? `${text.slice(0, 239).trimEnd()}…` : text;
}

function usableTitle(value, hostname) {
  // Shop titles carry a tagline after a separator; the name is the first part.
  const text = decodeEntities(value).split(/\s+[|–—·]\s+/)[0].trim();
  if (!text || text.length > 96) return "";
  if (text.toLowerCase() === hostname.toLowerCase()) return "";
  return text;
}

// A profile's own metadata describes the platform, not the business: Instagram
// titles carry "(@handle) • Instagram photos and videos" and its description is
// a follower count, which is not ours to publish beside a paid position.
function cleanProfileTitle(value) {
  return decodeEntities(value)
    .replace(/\s*[•·|-]\s*(Instagram|Facebook|TikTok|X|Twitter).*$/i, "")
    .replace(/\s*\(@[^)]+\)\s*$/, "")
    .trim();
}

export function extractSiteInfo(html, hostname, { social = false } = {}) {
  const head = String(html || "").slice(0, READ_LIMIT);
  const rawTitle = metaContent(head, [
      /<meta[^>]+property=["']og:site_name["'][^>]*>/i,
      /<meta[^>]+property=["']og:title["'][^>]*>/i,
    ]) || (head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
  const title = usableTitle(social ? cleanProfileTitle(rawTitle) : rawTitle, hostname);
  const description = social ? "" : usableDescription(
    metaContent(head, [
      /<meta[^>]+name=["']description["'][^>]*>/i,
      /<meta[^>]+property=["']og:description["'][^>]*>/i,
    ]),
    hostname,
  );
  // A profile picture is served from a signed URL that expires within weeks; the
  // card would quietly fall back to initials, so it is not worth storing.
  const image = social ? "" : metaContent(head, [
    /<meta[^>]+property=["']og:image:secure_url["'][^>]*>/i,
    /<meta[^>]+property=["']og:image["'][^>]*>/i,
  ]);
  let logo = "";
  try {
    if (!image) throw new Error("no image declared");
    const resolved = new URL(image, `https://${hostname}/`);
    if (resolved.protocol === "https:") logo = resolved.toString();
  } catch {
    /* No usable image; the card falls back to its own candidates. */
  }
  return { title, description, logo };
}

// Never allowed to fail a submission: a merchant paying is worth more than a
// description we could not fetch.
export async function fetchSiteInfo(url, hostname, { social = false, fetcher = fetch } = {}) {
  try {
    const response = await fetcher(url, {
      headers: { Accept: "text/html", "User-Agent": "RankoffBot/1.0 (+https://rankoff.my)" },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return { title: "", description: "", logo: "" };
    return extractSiteInfo(await response.text(), hostname, { social });
  } catch {
    return { title: "", description: "", logo: "" };
  }
}
