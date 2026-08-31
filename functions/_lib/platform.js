// Most Malaysian small businesses have no website — they have a Facebook Page or
// an Instagram profile. A listing is therefore identified by the account, not by
// the host: without this, every instagram.com listing is one listing, and the
// second account's payment lands on the first account's rank.

const one = (segments) => (segments.length === 1 ? segments[0] : "");
// A profile that lives two levels down still has one address: linkedin.com/in/name.
const prefixed = (allowed) => (segments) =>
  (segments.length === 2 && allowed.includes(segments[0]) ? `${segments[0]}-${segments[1]}` : "");

const PLATFORMS = new Map([
  ["instagram", {
    label: "Instagram", action: "viewInstagram", hosts: ["instagram.com", "instagr.am"],
    extract: one, reject: ["p", "reel", "reels", "stories", "tv", "explore", "accounts", "direct"],
  }],
  ["tiktok", {
    label: "TikTok", action: "viewTiktok", hosts: ["tiktok.com", "vm.tiktok.com"],
    extract: one, reject: ["video", "tag", "music", "discover", "search", "live", "foryou"],
  }],
  ["facebook", {
    label: "Facebook Page", action: "viewFacebook", hosts: ["facebook.com", "fb.com", "fb.me"],
    extract: one, reject: ["profile.php", "groups", "posts", "reel", "reels", "stories", "watch", "story.php", "photo", "photo.php", "events", "marketplace", "people", "pages"],
  }],
  ["x", {
    label: "X", action: "viewProfile", hosts: ["x.com", "twitter.com"],
    extract: one, reject: ["status", "i", "search", "home", "explore", "messages"],
  }],
  // The link-in-bio page a merchant without a website hands out.
  ["linktree", {
    label: "Linktree", action: "viewProfile", hosts: ["linktr.ee"],
    extract: one, reject: ["s", "admin", "login", "register", "discover"],
  }],
  ["youtube", {
    label: "YouTube", action: "viewProfile", hosts: ["youtube.com", "youtu.be"],
    extract: (segments) => (segments.length === 1 ? segments[0] : prefixed(["c", "user", "channel"])(segments)),
    reject: ["watch", "shorts", "playlist", "results", "feed", "live", "embed"],
  }],
  ["linkedin", {
    label: "LinkedIn", action: "viewProfile", hosts: ["linkedin.com"],
    extract: prefixed(["in", "company", "school", "showcase"]), reject: ["feed", "posts", "pulse", "jobs"],
  }],
  ["xiaohongshu", {
    label: "小红书", action: "viewProfile", hosts: ["xiaohongshu.com", "xhslink.com"],
    extract: (segments) => (segments.length === 3 && segments[0] === "user" && segments[1] === "profile" ? segments[2] : ""),
    reject: ["explore", "discovery", "search_result"],
  }],
]);

// A chat link is not a public page, and a phone number is not the merchant's to
// publish when anyone may sponsor anyone.
export const CHAT_HOSTS = new Set(["wa.me", "api.whatsapp.com", "chat.whatsapp.com", "whatsapp.com", "t.me", "telegram.me", "telegram.dog"]);

const HOST_INDEX = new Map();
for (const [key, platform] of PLATFORMS) {
  for (const host of platform.hosts) HOST_INDEX.set(host, key);
}

export function normalizeHost(hostname) {
  return String(hostname || "").toLowerCase().replace(/\.$/, "").replace(/^(?:www|m|mobile|web)\./, "");
}

export function platformKeyFor(hostname) {
  return HOST_INDEX.get(normalizeHost(hostname)) || "";
}

export function platformFor(key) {
  const platform = PLATFORMS.get(key);
  return platform ? { key, label: platform.label, action: platform.action } : null;
}

// The account name is the first path segment: instagram.com/agent_ali, never the
// post underneath it. A profile is a page that stays; a reel is a moment.
export function accountFrom(url) {
  const key = platformKeyFor(url.hostname);
  if (!key) return null;
  const platform = PLATFORMS.get(key);
  const segments = url.pathname.split("/").filter(Boolean)
    .map((segment) => decodeURIComponent(segment).replace(/^@/, "").toLowerCase());

  const first = segments[0] || "";
  const handle = platform.reject.includes(first) || platform.reject.includes(`${first}.php`)
    ? ""
    : platform.extract(segments);

  const usable = Boolean(handle) && /^[a-z0-9](?:[a-z0-9._-]{0,58}[a-z0-9])?$/.test(handle);
  return { key, label: platform.label, action: platform.action, handle: usable ? handle : "" };
}

export function listingIdentity(hostname, account) {
  if (account?.handle) return `${account.key}:${account.handle}`;
  return normalizeHost(hostname);
}

export function identityParts(identity) {
  const value = String(identity || "");
  const split = value.indexOf(":");
  if (split === -1) return { platform: "", handle: "", hostname: value };
  const key = value.slice(0, split);
  return PLATFORMS.has(key)
    ? { platform: key, handle: value.slice(split + 1), hostname: "" }
    : { platform: "", handle: "", hostname: value };
}

export function profilePath(identity) {
  const parts = identityParts(identity);
  return parts.platform ? `/profile/${parts.platform}/${parts.handle}` : `/product/${parts.hostname}`;
}

// What the visitor is about to open, so the button never says "Visit website"
// for an Instagram profile.
export function destinationAction(identity) {
  const parts = identityParts(identity);
  const platform = parts.platform ? platformFor(parts.platform) : null;
  return platform ? platform.action : "visit";
}

export function displayName(identity) {
  const parts = identityParts(identity);
  return parts.platform ? `@${parts.handle}` : parts.hostname;
}
