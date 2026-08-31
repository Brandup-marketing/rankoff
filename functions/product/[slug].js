import { methodNotAllowed } from "../_lib/http.js";
import { renderDetail } from "../_lib/detail.js";
import { normalizeHost, platformKeyFor } from "../_lib/platform.js";

// Websites keep the address they were first shared at.
export async function onRequestGet(context) {
  const hostname = normalizeHost(context.params.slug);
  const valid = hostname
    && !platformKeyFor(hostname)
    && !/^\d+\.\d+\.\d+\.\d+$/.test(hostname)
    && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(hostname);
  return renderDetail(context, valid ? hostname : "");
}

export function onRequest() {
  return methodNotAllowed(["GET"]);
}
