import { errorResponse } from "./_lib/http.js";

export async function onRequest(context) {
  const requestId = context.request.headers.get("CF-Ray") || crypto.randomUUID();
  context.data.requestId = requestId;

  try {
    const response = await context.next();
    const headers = new Headers(response.headers);
    headers.set("X-Request-ID", requestId);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
