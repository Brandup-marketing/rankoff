// A merchant should not have to type what their own website already says. When a
// listing arrives without a title or description, the destination is asked for
// the ones it publishes for every other link preview in the world.

// Named entities are what CMS themes and SEO plugins actually write for
// punctuation ("We&rsquo;re", "Fresh &mdash; daily"). Left undecoded they were
// published verbatim on the listing and in the Facebook/Instagram introduction.
const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " ",
  lsquo: "\u2018", rsquo: "\u2019", sbquo: "\u201a", ldquo: "\u201c", rdquo: "\u201d", bdquo: "\u201e",
  mdash: "\u2014", ndash: "\u2013", hellip: "\u2026", bull: "\u2022", middot: "\u00b7",
  copy: "\u00a9", reg: "\u00ae", trade: "\u2122", laquo: "\u00ab", raquo: "\u00bb",
  times: "\u00d7", divide: "\u00f7", deg: "\u00b0", plusmn: "\u00b1", euro: "\u20ac",
  pound: "\u00a3", yen: "\u00a5", cent: "\u00a2", sect: "\u00a7", para: "\u00b6",
  iexcl: "\u00a1", iquest: "\u00bf", hearts: "\u2665", larr: "\u2190", rarr: "\u2192",
};
const FETCH_TIMEOUT_MS = 3000;
const READ_LIMIT = 150_000;

export function decodeEntities(value) {
  return String(value || "")
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (match, name) => {
      const key = name.toLowerCase();
      if (ENTITIES[key]) return ENTITIES[key];
      // A hostile or broken page can write &#99999999999; — leave it as text
      // instead of letting fromCodePoint throw away the whole description.
      const codePoint = key.startsWith("#x") ? parseInt(key.slice(2), 16) : key.startsWith("#") ? Number(key.slice(1)) : NaN;
      if (Number.isInteger(codePoint) && codePoint > 0 && codePoint <= 0x10ffff) return String.fromCodePoint(codePoint);
      return match;
    })
    .replace(/\s+/g, " ")
    .trim();
}

// A tag ends at the first ">" that is OUTSIDE quotes. Matching "[^>]*>" cut a
// description such as "Save 20% > everyone else" in half and dropped it.
//
// The page is scanned ONCE, and every step is bounded, because the page belongs
// to whoever submitted the link: a tag may not run past MAX_TAG characters, a
// page may not present more than MAX_FAILED_TAGS unclosed tags, and only the
// first MAX_TAGS are kept. The previous per-lookup regexes took 7.5 seconds on
// a page made of unclosed "<meta" and were able to stall a submission.
const MAX_TAG = 8192;
const MAX_TAGS = 1500;
const MAX_FAILED_TAGS = 30;

function collectTags(html) {
  const text = String(html || "");
  const tags = [];
  const start = /<(meta|link|img)\b/gi;
  let failed = 0;
  let match;
  while (tags.length < MAX_TAGS && (match = start.exec(text))) {
    let quote = "";
    let end = -1;
    const limit = Math.min(text.length, match.index + MAX_TAG);
    for (let i = match.index + match[0].length; i < limit; i++) {
      const ch = text[i];
      if (quote) { if (ch === quote) quote = ""; }
      else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === ">") { end = i; break; }
    }
    if (end === -1) {
      if (++failed > MAX_FAILED_TAGS) break;
      start.lastIndex = match.index + 1;
      continue;
    }
    tags.push({ name: match[1].toLowerCase(), raw: text.slice(match.index, end + 1) });
    start.lastIndex = end + 1;
  }
  return tags;
}

