// Meta Business Discovery lookup for public Instagram professional accounts.
// Secrets are supplied only through Cloudflare bindings; absent credentials are
// a normal development state and must never block a paid listing.

const FETCH_TIMEOUT_MS = 4000;
const GRAPH_VERSION = "v25.0";
const PROFILE_FIELDS = "id,username,name,biography,profile_picture_url,website";

export async function fetchInstagramProfile(username, env, fetcher = fetch) {
  const accessToken = String(env?.META_ACCESS_TOKEN || "");
  const viewerId = String(env?.META_INSTAGRAM_USER_ID || "");
  const handle = String(username || "").trim().replace(/^@/, "");
  if (!accessToken || !viewerId || !handle) return null;

  const version = String(env?.META_GRAPH_API_VERSION || GRAPH_VERSION).replace(/[^v0-9.]/g, "") || GRAPH_VERSION;
  const url = new URL(`https://graph.facebook.com/${version}/${viewerId}`);
  url.searchParams.set("fields", `business_discovery.username(${handle}){${PROFILE_FIELDS}}`);

  try {
    const response = await fetcher(url, {
      headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    // A refusal used to vanish here, so nobody could tell a personal account
    // from a token without scope from an app still in development mode. Meta's
    // error body names the cause; the token travels in the header and is never
    // part of what is logged.
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`[instagram] business_discovery ${handle} HTTP ${response.status}: ${body.slice(0, 400)}`);
      return null;
    }
    const payload = await response.json();
    const profile = payload?.business_discovery;
    if (!profile?.username) {
      console.error(`[instagram] business_discovery ${handle} answered without a profile: ${JSON.stringify(payload).slice(0, 300)}`);
      return null;
    }
    return {
      title: String(profile.name || "").trim(),
      description: String(profile.biography || "").trim().slice(0, 240),
      logo: /^https:\/\//i.test(String(profile.profile_picture_url || ""))
        ? String(profile.profile_picture_url)
        : "",
      website: String(profile.website || "").trim(),
    };
  } catch (error) {
    console.error(`[instagram] business_discovery ${handle} failed: ${error?.name || ""} ${error?.message || error}`);
    return null;
  }
}
