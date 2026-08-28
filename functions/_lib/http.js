import { ApiError, ServiceUnavailableError } from "./config.js";

const MAX_JSON_BYTES = 16 * 1024;
export const MAX_WEBHOOK_BYTES = 128 * 1024;

export function json(data, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export async function readJson(request) {
  const raw = await readText(request, { maxBytes: MAX_JSON_BYTES });

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new Error("JSON body must be an object");
    }
    return parsed;
  } catch {
    throw new ApiError(400, "invalid_json", "Send a valid JSON object.");
  }
}

export async function readText(message, { maxBytes, errorCode = "payload_too_large" }) {
  const declaredLength = Number(message.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new ApiError(413, errorCode, "The request body is too large.");
  }

  if (!message.body) return "";
  const reader = message.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let raw = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel("payload_too_large");
        throw new ApiError(413, errorCode, "The request body is too large.");
      }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    return raw;
  } finally {
    reader.releaseLock();
  }
}

export function methodNotAllowed(allowed) {
  return json(
    { error: { code: "method_not_allowed", message: "Method not allowed." } },
    { status: 405, headers: { Allow: allowed.join(", ") } },
  );
}

export function errorResponse(error, requestId) {
  const status =
    error instanceof ApiError || error instanceof ServiceUnavailableError
      ? error.status
      : 500;
  const code =
    error instanceof ApiError || error instanceof ServiceUnavailableError
      ? error.code
      : "internal_error";
  const message =
    status >= 500 && code === "internal_error"
      ? "The service could not complete this request."
      : error.message;

  return json(
    {
      error: {
        code,
        message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
      request_id: requestId,
    },
    { status, headers: status === 503 ? { "Retry-After": "30" } : undefined },
  );
}

export function getRequestId(context) {
  return context.data.requestId || crypto.randomUUID();
}

export function getClientIp(request) {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}
