// Server-side Purchase reporting for Meta advertising measurement.
//
// The browser Purchase in meta-pixel.js can only fire while the buyer is still
// on the page: close the tab on the way back from the hosted checkout, or block
// the pixel, and a real sale is never counted. This path reports the same
// payment from the settlement webhook, so the count does not depend on the
// buyer's browser at all.
//
// Both events carry the bid id as their event id, which is how Meta recognises
// them as one payment and does not count the sale twice.
//
// Secrets arrive only through Cloudflare bindings. Absent credentials are a
// normal development state and must leave settlement completely untouched.

const FETCH_TIMEOUT_MS = 4000;
const GRAPH_VERSION = "v25.0";
const DEFAULT_PIXEL_ID = "1381116680322454";

// Meta matches on hashes, never on the address itself, and it only matches when
// both sides normalise identically before hashing.
async function hash(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function digitsOnly(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits || null;
}

function placeName(value) {
  const cleaned = String(value ?? "").trim().toLowerCase().replace(/[^a-z]/g, "");
  return cleaned || null;
}

// Only what the payment provider actually told us about the buyer. The webhook
// request comes from Dodo, so this process never sees the buyer's own IP or
// user agent — sending Dodo's would be a false signal, so neither is sent.
export async function buyerMatchKeys(buyer) {
  const entries = await Promise.all([
    hash(buyer?.email).then((v) => ["em", v]),
    hash(digitsOnly(buyer?.phone)).then((v) => ["ph", v]),
    hash(String(buyer?.name || "").trim().split(/\s+/)[0]).then((v) => ["fn", v]),
    hash(placeName(buyer?.city)).then((v) => ["ct", v]),
    hash(placeName(buyer?.state)).then((v) => ["st", v]),
    hash(digitsOnly(buyer?.zipcode)).then((v) => ["zp", v]),
    hash(buyer?.country).then((v) => ["country", v]),
  ]);
  const userData = {};
  for (const [key, value] of entries) if (value) userData[key] = [value];
  return userData;
}

export async function reportSettledPurchase({ bid, buyer, eventSourceUrl, eventTime, env, fetcher = fetch }) {
  const accessToken = String(env?.META_CAPI_TOKEN || "");
  const pixelId = String(env?.META_PIXEL_ID || DEFAULT_PIXEL_ID).replace(/\D/g, "");
  const bidId = String(bid?.id || "").trim();
  const amountMinor = Number(bid?.amount_minor);
  const currency = String(bid?.currency || "").trim().toUpperCase();
  if (!accessToken || !pixelId || !bidId) return null;
  // The amount comes from the settled record. Without a real figure, report
  // nothing rather than send Meta an invented sale value.
  if (!Number.isFinite(amountMinor) || amountMinor <= 0 || !/^[A-Z]{3}$/.test(currency)) return null;

  const event = {
    event_name: "Purchase",
    event_time: Math.floor((Number(eventTime) || Date.now()) / 1000),
    event_id: bidId,
    action_source: "website",
    user_data: await buyerMatchKeys(buyer),
    custom_data: { value: amountMinor / 100, currency },
  };
  if (eventSourceUrl) event.event_source_url = String(eventSourceUrl);

  const version = String(env?.META_GRAPH_API_VERSION || GRAPH_VERSION).replace(/[^v0-9.]/g, "") || GRAPH_VERSION;
  try {
    const response = await fetcher(`https://graph.facebook.com/${version}/${pixelId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ data: [event], access_token: accessToken }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      // A silent refusal here looks identical to a board with no sales, so the
      // reason is logged. The token itself is never written anywhere.
      let reason = "";
      try {
        reason = String((await response.json())?.error?.message || "").slice(0, 300);
      } catch {
        /* A non-JSON error body is not worth a second failure. */
      }
      console.log(`[meta-capi] purchase rejected ${response.status} ${reason}`);
      return false;
    }
    return true;
  } catch (error) {
    console.log(`[meta-capi] purchase not sent: ${String(error?.name || error).slice(0, 120)}`);
    return false;
  }
}
