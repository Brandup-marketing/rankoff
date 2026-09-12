import { applyLiveCurrency, serveLocalizedAsset } from "./_lib/static-localization.js";
import { defaultBoardSlug, isProduction, requireDatabase } from "./_lib/config.js";
import { loadBoard } from "./_lib/repository.js";
import { escapeHtml, formatMoney } from "./_lib/product.js";

export async function onRequestGet(context) {
  const response = await serveLocalizedAsset(context, "/about.html", "about");
  if (!isProduction(context.env) || !response.ok) return response;
  try {
    const board = await loadBoard(requireDatabase(context.env), defaultBoardSlug(context.env));
    const floor = escapeHtml(formatMoney(board.min_increment_minor, board.currency).replace(" ", "\u00a0"));
    // One shared pass, run after localisation, so the Chinese copy is covered too.
    const html = applyLiveCurrency(await response.text(), floor, board.currency);
    return new Response(html, { status: response.status, headers: response.headers });
  } catch {
    return response;
  }
}
