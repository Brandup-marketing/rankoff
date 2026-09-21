import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { testDatabase, seedListing, seedPayment, seedConversion } from '../helpers/sqlite.js';
import { loadBoard, loadPublicBoard, loadPublicStats, loadListingRecord, loadSettledPayments, recordSnapshotEntries, loadListingShareCard, saveListingShareCard } from '../../functions/_lib/repository.js';
import { onRequestPost as checkout } from '../../functions/api/v1/bids/index.js';
import { onRequestPost as webhook } from '../../functions/api/webhooks/dodo.js';
import { createDodoCheckout, validateCheckoutProduct } from '../../functions/_lib/payment.js';
import { formatMoney, buildProductView, renderProductPage } from '../../functions/_lib/product.js';
import { currencyNotice } from '../../currency.js';
import { localizeStaticPage } from '../../functions/_lib/static-localization.js';

const product = { is_recurring: false, price: { type: 'one_time_price', currency: 'USD', price: 200,
  pay_what_you_want: true, purchasing_power_parity: false, discount: 0, tax_inclusive: true } };
const secret = Buffer.from('test-only-signature-key').toString('base64');
const envFor = (db) => ({ DB: db, RANKOFF_MODE: 'production', PAYMENTS_ENABLED: 'true', DEFAULT_CURRENCY: 'USD',
  DODO_ENVIRONMENT: 'live_mode', DODO_PRODUCT_ID: 'test-product', DODO_PAYMENTS_API_KEY: 'test-only-key', DODO_PAYMENTS_WEBHOOK_KEY: secret });
const boardOf = (db) => loadBoard(db, 'global');
const readBoard = async (db, options = {}) => loadPublicBoard(db, await boardOf(db), { category: 'all', period: 'all', limit: 50, ...options });
function usdTwoDollarDatabase() {
  const db = testDatabase();
  // Explicit release configuration, not a mutation of the historical migration.
  db.sqlite.exec("UPDATE boards SET min_increment_minor = 200 WHERE id = 'board_global'");
  return db;
}
function paymentRequest(amount, currency = 'USD', key = 'test-request-key') {
  return new Request('https://rankoff.my/api/v1/bids', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify({ listing_id: 'example', amount_minor: amount, currency, agreed_terms: true, terms_version: '2026-09-08' }) });
}
async function sendEvent(db, bidId, currency, amount, type = 'payment.succeeded', eventId = crypto.randomUUID()) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const body = JSON.stringify({ type, timestamp: new Date().toISOString(), data: { metadata: { rankoff_bid_id: bidId }, currency, total_amount: amount, payment_id: `pay-${bidId}` } });
  const sig = createHmac('sha256', Buffer.from(secret, 'base64')).update(`${eventId}.${timestamp}.${body}`).digest('base64');
  const background = [];
  const response = await webhook({ data: {}, request: new Request('https://rankoff.my/api/webhooks/dodo', { method: 'POST', body,
    headers: { 'webhook-id': eventId, 'webhook-timestamp': timestamp, 'webhook-signature': `v1,${sig}` } }), env: envFor(db), waitUntil: (p) => background.push(p) });
  await Promise.all(background);
  return response.json();
}

test('USD checkout binds the product currency, exact amount, and no discounts or currency changes', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    return Response.json(url.includes('/products/') ? product : { session_id: 'session-test', checkout_url: 'https://checkout.example.com/test' });
  });
  const result = await createDodoCheckout(envFor(null), { id: 'test', listingId: 'example', boardId: 'board_global', amountMinor: 200, currency: 'USD' });
  assert.equal(result.sessionId, 'session-test');
  assert.equal(calls.length, 2);
  const body = JSON.parse(calls[1].options.body);
  assert.equal(body.product_cart[0].amount, 200);
  assert.equal(body.billing_currency, 'USD');
  assert.equal(body.feature_flags.allow_currency_selection, false);
  assert.equal(body.feature_flags.allow_discount_code, false);
});

