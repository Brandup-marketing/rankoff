import puppeteer from '@cloudflare/puppeteer';
import { safeSecretEqual } from '../../functions/_lib/security.js';

export async function renderSocialImage(env, options) {
  const modules = new Map();
  for (const path of ['/share-card.js', '/ms-copy.js']) {
    const response = await fetch(`https://rankoff.my${path}`);
    if (!response.ok) throw new Error('card_module_unavailable');
    modules.set(path, await response.text());
  }
  const browser = await puppeteer.launch(env.BROWSER);
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = new URL(request.url());
      // Render only our modules and image proxy, without analytics or checkout.
      const allowed = url.origin === 'https://rankoff.my' &&
        (['/robots.txt', '/share-card.js', '/ms-copy.js'].includes(url.pathname) || url.pathname.startsWith('/img/'));
      let result;
      if (!allowed) result = request.abort();
      else if (url.pathname === '/robots.txt') result = request.respond({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body></body></html>' });
      else if (modules.has(url.pathname)) result = request.respond({ status: 200, contentType: 'application/javascript', body: modules.get(url.pathname) });
      else result = request.continue();
      void result.catch(() => {});
    });
    await page.goto('https://rankoff.my/robots.txt', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const bytes = await page.evaluate(async (input, moduleUrl) => {
      const { buildCardModel, renderOgCard } = await import(moduleUrl);
      const blob = await renderOgCard(buildCardModel(input));
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    }, options, 'https://rankoff.my/share-card.js');
    return new Uint8Array(bytes);
  } finally { await browser.close(); }
}

export default {
  async scheduled(_event, env) {
    if (env.SOCIAL_PUBLISHING_ENABLED !== 'true') return;
    const response = await fetch('https://rankoff.my/api/v1/internal/social-publish', {
      method: 'POST', headers: { Authorization: `Bearer ${env.SOCIAL_SERVICE_TOKEN}` }, signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) throw new Error(`social_trigger_http_${response.status}`);
    const result = await response.json();
    if (result.processed) console.log(JSON.stringify({ event: 'social_publisher', ...result }));
  },
  async fetch(request, env) {
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/render') return new Response('Not found', { status: 404 });
    const token = (request.headers.get('authorization') || '').replace(/^Bearer /, '');
    if (!env.SOCIAL_SERVICE_TOKEN || !(await safeSecretEqual(token, env.SOCIAL_SERVICE_TOKEN))) return new Response('Unauthorized', { status: 401 });
    const options = await request.json();
    const image = await renderSocialImage(env, options);
    return new Response(image, { headers: { 'Content-Type': 'image/jpeg' } });
  },
};
