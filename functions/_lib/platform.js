// Most Malaysian small businesses have no website — they have a Facebook Page or
// an Instagram profile. A listing is therefore identified by the account, not by
// the host: without this, every instagram.com listing is one listing, and the
// second account's payment lands on the first account's rank.

const PLATFORMS = new Map([
  ["instagram", {
    label: "Instagram",
    action: "viewInstagram",
    hosts: ["instagram.com", "instagr.am"],
    reject: ["p", "reel", "reels", "stories", "tv", "explore", "accounts", "direct"],
  }],
  ["tiktok", {
    label: "TikTok",
    action: "viewTiktok",
    hosts: ["tiktok.com", "vm.tiktok.com"],
    reject: ["video", "tag", "music", "discover", "search", "live", "foryou"],
  }],
  ["facebook", {
    label: "Facebook Page",
    action: "viewFacebook",
    hosts: ["facebook.com", "fb.com", "fb.me"],
    reject: ["profile.php", "groups", "posts", "reel", "reels", "stories", "watch", "story.php", "photo", "photo.php", "events", "marketplace", "people", "pages"],
  }],
  // Kept readable for listings stored before Malaysian social profiles were supported.
  ["x", {
    label: "X",
    action: "viewProfile",
    hosts: ["x.com", "twitter.com"],
    reject: ["status", "i", "search", "home", "explore", "messages"],
  }],
]);

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
  const segments = url.pathname.split("/").filter(Boolean);
  const first = decodeURIComponent(segments[0] || "").replace(/^@/, "").toLowerCase();

  const usable = Boolean(first)
    && segments.length === 1
    && !platform.reject.includes(first)
    && !platform.reject.includes(`${first}.php`)
    && /^[a-z0-9](?:[a-z0-9._-]{0,58}[a-z0-9])?$/.test(first);

  return { key, label: platform.label, action: platform.action, handle: usable ? first : "" };
}

// Storage key. Social accounts carry their platform so two handles never merge;
// websites keep the bare hostname they were already stored under, so payment
// attribution for listings created before this change does not move.
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
