import { methodNotAllowed } from "../../_lib/http.js";
import { renderDetail } from "../../_lib/detail.js";
import { platformFor } from "../../_lib/platform.js";

// A social account's permanent address: /profile/instagram/agent_ali
export async function onRequestGet(context) {
  const platform = platformFor(String(context.params.platform || "").toLowerCase());
  const handle = String(context.params.handle || "").toLowerCase().replace(/^@/, "");
  const valid = platform && /^[a-z0-9](?:[a-z0-9._-]{0,58}[a-z0-9])?$/.test(handle);
  return renderDetail(context, valid ? `${platform.key}:${handle}` : "");
}

export function onRequest() {
  return methodNotAllowed(["GET"]);
}
