import { ApiError, ServiceUnavailableError } from "./config.js";

export async function createDodoCheckout(env, bid) {
  if (!env.DODO_PAYMENTS_API_KEY || !env.DODO_PRODUCT_ID) {
    throw new ServiceUnavailableError(
      "payment_configuration_missing",
      "Hosted checkout is not configured yet.",
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
      return_url: returnUrl,
      metadata: {
        rankoff_bid_id: bid.id,
        rankoff_listing_id: bid.listingId,
        rankoff_board_id: bid.boardId,
      },
    }),
  });

  if (!response.ok) {
    throw new ApiError(502, "checkout_provider_error", "Hosted checkout could not be created.");
  }
  const payload = await response.json();
  if (!payload?.session_id || !payload?.checkout_url) {
    throw new ApiError(502, "checkout_provider_error", "Hosted checkout returned an invalid response.");
  }
  return {
    sessionId: String(payload.session_id),
    paymentId: payload.payment_id ? String(payload.payment_id) : null,
    checkoutUrl: String(payload.checkout_url),
  };
}
