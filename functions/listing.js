import { isProduction, requireDatabase } from "./_lib/config.js";
import { normalizeSlug, productPath } from "./_lib/product.js";
import { loadApprovedDestination } from "./_lib/repository.js";

// Links shared before /product/<hostname> existed still point here. Send them on
// so an old WhatsApp message keeps working and search keeps one canonical page.
export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const id = url.searchParams.get("id");

  if (id && isProduction(context.env)) {
    try {
      const listing = await loadApprovedDestination(requireDatabase(context.env), id);
      const hostname = normalizeSlug(listing?.hostname);
      if (hostname) return Response.redirect(new URL(productPath(hostname), url.origin).toString(), 301);
    } catch {
      /* Fall through to the shell: a database hiccup should not break an old link. */
    }
  }

  if (context.env.ASSETS?.fetch) return context.env.ASSETS.fetch(new Request(new URL("/listing", url.origin)));
  return context.next();
}
