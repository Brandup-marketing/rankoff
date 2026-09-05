import { isProduction, requireDatabase } from "./_lib/config.js";
import { canonicalDetailPath } from "./_lib/product.js";
import { loadApprovedDestination } from "./_lib/repository.js";

// Links shared before /product/<hostname> existed still point here. Send them on
// so an old WhatsApp message keeps working and search keeps one canonical page.
export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const id = url.searchParams.get("id");

  if (id && isProduction(context.env)) {
    try {
      const listing = await loadApprovedDestination(requireDatabase(context.env), id);
      const path = canonicalDetailPath(listing?.hostname);
      if (path) {
        const target = new URL(path, url.origin);
        if (url.searchParams.get("lang") === "zh") target.searchParams.set("lang", "zh");
        return Response.redirect(target.toString(), 301);
      }
    } catch {
      /* Fall through to the shell: a database hiccup should not break an old link. */
    }
  }

  if (context.env.ASSETS?.fetch) return context.env.ASSETS.fetch(new Request(new URL("/listing", url.origin)));
  return context.next();
}