test('wrong currency, fixed price, tax-exclusive or PPP products fail before creating checkout', async (t) => {
  for (const patch of [{ currency: 'MYR' }, { pay_what_you_want: false }, { tax_inclusive: false }, { purchasing_power_parity: true }, { discount: 5 }, { price: 500 }, { type: 'recurring_price' }]) {
    assert.throws(() => validateCheckoutProduct({ ...product, price: { ...product.price, ...patch } }, { currency: 'USD', amountMinor: 200 }), { code: 'payment_product_mismatch' });
  }
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => { requests++; return Response.json({ ...product, price: { ...product.price, currency: 'MYR' } }); });
  await assert.rejects(createDodoCheckout(envFor(null), { amountMinor: 200, currency: 'USD' }), { code: 'payment_product_mismatch' });
  assert.equal(requests, 1);
});

test('MYR originals survive conversion; ranking, category, stats, records and snapshots agree to the cent', async () => {
  const db = testDatabase(); seedListing(db); seedListing(db, 'other'); seedConversion(db);
  seedPayment(db, { id: 'old-myr' }); seedPayment(db, { id: 'new-usd', amount: 100, currency: 'USD' });
  seedPayment(db, { id: 'other-payment', listing: 'other', amount: 200, currency: 'USD' });
  const payload = await readBoard(db);
  assert.deepEqual(payload.rankings.map((r) => [r.listing.id, r.bid.amount_minor, r.bid.currency]), [['example', 225, 'USD'], ['other', 200, 'USD']]);
  // One whole unit above the US$2.25 leader (functions/_lib/pricing.js).
  assert.equal(payload.next_bid_minor, 300);
  const category = await readBoard(db, { category: 'Marketing' });
  assert.equal(category.rankings[0].bid.amount_minor, 225);
  assert.equal((await loadPublicStats(db, await boardOf(db))).settled_revenue_minor, 425);
  assert.equal((await loadListingRecord(db, 'example')).total_minor, 225);
  db.sqlite.exec("INSERT INTO ranking_snapshots VALUES ('snapshot', 'board_global', 'fixture', '2026-09-08T00:00:00.000Z')");
  await recordSnapshotEntries(db, 'snapshot', 'board_global');
  assert.equal(db.sqlite.prepare("SELECT amount_minor FROM ranking_snapshot_entries WHERE listing_id='example'").get().amount_minor, 225);
  const original = db.sqlite.prepare("SELECT amount_minor, currency FROM bids WHERE id='old-myr'").get();
  assert.deepEqual({ ...original }, { amount_minor: 500, currency: 'MYR' });
  const admin = await loadSettledPayments(db, await boardOf(db), { limit: 50 });
  assert.deepEqual(admin.summary.totals, [{ currency: 'MYR', total_minor: 500, settled_count: 1 }, { currency: 'USD', total_minor: 300, settled_count: 2 }]);
  db.sqlite.close();
});

test('unconverted foreign payments fail closed and fixed rates cannot drift', async () => {
  const db = testDatabase(); seedListing(db); seedPayment(db, { id: 'legacy' });
  await assert.rejects(boardOf(db), { code: 'currency_conversion_missing' });
  seedConversion(db);
  assert.throws(() => db.sqlite.exec('UPDATE board_currency_rates SET denominator = 5'), /immutable/);
  assert.throws(() => db.sqlite.exec('DELETE FROM board_currency_rates'), /immutable/);
  db.sqlite.close();
});

