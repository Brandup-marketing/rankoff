import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { accountFrom, listingIdentity } from '../../platform-identity.js';
import { discoveryCopy } from '../../discovery.js';
import { buildCardModel } from '../../share-card.js';

const source = readFileSync(new URL('../../app.js', import.meta.url), 'utf8');
function bind(name, env) {
  const declaration = source.match(new RegExp(`(?:async )?function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}`))?.[0];
  assert.ok(declaration, `${name} exists`);
  return new Function('env', `with (env) { return (${declaration}); }`)(env);
}
function submitHandler(element, env) {
  const marker = `elements.${element}?.addEventListener("submit", async (event) => {`;
  const body = source.split(marker)[1].split('\n  });')[0];
  return new Function('env', `with (env) { return async function(event) {${body}}; }`)(env);
}
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};
const row = (id, category, minor) => ({ rank: 1, listing: { id, category, title: id, hostname: `${id}.com`, url: `https://${id}.com/` }, bid: { amount_minor: minor } });
const payload = (rankings = [], extra = {}) => ({ mode: 'production', board: { currency: 'USD', min_increment_minor: 200 }, rankings, activity: [], pagination: { total: rankings.length, page: 1, page_size: 50, total_pages: 1 }, ...extra });

function context() {
  const button = { disabled: false };
  const state = { listings: [], quoteListings: null, activity: [], category: 'Marketing', country: 'MY', activeWindow: 'today', language: 'en' };
  const env = {
    servedFromWeb: true, boardSource: 'production', viewLoading: false, checkoutPending: false,
    state, chosenMarket: null, quoteRequestId: 0, quoteLoading: false, pendingChallenge: { url: new URL('https://returning.com/'), category: 'Marketing' }, activeBid: { type: 'new' },
    remoteCurrency: 'USD', remoteMinIncrement: 2, remoteRequestId: 0, boardPage: 1, remotePagination: null, remoteLeader: null,
    availableCountries: [], marketsWithListings: new Set(), lastRemoteActivityContext: '', pendingActivityAnimationId: '', remoteNextBid: null, remoteSnapshotId: null, boardViewSent: true,
    loadedView: { category: 'all', country: 'all', period: 'all', page: 1 },
    categories: ['Marketing', 'Beauty'], DEFAULT_CATEGORY: 'all', PAGE_SIZE: 50, MAX_BID: 1_000_000, BOARD_API_ENDPOINT: '/api/v1/board',
    window: { location: { protocol: 'https:', href: 'https://rankoff.my/' } },
    document: { querySelector: () => null },
    elements: { inlineSubmit: { disabled: false }, bidForm: { querySelector: () => button }, boardList: { setAttribute() {}, removeAttribute() {} },
      bidAmount: { value: '2' }, dialogRank: {}, dialogPrice: {}, dialogPrevious: {}, dialogNow: {}, dialogAfter: {}, dialogContext: {} },
    URL, accountFrom, listingIdentity, discoveryCopy,
    canonicalCategory: (value) => value, categoryName: (value) => value,
    money: (value) => `US$ ${value}`, currency: null, boardCurrencyFormat: () => ({}), cloneListing: (value) => structuredClone(value),
    getBid: (listing, period = state.activeWindow) => listing.bids[period],
    render() {}, saveState() {}, syncBoardViewUrl() {}, loadAudienceStats() {}, mergeCounterpartClicks() {}, recordBoardView() {},
    languageText: (key) => key, discoveryLanguage: () => state.language,
    toasts: [], showToast(message) { env.toasts.push(message); },
  };
  for (const name of ['canReviewPayment', 'hasCurrentQuote', 'paymentPreviewPeriod', 'syncCheckoutControls', 'invalidateQuote', 'dollarsFromMinor', 'normalizedClickCount', 'normalizeApiRanking', 'existingListingForPending', 'boardMinimum', 'nextWholeAbove', 'priceAbove', 'loadChosenMarket', 'overallRank', 'projectedRank', 'updateBidPreview', 'refreshBoardFromApi', 'changeBoardView']) env[name] = bind(name, env);
  env.initialsFor = () => 'R';
  return env;
}

test('served pages cannot simulate payment or replace SSR pricing before a live board loads', async () => {
  const env = context(); env.boardSource = 'local';
  env.syncCheckoutControls();
  assert.equal(env.elements.inlineSubmit.disabled, true);
  assert.equal(env.elements.bidForm.querySelector().disabled, true);
  assert.equal(bind('applyBid', env)(2), null);
  for (const element of ['inlineChallenge', 'bidForm']) {
    await submitHandler(element, env)({ preventDefault() {} });
  }
  assert.deepEqual(env.toasts, ['checkoutUnavailable', 'checkoutUnavailable']);
  env.document = { querySelector() { throw new Error('SSR price must be retained'); }, querySelectorAll() { throw new Error('SSR price must be retained'); } };
  bind('updateCurrencyCopy', env)();
  bind('renderMetadata', env)();
});

