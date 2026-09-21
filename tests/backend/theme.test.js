import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../theme-boot.js', import.meta.url), 'utf8');
function boot(saved, { blocked = false, reset = false } = {}) {
  const root = { dataset: {} };
  let color;
  let onChange;
  const context = vm.createContext({
    document: { documentElement: root, querySelector: () => ({ setAttribute: (_, value) => { color = value; } }) },
    location: { href: `https://rankoff.my/${reset ? '?reset' : ''}` }, URL,
    localStorage: { getItem: () => { if (blocked) throw Error('Storage blocked'); return saved; } },
    MutationObserver: class { constructor(fn) { onChange = fn; } observe() {} },
  });
  vm.runInContext(source, context);
  return { root, color: () => color, sync: () => onChange() };
}

test('first visits and unusable preferences paint dark without needing storage writes', () => {
  // Dark and English are the first-visit defaults (2026-09-20). Nothing about
  // the device — system colour scheme, browser language — changes that.
  for (const saved of [null, '{}', '{broken', '{"language":"ms"}', '{"theme":"unknown"}']) {
    const state = boot(saved);
    assert.equal(state.root.dataset.theme, 'dark');
    assert.equal(state.color(), '#090a0c');
  }
  assert.equal(boot(null, { blocked: true }).root.dataset.theme, 'dark');
});

test('a saved light choice is preserved and browser chrome follows later theme toggles', () => {
  const state = boot('{"theme":"light","language":"zh"}');
  assert.equal(state.root.dataset.theme, 'light');
  assert.equal(state.color(), '#faf7f5');
  state.root.dataset.theme = 'dark';
  state.sync();
  assert.equal(state.color(), '#090a0c');
  assert.equal(boot('{"theme":"light"}', { reset: true }).root.dataset.theme, 'dark');
});

test('every public shell ships the dark default in its initial HTML, so nothing flashes', () => {
  for (const page of ['index', 'about', 'categories', 'listing', 'legal', 'answers/pay-to-rank-leaderboard', 'answers/how-rankoff-ranking-works', 'answers/sponsor-a-public-link', 'answers/business-exposure-malaysia']) {
    const html = readFileSync(new URL(`../../${page}.html`, import.meta.url), 'utf8');
    assert.match(html, /<html lang="en" data-theme="dark">/, page);
    assert.match(html, /<meta name="theme-color" content="#090a0c" \/>/, page);
    // The boot script must run before the stylesheet so a saved light choice
    // never paints dark first.
    assert.ok(html.indexOf('/theme-boot.js?v=') < html.indexOf('styles.css?v='), page);
  }
  const css = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /prefers-color-scheme/);
});

const localeBoot = readFileSync(new URL('../../locale-boot.js', import.meta.url), 'utf8');
function bootLocale(href, { saved = null, blocked = false, checkoutLanguage = null } = {}) {
  const replaced = [];
  const session = new Map();
  if (checkoutLanguage) session.set('rankoff-checkout-language', checkoutLanguage);
  const context = vm.createContext({
    URL, history: { replaceState() {} },
    location: { href, replace: (url) => replaced.push(String(url)) },
    localStorage: { getItem: () => { if (blocked) throw Error('Storage blocked'); return saved; } },
    sessionStorage: { getItem: (key) => session.get(key) ?? null, setItem: (key, value) => session.set(key, value) },
    window: {},
  });
  vm.runInContext(localeBoot, context);
  return { replaced, locale: context.window.RankoffLocale };
}

test('the first visit is English; a saved Chinese or Malay choice loads that page before paint', () => {
  assert.deepEqual(bootLocale('https://rankoff.my/').replaced, []);
  assert.equal(bootLocale('https://rankoff.my/').locale.language, 'en');
  assert.equal(bootLocale('https://rankoff.my/', { blocked: true }).locale.language, 'en');
  assert.deepEqual(bootLocale('https://rankoff.my/about', { saved: '{"language":"zh","theme":"light"}' }).replaced, ['https://rankoff.my/about?lang=zh']);
  assert.deepEqual(bootLocale('https://rankoff.my/?period=today', { saved: '{"language":"ms"}' }).replaced, ['https://rankoff.my/?period=today&lang=ms']);
});

test('an explicit ?lang link, ?reset and a checkout return are never overridden by the saved language', () => {
  assert.deepEqual(bootLocale('https://rankoff.my/?lang=en', { saved: '{"language":"zh"}' }).replaced, []);
  assert.equal(bootLocale('https://rankoff.my/?lang=ms', { saved: '{"language":"zh"}' }).locale.isMalay, true);
  assert.deepEqual(bootLocale('https://rankoff.my/?reset', { saved: '{"language":"zh"}' }).replaced, []);
  const back = bootLocale('https://rankoff.my/?checkout=returned&bid=b1', { saved: '{"language":"ms"}', checkoutLanguage: 'zh' });
  assert.deepEqual(back.replaced, []);
  assert.equal(back.locale.language, 'zh');
});

test('home restores appearance before parsing shared URLs and excludes cached demo listings', () => {
  const app = readFileSync(new URL('../../app.js', import.meta.url), 'utf8');
  const load = app.slice(app.indexOf('  function loadState()'), app.indexOf('  function saveState()'));
  const context = vm.createContext({
    URL, servedFromWeb: true, DEFAULT_CATEGORY: 'all', STORE_KEY: 'rankoff-mvp-demo-v3',
    window: {
      location: { href: 'https://rankoff.my/' },
      localStorage: { getItem: () => JSON.stringify({ theme:'dark', language:'zh', category:'Beauty', listings:[{id:'old-demo'}] }) },
    },
  });
  const state = vm.runInContext(`${load}\nloadState()`, context);
  assert.equal(state.theme, 'dark');
  assert.equal(state.language, 'zh');
  assert.equal(state.category, 'all');
  assert.equal(state.listings.length, 0);
});

test('public headers retain the original brand artwork', () => {
  const pages = [
    '../../index.html',
    '../../categories.html',
    '../../about.html',
    '../../listing.html',
    '../../legal.html',
    '../../answers/pay-to-rank-leaderboard.html',
    '../../answers/sponsor-a-public-link.html',
    '../../answers/how-rankoff-ranking-works.html',
  ];
  for (const page of pages) {
    const html = readFileSync(new URL(page, import.meta.url), 'utf8');
    assert.match(html, /class="brand-mark" src="\/assets\/rankoff-favicon\.png\?v=1"/);
  }
  const css = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /\.brand \.brand-mark \{ content:/);
});