// Attributes are read one by one. A value ends at the quote that opened it, so
// "Let's GO" is not cut at the apostrophe. The first occurrence of a repeated
// attribute wins, as in a browser.
function attrs(tag) {
  const out = {};
  const body = String(tag || "").replace(/^<[a-z0-9]+/i, "").replace(/\/?>$/, "");
  for (const m of body.matchAll(/([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    const name = m[1].toLowerCase();
    if (!(name in out)) out[name] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return out;
}

function firstTag(tags, name, test) {
  for (const tag of tags) {
    if (tag.name !== name) continue;
    tag.attrs ??= attrs(tag.raw);
    if (test(tag.attrs)) return tag.attrs;
  }
  return null;
}

function linkHref(tags, relTokens) {
  for (const token of relTokens) {
    const tag = firstTag(tags, "link", (a) => (a.rel || "").toLowerCase().includes(token));
    // A .ico is the 16px relic; only a real image is worth a card tile.
    if (tag?.href && !/\.ico(\?|$)/i.test(tag.href)) return decodeEntities(tag.href);
  }
  return "";
}

// Last resort: plenty of sites declare no icon at all and simply put the logo in
// the header. It is named "logo" often enough to be worth asking for.
function markupLogo(tags) {
  const tag = firstTag(tags, "img", (a) => ["src", "class", "alt", "id"].some((key) => /logo/i.test(a[key] || "")));
  const src = tag?.src || "";
  return /\.(png|jpe?g|webp|svg)(\?|$)/i.test(src) ? decodeEntities(src) : "";
}

// pairs: [attribute, value] for the <meta> to look for, e.g. ["property", "og:title"].
function metaContent(tags, pairs) {
  for (const [key, expected] of pairs) {
    const tag = firstTag(tags, "meta", (a) => (a[key] || "").toLowerCase() === expected);
    const value = decodeEntities(tag?.content);
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
const PLATFORM_BOILERPLATE = /^(instagram|facebook|tiktok|x|twitter|linkedin|linktree|youtube|小红书|log in|login|watch|explore)\b/i;

function cleanProfileTitle(value) {
  const text = decodeEntities(value)
    .replace(/\s*[•·|-]\s*(Instagram|Facebook|TikTok|X|Twitter|LinkedIn|YouTube).*$/i, "")
    .replace(/\s*\(@[^)]+\)\s*$/, "")
    .trim();
  // "TikTok - Make Your Day" is the platform introducing itself, not a business.
  return PLATFORM_BOILERPLATE.test(text) ? "" : text;
}

export function extractSiteInfo(html, hostname, { social = false, allowSocialImage = false, allowSocialDescription = false } = {}) {
  const head = String(html || "").slice(0, READ_LIMIT);
  const tags = collectTags(head);
  const rawTitle = (social ? metaContent(tags, [["property", "og:title"]]) : "") || metaContent(tags, [
      ["property", "og:site_name"],
      ["property", "og:title"],
    ]) || (head.match(/<title[^>]{0,200}>([\s\S]{0,400}?)<\/title>/i)?.[1] || "");
  const title = usableTitle(social ? cleanProfileTitle(rawTitle) : rawTitle, hostname);
  let description = social && !allowSocialDescription ? "" : usableDescription(
    metaContent(tags, [
      ["name", "description"],
      ["property", "og:description"],
    ]),
    hostname,
  );
  if (social && allowSocialDescription) {
    const parts = description.split(/\b[\d,.]+\s+(?:likes?|sukaan|followers?)\.\s*/i);
    description = parts.length > 1 ? parts.at(-1).trim() : "";
    if (!title || PLATFORM_BOILERPLATE.test(description)) description = "";
  }
  // A site's declared icon is a square mark drawn for exactly this purpose;
  // og:image is usually a wide hero photograph, which reads as a smudge in a
  // card tile. Ask for the mark first and fall back to the share image.
  const iconHref = !social && linkHref(tags, ["apple-touch-icon", "icon"]);
  const image = iconHref || ((!social || allowSocialImage) ? metaContent(tags, [
    ["property", "og:image:secure_url"],
    ["property", "og:image"],
  ]) || (social ? "" : markupLogo(tags)) : "");
  let logo = "";
  try {
    if (!image) throw new Error("no image declared");
    const resolved = new URL(image, `https://${hostname}/`);
    if (resolved.protocol === "https:" && (!social || (title && resolved.hostname.endsWith('.fbcdn.net') && /\/v\//.test(resolved.pathname)))) logo = resolved.toString();
  } catch {
    /* No usable image; the card falls back to its own candidates. */
  }
  return { title, description, logo };
}

// Never allowed to fail a submission: a merchant paying is worth more than a
// description we could not fetch.
export async function fetchSiteInfo(url, hostname, { social = false, allowSocialImage = false, allowSocialDescription = false, fetcher = fetch } = {}) {
  try {
    const response = await fetcher(url, {
      headers: { Accept: "text/html", "User-Agent": "RankoffBot/1.0 (+https://rankoff.my)" },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return { title: "", description: "", logo: "" };
    return extractSiteInfo(await response.text(), hostname, { social, allowSocialImage, allowSocialDescription });
  } catch {
    return { title: "", description: "", logo: "" };
  }
}