test('a currency cutover preserves merchant identity, logos, ranks and accumulated traffic', async () => {
  const db = testDatabase(); seedListing(db); seedListing(db, 'other');
  db.sqlite.exec("UPDATE boards SET currency = 'MYR', min_increment_minor = 500 WHERE id = 'board_global'");
  seedPayment(db, { id: 'old', amount: 1000 }); seedPayment(db, { id: 'other-old', listing: 'other', amount: 500 });
  db.sqlite.exec("UPDATE listings SET favicon_url = 'https://example.com/original-logo.png' WHERE id = 'example'; INSERT INTO page_events VALUES ('visit', 'board_global', 'board_viewed', NULL, 'original-session', '2026-09-01T00:00:00Z'); INSERT INTO click_events VALUES ('click', 'board_global', 'example', NULL, 1, 'original-session', 'example.com', '2026-09-01T00:00:00Z')");
  const before = await readBoard(db);
  const originalEvents = db.sqlite.prepare('SELECT * FROM click_events').all();
  const originalPages = db.sqlite.prepare('SELECT * FROM page_events').all();
  const beforeStats = await loadPublicStats(db, await boardOf(db));
  seedConversion(db);
  db.sqlite.exec("UPDATE boards SET currency = 'USD', min_increment_minor = 200 WHERE id = 'board_global'");
  const after = await readBoard(db);
  assert.deepEqual(after.rankings.map(r => [r.rank, r.listing, r.clicks]), before.rankings.map(r => [r.rank, r.listing, r.clicks]));
  const afterStats = await loadPublicStats(db, await boardOf(db));
  assert.equal(afterStats.total_visitors, beforeStats.total_visitors);
  assert.equal(afterStats.total_clicks, beforeStats.total_clicks);
  assert.deepEqual(db.sqlite.prepare('SELECT * FROM click_events').all(), originalEvents);
  assert.deepEqual(db.sqlite.prepare('SELECT * FROM page_events').all(), originalPages);
  assert.equal(afterStats.settled_revenue_minor, 375);
  assert.equal(db.sqlite.prepare('SELECT SUM(amount_minor) AS total FROM bids').get().total, 1500);
  db.sqlite.close();
});

test('conversion rounds each original payment and retains the existing tie-break for equal totals', async () => {
  const db = usdTwoDollarDatabase(); seedListing(db); seedListing(db, 'earlier'); seedConversion(db);
  seedPayment(db, { id: 'myr-one', amount: 501, at: '2026-09-01T00:00:00.000Z' });
  seedPayment(db, { id: 'myr-two', amount: 501, at: '2026-09-02T00:00:00.000Z' });
  seedPayment(db, { id: 'earlier-usd', listing: 'earlier', amount: 250, currency: 'USD', at: '2026-09-01T00:00:00.000Z' });
  const board = await readBoard(db);
  assert.deepEqual(board.rankings.map((entry) => [entry.listing.id, entry.bid.amount_minor]), [['earlier', 250], ['example', 250]]);
  assert.equal(board.next_bid_minor, 300);
  assert.equal(db.sqlite.prepare("SELECT SUM(amount_minor) AS original FROM bids WHERE listing_id = 'example'").get().original, 1002);
  db.sqlite.close();
});

test('pre-conversion share cards are retained but not served on the USD board', async () => {
  const db = testDatabase(); seedListing(db); seedConversion(db);
  const card = { listingId: 'example', contentType: 'image/png', width: 1200, height: 630,
    bytes: 3, image: new Uint8Array([1, 2, 3]), updatedAt: '2026-09-01T00:00:00.000Z' };
  await saveListingShareCard(db, card);
  assert.equal(await loadListingShareCard(db, 'example'), null);
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM listing_share_cards').get().n, 1);
  await saveListingShareCard(db, { ...card, updatedAt: '2026-09-08T00:01:00.000Z' });
  assert.equal((await loadListingShareCard(db, 'example')).bytes, 3);
  db.sqlite.close();
});

test('US$2 checkout, idempotency, signed settlement, repeat payment and reversal work end to end', async (t) => {
  const db = usdTwoDollarDatabase(); seedListing(db); seedConversion(db); seedPayment(db, { id: 'legacy' });
  t.mock.method(globalThis, 'fetch', async (url) => Response.json(url.includes('/products/') ? product : { session_id: 'test-session', checkout_url: 'https://checkout.example.com/test' }));
  for (const amount of [99, 100, 199]) {
    await assert.rejects(checkout({ data: {}, env: envFor(db), request: paymentRequest(amount) }), { code: 'bid_too_low', details: { minimum_amount_minor: 200 } });
  }
  await assert.rejects(checkout({ data: {}, env: envFor(db), request: paymentRequest(500, 'MYR') }), { code: 'currency_mismatch' });
  const created = await (await checkout({ data: {}, env: envFor(db), request: paymentRequest(200) })).json();
  const replay = await (await checkout({ data: {}, env: envFor(db), request: paymentRequest(200) })).json();
  assert.equal(created.bid.id, replay.bid.id);
  assert.equal((await readBoard(db)).rankings[0].bid.amount_minor, 125);
  await assert.rejects(sendEvent(db, created.bid.id, 'MYR', 200), { code: 'payment_mismatch' });
  await assert.rejects(sendEvent(db, created.bid.id, 'USD', 201), { code: 'payment_mismatch' });
  await sendEvent(db, created.bid.id, 'USD', 200);
  await sendEvent(db, created.bid.id, 'USD', 200); // duplicate success never adds money
  assert.equal((await readBoard(db)).rankings[0].bid.amount_minor, 325);
  const second = await (await checkout({ data: {}, env: envFor(db), request: paymentRequest(200, 'USD', 'second-request-key') })).json();
  await sendEvent(db, second.bid.id, 'USD', 200);
  assert.equal((await readBoard(db)).rankings[0].bid.amount_minor, 525);
  await sendEvent(db, 'legacy', 'MYR', 500, 'refund.succeeded');
  assert.equal((await readBoard(db)).rankings[0].bid.amount_minor, 400);
  await sendEvent(db, created.bid.id, 'USD', 200, 'dispute.opened');
  assert.equal((await readBoard(db)).rankings[0].bid.amount_minor, 200);
  db.sqlite.close();
});

