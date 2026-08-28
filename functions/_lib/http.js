import { ApiError, ServiceUnavailableError } from "./config.js";

const MAX_JSON_BYTES = 16 * 1024;

export function json(data, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export async function readJson(request) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BYTES) {
    throw new ApiError(413, "payload_too_large", "The request body is too large.");
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_JSON_BYTES) {
    throw new ApiError(413, "payload_too_large", "The request body is too large.");
  }

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
    { status },
  );
}

export function getRequestId(context) {
  return context.data.requestId || crypto.randomUUID();
}

export function getClientIp(request) {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}
