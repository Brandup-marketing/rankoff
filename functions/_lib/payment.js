import { ApiError, ServiceUnavailableError, isProduction } from "./config.js";
import { readText } from "./http.js";

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
  const returnUrl = env.DODO_RETURN_URL || "https://rankoff.my/?checkout=returned";
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
      feature_flags: { allow_tax_id: false },
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