test('US$2 is the same floor for a first payment and a repeat payment, independent of the quote for #1', async (t) => {
  const db = usdTwoDollarDatabase(); seedListing(db); seedListing(db, 'leader'); seedConversion(db);
  seedPayment(db, { id: 'leader-usd', listing: 'leader', amount: 1200, currency: 'USD' });
  let providerCalls = 0;
  t.mock.method(globalThis, 'fetch', async (url) => {
    providerCalls++;
    return Response.json(url.includes('/products/') ? product : { session_id: 'test-session', checkout_url: 'https://checkout.example.com/test' });
  });
  assert.equal((await readBoard(db)).next_bid_minor, 1300);
  for (const amount of [100, 199]) {
    await assert.rejects(checkout({ data: {}, env: envFor(db), request: paymentRequest(amount) }), { code: 'bid_too_low' });
  }
  assert.equal(providerCalls, 0);
  const first = await (await checkout({ data: {}, env: envFor(db), request: paymentRequest(200) })).json();
  await sendEvent(db, first.bid.id, 'USD', 200);
  await assert.rejects(checkout({ data: {}, env: envFor(db), request: paymentRequest(199, 'USD', 'below-topup-key') }), { code: 'bid_too_low' });
  const repeat = await (await checkout({ data: {}, env: envFor(db), request: paymentRequest(300, 'USD', 'three-dollar-topup') })).json();
  await sendEvent(db, repeat.bid.id, 'USD', 300);
  const rankings = (await readBoard(db)).rankings;
  assert.equal(rankings[0].listing.id, 'leader');
  assert.equal(rankings[1].bid.amount_minor, 500);
  assert.equal(rankings[1].bid.currency, 'USD');
  db.sqlite.close();
});

test('the current MYR configuration continues to enforce RM5 without enabling USD', async (t) => {
  const db = testDatabase(); seedListing(db);
  db.sqlite.exec("UPDATE boards SET currency = 'MYR', min_increment_minor = 500, checkout_enabled = 1 WHERE id = 'board_global'");
  const env = { ...envFor(db), DEFAULT_CURRENCY: 'MYR' };
  t.mock.method(globalThis, 'fetch', async (url) => Response.json(url.includes('/products/')
    ? { ...product, price: { ...product.price, currency: 'MYR', price: 500 } }
    : { session_id: 'test-myr', checkout_url: 'https://checkout.example.com/myr' }));
  await assert.rejects(checkout({ data: {}, env, request: paymentRequest(499, 'MYR') }), { code: 'bid_too_low', details: { minimum_amount_minor: 500 } });
  await assert.rejects(checkout({ data: {}, env, request: paymentRequest(200) }), { code: 'currency_mismatch' });
  const created = await (await checkout({ data: {}, env, request: paymentRequest(500, 'MYR') })).json();
  assert.equal(created.bid.amount_minor, 500);
  assert.equal(created.bid.currency, 'MYR');
  assert.equal((await boardOf(db)).min_increment_minor, 500);
  db.sqlite.close();
});

