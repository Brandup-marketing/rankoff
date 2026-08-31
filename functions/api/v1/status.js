import { defaultBoardSlug, isProduction, paymentConfigurationReady, requireDatabase } from "../../_lib/config.js";
import { json, methodNotAllowed } from "../../_lib/http.js";
import { loadBoard } from "../../_lib/repository.js";

export async function onRequestGet(context) {
  if (!isProduction(context.env)) {
    return json({
      mode: "demo",
      ranking_source: "sample_data",
      listing_submission: { state: "disabled", moderation_required: true },
      checkout: { state: "disabled", charges_possible: false },
    });
  }
  const board = await loadBoard(requireDatabase(context.env), defaultBoardSlug(context.env));
  const checkoutLive = Number(board.checkout_enabled) === 1 && paymentConfigurationReady(context.env);
  return json({
    mode: "production",
    ranking_source: "settled_verified_bids",
    listing_submission: { state: "open", moderation_required: false },
    checkout: { state: checkoutLive ? "live" : "disabled", charges_possible: checkoutLive },
  });
}

export function onRequest() {
  return methodNotAllowed(["GET"]);
}
