import { errorResponse } from "./_lib/http.js";
import { PUBLIC_PAGE, renderMalay, addMalayAlternate } from "./_lib/malay.js";

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
    const url = new URL(context.request.url);
    if (response.ok && PUBLIC_PAGE.test(url.pathname) && (headers.get('Content-Type') || '').includes('text/html')) {
      let html = await response.text(); // Only our bounded public HTML templates.
      if (url.searchParams.get('lang') === 'ms') {
        html = renderMalay(html, url.href);
        headers.set('Content-Language', 'ms');
      }
      html = addMalayAlternate(html, url.href);
      headers.delete('Content-Length');
      headers.delete('ETag');
      return new Response(html, { status: response.status, headers });
    }
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
