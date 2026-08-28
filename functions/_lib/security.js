import { ApiError } from "./config.js";

export async function sha256Hex(value) {
  const data = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

export async function hmacSha256Hex(secret, value) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

export async function verifyStandardWebhook(rawBody, headers, secret, toleranceSeconds = 300) {
  if (!secret) throw new ApiError(503, "webhook_secret_missing", "Webhook verification is not configured.");
  const eventId = headers.get("webhook-id") || "";
  const timestamp = headers.get("webhook-timestamp") || "";
  const signatureHeader = headers.get("webhook-signature") || "";
  const timestampNumber = Number(timestamp);
  if (!eventId || !Number.isFinite(timestampNumber) || !signatureHeader) {
    throw new ApiError(401, "invalid_webhook_signature", "Webhook signature headers are missing.");
  }
  if (Math.abs(Date.now() / 1000 - timestampNumber) > toleranceSeconds) {
    throw new ApiError(401, "stale_webhook", "The webhook timestamp is outside the accepted window.");
  }

  const rawSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let keyBytes;
  try {
    keyBytes = Uint8Array.from(atob(rawSecret), (character) => character.charCodeAt(0));
    if (!keyBytes.length) throw new Error("empty secret");
  } catch {
    keyBytes = new TextEncoder().encode(secret);
  }
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${eventId}.${timestamp}.${rawBody}`)));
  const expected = bytesToBase64(signature);
  const candidates = signatureHeader.split(/\s+/).map((part) => part.trim()).filter(Boolean).map((part) => part.startsWith("v1,") ? part.slice(3) : part);
  const valid = candidates.some((candidate) => timingSafeEqual(new TextEncoder().encode(candidate), new TextEncoder().encode(expected)));
  if (!valid) throw new ApiError(401, "invalid_webhook_signature", "Webhook signature verification failed.");
  return eventId;
}

export async function safeSecretEqual(actual, expected) {
  if (!actual || !expected) return false;
  const [left, right] = await Promise.all([sha256Bytes(actual), sha256Bytes(expected)]);
  return timingSafeEqual(left, right);
}

export async function requireAdmin(request, env) {
  if (!env.ADMIN_API_TOKEN) {
    throw new ApiError(503, "admin_auth_unavailable", "Admin access is not configured.");
  }
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!(await safeSecretEqual(token, env.ADMIN_API_TOKEN))) {
    throw new ApiError(401, "unauthorized", "A valid invite or admin credential is required.");
  }
}

export function timingSafeEqual(left, right) {
  if (!(left instanceof Uint8Array) || !(right instanceof Uint8Array)) return false;
  let mismatch = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    mismatch |= (left[index % left.length] || 0) ^ (right[index % right.length] || 0);
  }
  return mismatch === 0;
}

export function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function sha256Bytes(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return new Uint8Array(digest);
}
