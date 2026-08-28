import assert from "node:assert/strict";
import test from "node:test";

import { verifyStandardWebhook } from "../../functions/_lib/security.js";

test("standard webhook verifier accepts the expected signed payload", async () => {
  const secretBytes = crypto.getRandomValues(new Uint8Array(32));
  const secret = `whsec_${toBase64(secretBytes)}`;
  const body = JSON.stringify({ type: "payment.succeeded" });
  const id = "evt_test";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const key = await crypto.subtle.importKey("raw", secretBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${body}`)));
  const headers = new Headers({ "webhook-id": id, "webhook-timestamp": timestamp, "webhook-signature": `v1,${toBase64(digest)}` });
  assert.equal(await verifyStandardWebhook(body, headers, secret), id);
  await assert.rejects(verifyStandardWebhook(`${body}x`, headers, secret), /verification failed/);
});

function toBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
