import { serveLocalizedAsset } from "./_lib/static-localization.js";

export function onRequestGet(context) {
  return serveLocalizedAsset(context, "/categories.html", "categories");
}