test('a returning merchant keeps all-time payment credit and rank while browsing Today', async () => {
  const env = context();
  env.readCompleteBoard = async (url) => {
    assert.equal(url.searchParams.get('period'), 'all');
    assert.equal(url.searchParams.get('category'), 'all');
    return payload([row('rival', 'Marketing', 1100), row('returning', 'Marketing', 1000)]);
  };
  assert.equal(await env.loadChosenMarket('Marketing'), true);
  assert.equal(env.existingListingForPending().bids.all, 10);
  assert.equal(env.projectedRank(2), 1);
  assert.equal(env.overallRank(2), 1);
  env.updateBidPreview();
  assert.equal(env.elements.dialogPrevious.textContent, 'US$ 10');
  assert.equal(env.elements.dialogAfter.textContent, 'US$ 12');
  assert.match(env.elements.dialogContext.textContent, /Marketing · all-time/);
  assert.doesNotMatch(env.elements.dialogContext.textContent, /24h|today/);
});

test('older quote responses and invalidated requests cannot replace the latest chosen industry', async () => {
  const env = context(), first = deferred(), second = deferred();
  const queue = [first, second]; env.readCompleteBoard = () => queue.shift().promise;
  const old = env.loadChosenMarket('Marketing');
  const current = env.loadChosenMarket('Beauty');
  second.resolve(payload([row('beauty', 'Beauty', 200)]));
  assert.equal(await current, true);
  first.resolve(payload([row('marketing', 'Marketing', 10000)]));
  assert.equal(await old, null);
  assert.equal(env.chosenMarket.category, 'Beauty');
  const third = deferred(); env.readCompleteBoard = () => third.promise;
  const obsolete = env.loadChosenMarket('Marketing'); env.invalidateQuote();
  third.resolve(payload([row('returning', 'Marketing', 1000)]));
  assert.equal(await obsolete, null);
  assert.equal(env.chosenMarket, null);
  assert.equal(env.state.quoteListings, null);
});

test('superseded industry and page requests cannot roll back newer data or show a failure toast', async () => {
  const env = context(); Object.assign(env.state, { category: 'all', country: 'all', activeWindow: 'all' });
  const first = deferred(), second = deferred(); const queue = [first, second]; env.fetch = () => queue.shift().promise;
  const old = env.changeBoardView({ category: 'Marketing', page: 2 });
  const current = env.changeBoardView({ category: 'Beauty', page: 1 });
  second.resolve(Response.json(payload([row('beauty', 'Beauty', 200)])));
  assert.equal(await current, true);
  first.resolve(new Response('', { status: 503 }));
  assert.equal(await old, null);
  assert.equal(env.state.category, 'Beauty');
  assert.equal(env.boardPage, 1);
  assert.equal(env.state.listings[0].id, 'beauty');
  assert.deepEqual(env.toasts, []);
});

test('a failed new filter restores the last successfully loaded scope, including during another request', async () => {
  const env = context(); Object.assign(env.state, { category: 'all', country: 'all', activeWindow: 'all' });
  env.state.listings = [{ id: 'old-global' }];
  const first = deferred(), second = deferred(); const queue = [first, second]; env.fetch = () => queue.shift().promise;
  const old = env.changeBoardView({ category: 'Marketing' });
  const current = env.changeBoardView({ category: 'Beauty' });
  second.resolve(new Response('', { status: 503 }));
  assert.equal(await current, false);
  first.resolve(Response.json(payload([row('wrong', 'Beauty', 200)])));
  assert.equal(await old, null);
  assert.equal(env.state.country, 'all');
  assert.equal(env.state.category, 'all');
  assert.equal(env.state.listings[0].id, 'old-global');
  assert.equal(env.toasts.length, 1);
});

test('sharing a later page preserves its real rank, industry, timeframe and Malay card', async () => {
  const env = context(); env.state.language = 'ms'; env.boardPage = 2;
  env.state.listings = [{ id: 'returning', name: 'Returning', serverRank: 51, category: 'Marketing', bids: { today: 2, all: 100 } }];
  env.listingDetailPath = () => '/product/returning.com'; env.cardStamp = () => '20 Sep 2026';
  let shared; env.window.RankoffShare = { open: (value) => { shared = value; } };
  await bind('shareListing', env)('returning');
  assert.match(shared.title, /#51/);
  assert.match(shared.title, /Marketing · 24 jam lalu/);
  assert.doesNotMatch(shared.text, /Claim #1|#1 /);
  const url = new URL(shared.url);
  assert.equal(url.searchParams.get('country'), null);
  assert.equal(url.searchParams.get('category'), 'Marketing');
  assert.equal(url.searchParams.get('period'), 'today');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(url.searchParams.get('lang'), 'ms');
  const card = buildCardModel(shared);
  assert.equal(card.place, 51); assert.equal(card.period, 'today'); assert.equal(card.total, 'US$ 2'); assert.equal(card.language, 'ms');
});