test('an MYR checkout opened before the switch settles at its original amount and fixed ranking value', async (t) => {
  const db = testDatabase(); seedListing(db); seedConversion(db);
  seedPayment(db, { id: 'late-myr', status: 'checkout_created' });
  t.mock.method(globalThis, 'fetch', async () => Response.json({}));
  await sendEvent(db, 'late-myr', 'MYR', 500);
  assert.equal((await readBoard(db)).rankings[0].bid.amount_minor, 125);
  assert.equal((await readBoard(db, { period: 'today' })).rankings[0].bid.amount_minor, 125);
  assert.equal(db.sqlite.prepare("SELECT currency FROM bids WHERE id='late-myr'").get().currency, 'MYR');
  db.sqlite.close();
});

test('USD cents and literal dollar signs survive SSR, hydration, and Chinese localization', () => {
  assert.equal(formatMoney(125, 'USD'), 'US$ 1.25');
  const home = localizeStaticPage(readFileSync(new URL('../../index.html', import.meta.url), 'utf8'), 'home', 'zh');
  assert.match(home, /aria-label="减少 US\$1"/);
  assert.match(home, /一次付清，US\$1 起。/);
  const rates = [{ source_currency: 'MYR', target_currency: 'USD', numerator: 1, denominator: 4, rate_date: '2026-09-01' }];
  const view = buildProductView({ entry: { rank: 1, listing: { id: 'example', hostname: 'example.com' }, bid: { amount_minor: 125 } }, board: { currency: 'USD', currency_conversion: rates } });
  const html = renderProductPage(readFileSync(new URL('../../listing.html', import.meta.url), 'utf8'), view);
  assert.match(html, /US\$ 1.25/);
  assert.match(html, /"bid":1.25/);
  assert.doesNotMatch(html, /Earlier MYR payments count toward USD equivalent totals|data-currency-note/);
  assert.match(currencyNotice(rates, 'zh'), /等值排名/);
});


test('US$100 release floor validates first payments and top-ups and settles signed USD events once', async (t) => {
  const db = testDatabase(); seedListing(db); seedConversion(db); seedPayment(db, { id: 'legacy-hundred' });
  db.sqlite.exec("UPDATE boards SET currency = 'USD', min_increment_minor = 10000, checkout_enabled = 1 WHERE id = 'board_global'");
  const releaseProduct = { ...product, price: { ...product.price, price: 10000 } };
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls++;
    if (url.includes('/products/')) return Response.json(releaseProduct);
    const body = JSON.parse(options.body);
    assert.equal(body.billing_currency, 'USD');
    assert.ok(body.product_cart[0].amount >= 10000);
    assert.equal(body.feature_flags.allow_currency_selection, false);
    return Response.json({ session_id: `hundred-${calls}`, checkout_url: 'https://checkout.example.com/usd100' });
  });
  for (const amount of [200, 9900, 9999]) await assert.rejects(
    checkout({ data: {}, env: envFor(db), request: paymentRequest(amount, 'USD', `reject-${amount}`) }),
    { code: 'bid_too_low', details: { minimum_amount_minor: 10000 } });
  assert.equal(calls, 0);
  const created = await (await checkout({ data: {}, env: envFor(db), request: paymentRequest(10000, 'USD', 'hundred-first') })).json();
  const replay = await (await checkout({ data: {}, env: envFor(db), request: paymentRequest(10000, 'USD', 'hundred-first') })).json();
  assert.equal(created.bid.id, replay.bid.id);
  await sendEvent(db, created.bid.id, 'USD', 10000);
  await sendEvent(db, created.bid.id, 'USD', 10000);
  assert.equal((await readBoard(db)).rankings[0].bid.amount_minor, 10125);
  await assert.rejects(checkout({ data: {}, env: envFor(db), request: paymentRequest(9900, 'USD', 'hundred-topup-low') }), { code: 'bid_too_low' });
  const topup = await (await checkout({ data: {}, env: envFor(db), request: paymentRequest(10100, 'USD', 'hundred-topup') })).json();
  await sendEvent(db, topup.bid.id, 'USD', 10100);
  assert.equal((await readBoard(db)).rankings[0].bid.amount_minor, 20225);
  assert.equal(db.sqlite.prepare("SELECT amount_minor FROM bids WHERE id='legacy-hundred'").get().amount_minor, 500);
  db.sqlite.close();
});
