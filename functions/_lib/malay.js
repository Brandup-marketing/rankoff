import { translateMs } from '../../ms-copy.js';

export const PUBLIC_PAGE = /^\/(?:$|index(?:\.html)?$|about(?:\.html)?$|categories(?:\.html)?$|legal(?:\.html)?$|listing(?:\.html)?$|answers\/[^/]+$|product\/[^/]+$|profile\/[^/]+\/[^/]+$)/;
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const decode = value => value.replace(/&(?:amp|lt|gt|quot|apos|#39|nbsp|#\d+|#x[\da-f]+);/gi, entity => {
  const named = {'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&#39;':"'",'&nbsp;':'\u00a0'};
  return named[entity] ?? String.fromCodePoint(parseInt(entity.slice(entity[2] === 'x' ? 3 : 2, -1), entity[2] === 'x' ? 16 : 10));
});
const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
const PROTECTED = /\b(?:data-title|data-description|data-host|data-no-translate|data-share-title|data-inline-url|data-share-url|data-mark)\b|class="[^"]*\b(?:product-name|listing-description|listing-host|brand-word)\b/;

export function malayUrl(raw, base = 'https://rankoff.my/') {
  try {
    const url = new URL(raw, base);
    if (url.origin !== new URL(base).origin || !PUBLIC_PAGE.test(url.pathname)) return raw;
    url.searchParams.set('lang', 'ms');
    return /^https?:/.test(raw) ? url.href : `${url.pathname}${url.search}${url.hash}`;
  } catch { return raw; }
}

export function translateSchema(schema) {
  if (Array.isArray(schema)) return schema.map(translateSchema);
  if (!schema || typeof schema !== 'object') return schema;
  const customer = ['Organization','Thing','Person','ListItem'].includes(schema['@type']);
  return Object.fromEntries(Object.entries(schema).map(([key, value]) => {
    if (key === 'inLanguage') return [key, 'ms-MY'];
    if (typeof value === 'string') {
      if (['url','target'].includes(key)) return [key, malayUrl(value)];
      if (!customer && ['name','description','text'].includes(key)) return [key, translateMs(value)];
      return [key, value];
    }
    return [key, translateSchema(value)];
  }));
}

// Input is our bounded HTML template with escaped listing data. Tokenisation
// keeps attributes, executable scripts, customer names and bios out of copy swaps.
export function renderMalay(html, requestUrl = 'https://rankoff.my/') {
  const url = new URL(requestUrl);
  const stack = [];
  html = html.replace(/<section lang="zh-CN">[\s\S]*?<\/section>/g, '')
    .replace(/<p lang="zh-CN">[\s\S]*?<\/p>/g, '')
    .replace(/<article id="zh-summary"[\s\S]*?<\/article>/, '')
    .replace(/<a href="#zh-summary"[^>]*>[\s\S]*?<\/a>/, '');
  let output = html.replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>|<[^>]+>|[^<]+/gi, token => {
    if (/^<script/i.test(token)) {
      if (!/type="application\/ld\+json"/i.test(token)) return token;
      return token.replace(/(>)([\s\S]*?)(<\/script)/i, (_, open, json, close) => {
        try { return open + JSON.stringify(translateSchema(JSON.parse(json))).replace(/</g, '\\u003c') + close; } catch { return open + json + close; }
      });
    }
    if (/^<(?:style|!)/i.test(token)) return token;
    if (token.startsWith('</')) { stack.pop(); return token; }
    if (token.startsWith('<')) {
      const name = token.match(/^<([\w-]+)/)?.[1]?.toLowerCase();
      const protectedText = stack.at(-1) || PROTECTED.test(token) || /translate="no"/.test(token);
      if (!VOID.has(name) && !token.endsWith('/>')) stack.push(protectedText);
      token = token.replace(/\b(aria-label|placeholder|title|alt)="([^"]*)"/g, (_, key, value) => `${key}="${escape(translateMs(decode(value)))}"`);
      if (name === 'html' || /\blang="en"/.test(token)) token = token.replace(/\blang="[^"]*"/, 'lang="ms"');
      if (name === 'meta') {
        if (/(?:name="(?:description|twitter:title|twitter:description)"|property="og:(?:title|description|image:alt)")/.test(token)) token = token.replace(/content="([^"]*)"/, (_, v) => `content="${escape(translateMs(decode(v)))}"`);
        if (/property="og:locale"/.test(token)) token = token.replace(/content="[^"]*"/, 'content="ms_MY"');
        if (/property="og:url"/.test(token)) token = token.replace(/content="([^"]*)"/, (_, v) => `content="${escape(malayUrl(decode(v)))}"`);
      }
      if (name === 'a' || (name === 'link' && /rel="canonical"/.test(token))) token = token.replace(/href="([^"]*)"/, (_, href) => `href="${escape(malayUrl(decode(href), url.origin + url.pathname))}"`);
      return token;
    }
    return stack.at(-1) ? token : escape(translateMs(decode(token)));
  });
  if (/^\/legal(?:\.html)?$/.test(url.pathname)) output = output.replace('<div class="legal-content">', '<p class="locale-legal-note">Terjemahan Bahasa Melayu ini disediakan untuk kemudahan. <a href="/legal?lang=en">Versi bahasa Inggeris</a> ialah satu-satunya versi yang mengikat di sisi undang-undang.</p><div class="legal-content">');
  return output;
}

export function addMalayAlternate(html, requestUrl) {
  const url = new URL(requestUrl);
  // Use the page's own canonical; do not index campaign parameters or filters.
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (!canonical) return html;
  const base = new URL(decode(canonical), url.origin);
  base.searchParams.delete('lang');
  if (!PUBLIC_PAGE.test(base.pathname)) return html;
  const en = /hreflang="en"/.test(html) ? '' : `<link rel="alternate" hreflang="en" href="${escape(base.href)}" />`;
  return html.replace('</head>', `${en}<link rel="alternate" hreflang="ms" href="${escape(malayUrl(base.href))}" /></head>`);
}
