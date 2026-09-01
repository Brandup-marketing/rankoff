import { ApiError, ServiceUnavailableError, isProduction } from "./config.js";
import { readText } from "./http.js";

export const DEFAULT_CHECKOUT_RETURN_URL = "https://rankoff.my/?checkout=returned";

// The provider sends the buyer back to a fixed URL, so the page that greets them
// used to have no idea who had just paid. Carrying the bid id back lets the
// return page watch the board for that exact bid and congratulate the merchant
// by position. The owner-configured DODO_RETURN_URL is honoured as-is; the id is
// appended to whatever it already is, so no environment variable has to change.
export function buildCheckoutReturnUrl(configuredUrl, bidId) {
  const base = typeof configuredUrl === "string" && configuredUrl.trim()
    ? configuredUrl.trim()
    : DEFAULT_CHECKOUT_RETURN_URL;
  const id = typeof bidId === "string" ? bidId.trim() : String(bidId ?? "").trim();
  if (!id) return base;
  try {
    const url = new URL(base);
    url.searchParams.set("checkout", url.searchParams.get("checkout") || "returned");
    url.searchParams.set("bid", id);
    return url.toString();
  } catch {
    // A relative or malformed value still deserves the id rather than a throw.
    const [withoutHash, hash] = splitHash(base);
    const separator = withoutHash.includes("?") ? "&" : "?";
    const query = `${separator}checkout=returned&bid=${encodeURIComponent(id)}`;
    return `${withoutHash}${query}${hash}`;
  }
}

function splitHash(value) {
  const index = value.indexOf("#");
  return index === -1 ? [value, ""] : [value.slice(0, index), value.slice(index)];
}

export async function createDodoCheckout(env, bid) {
  if (!env.DODO_PAYMENTS_API_KEY || !env.DODO_PRODUCT_ID) {
    throw new ServiceUnavailableError(
      "payment_configuration_missing",
      "Hosted checkout is not configured yet.",
    );
  }
  if (isProduction(env) && env.DODO_ENVIRONMENT !== "live_mode") {
    throw new ServiceUnavailableError(
      "payment_environment_mismatch",
      "Live checkout requires the live payment environment.",
    );
  }

  const apiBase = env.DODO_ENVIRONMENT === "live_mode"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";
  const returnUrl = buildCheckoutReturnUrl(env.DODO_RETURN_URL, bid.id);
  const response = await fetch(`${apiBase}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.DODO_PAYMENTS_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      product_cart: [{ product_id: env.DODO_PRODUCT_ID, quantity: 1, amount: bid.amountMinor }],
      // Advertising placement is a simple B2C charge: no buyer tax id, and the
      // hosted page's tax-id validation rejects Malaysian formats anyway.
      // A Malaysian merchant is reached on WhatsApp, so the number is worth the
      // extra field; without require_phone_number the provider may return none.
      feature_flags: { allow_tax_id: false, allow_phone_number_collection: true, require_phone_number: true },
      return_url: returnUrl,
      metadata: {
        rankoff_bid_id: bid.id,
        rankoff_listing_id: bid.listingId,
        rankoff_board_id: bid.boardId,
      },
    }),
  });

  if (!response.ok) {
    // Surface the provider's rejection in function logs; the body of a failed
    // checkout-creation call carries no card data or secrets.
    const detail = await response.text().catch(() => "");
    console.log("dodo_checkout_rejected", response.status, detail.slice(0, 500));
    throw new ApiError(502, "checkout_provider_error", "Hosted checkout could not be created.");
  }
  let payload;
  try {
    payload = JSON.parse(await readText(response, { maxBytes: 64 * 1024 }));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(502, "checkout_provider_error", "Hosted checkout returned an invalid response.");
  }
  if (!payload?.session_id || !payload?.checkout_url) {
    throw new ApiError(502, "checkout_provider_error", "Hosted checkout returned an invalid response.");
  }
  return {
    sessionId: String(payload.session_id),
    paymentId: payload.payment_id ? String(payload.payment_id) : null,
    checkoutUrl: String(payload.checkout_url),
  };
}
