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

test('first visits and unusable preferences paint light without needing storage writes', () => {
  for (const saved of [null, '{}', '{broken', '{"language":"ms"}', '{"theme":"unknown"}']) {
    const state = boot(saved);
    assert.equal(state.root.dataset.theme, 'light');
    assert.equal(state.color(), '#faf7f5');
  }
  assert.equal(boot(null, { blocked: true }).root.dataset.theme, 'light');
});

test('saved dark is preserved and browser chrome follows later theme toggles', () => {
  const state = boot('{"theme":"dark","language":"zh"}');
  assert.equal(state.root.dataset.theme, 'dark');
  assert.equal(state.color(), '#090a0c');
  state.root.dataset.theme = 'light';
  state.sync();
  assert.equal(state.color(), '#faf7f5');
  assert.equal(boot('{"theme":"dark"}', { reset: true }).root.dataset.theme, 'light');
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
