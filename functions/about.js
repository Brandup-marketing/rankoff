import { serveLocalizedAsset } from "./_lib/static-localization.js";
import { defaultBoardSlug, isProduction, requireDatabase } from "./_lib/config.js";
import { loadBoard } from "./_lib/repository.js";
import { escapeHtml, formatMoney } from "./_lib/product.js";

export async function onRequestGet(context) {
  const response = await serveLocalizedAsset(context, "/about.html", "about");
  if (!isProduction(context.env) || !response.ok) return response;
  try {
    const board = await loadBoard(requireDatabase(context.env), defaultBoardSlug(context.env));
    const floor = escapeHtml(formatMoney(board.min_increment_minor, board.currency).replace(" ", "\u00a0"));
    const html = (await response.text())
      .replaceAll("US$1", floor)
      .replaceAll("Enter your website, choose a market, and pay from US$1.", `Enter your website, choose a market, and pay from ${floor}.`)
      .replaceAll("输入网站、选择市场，US$1 起付款。", `输入网站、选择市场，${floor} 起付款。`)
      .replace(/(<span class="rules-glyph" aria-hidden="true">)(?:US\$|RM)(<\/span>)/, `$1${board.currency === "MYR" ? "RM" : "US$"}$2`);
    return new Response(html, { status: response.status, headers: response.headers });
  } catch {
    return response;
  }
}
