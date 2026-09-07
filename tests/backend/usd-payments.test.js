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

const product = { is_recurring: false, price: { type: 'one_time_price', currency: 'USD', price: 100,
  pay_what_you_want: true, purchasing_power_parity: false, discount: 0, tax_inclusive: true } };
const secret = Buffer.from('test-only-signature-key').toString('base64');
const envFor = (db) => ({ DB: db, RANKOFF_MODE: 'production', PAYMENTS_ENABLED: 'true', DEFAULT_CURRENCY: 'USD',
  DODO_ENVIRONMENT: 'live_mode', DODO_PRODUCT_ID: 'test-product', DODO_PAYMENTS_API_KEY: 'test-only-key', DODO_PAYMENTS_WEBHOOK_KEY: secret });
const boardOf = (db) => loadBoard(db, 'global');
const readBoard = async (db, options = {}) => loadPublicBoard(db, await boardOf(db), { category: 'all', period: 'all', limit: 50, ...options });
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
  const result = await createDodoCheckout(envFor(null), { id: 'test', listingId: 'example', boardId: 'board_global', amountMinor: 100, currency: 'USD' });
  assert.equal(result.sessionId, 'session-test');
  assert.equal(calls.length, 2);
  const body = JSON.parse(calls[1].options.body);
  assert.equal(body.product_cart[0].amount, 100);
  assert.equal(body.billing_currency, 'USD');
  assert.equal(body.feature_flags.allow_currency_selection, false);
  assert.equal(body.feature_flags.allow_discount_code, false);
});

test('wrong currency, fixed price, tax-exclusive or PPP products fail before creating checkout', async (t) => {
  for (const patch of [{ currency: 'MYR' }, { pay_what_you_want: false }, { tax_inclusive: false }, { purchasing_power_parity: true }, { discount: 5 }, { price: 500 }, { type: 'recurring_price' }]) {
    assert.throws(() => validateCheckoutProduct({ ...product, price: { ...product.price, ...patch } }, { currency: 'USD', amountMinor: 100 }), { code: 'payment_product_mismatch' });
  }
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => { requests++; return Response.json({ ...product, price: { ...product.price, currency: 'MYR' } }); });
  await assert.rejects(createDodoCheckout(envFor(null), { amountMinor: 100, currency: 'USD' }), { code: 'payment_product_mismatch' });
  assert.equal(requests, 1);
});

test('MYR originals survive conversion; ranking, category, stats, records and snapshots agree to the cent', async () => {
  const db = testDatabase(); seedListing(db); seedListing(db, 'other'); seedConversion(db);
  seedPayment(db, { id: 'old-myr' }); seedPayment(db, { id: 'new-usd', amount: 100, currency: 'USD' });
  seedPayment(db, { id: 'other-payment', listing: 'other', amount: 200, currency: 'USD' });
  const payload = await readBoard(db);
  assert.deepEqual(payload.rankings.map((r) => [r.listing.id, r.bid.amount_minor, r.bid.currency]), [['example', 225, 'USD'], ['other', 200, 'USD']]);
  assert.equal(payload.next_bid_minor, 400);
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

test('US$1 checkout, idempotency, signed settlement, repeat payment and reversal work end to end', async (t) => {
  const db = testDatabase(); seedListing(db); seedConversion(db); seedPayment(db, { id: 'legacy' });
  t.mock.method(globalThis, 'fetch', async (url) => Response.json(url.includes('/products/') ? product : { session_id: 'test-session', checkout_url: 'https://checkout.example.com/test' }));
  await assert.rejects(checkout({ data: {}, env: envFor(db), request: paymentRequest(99) }), { code: 'bid_too_low' });
  await assert.rejects(checkout({ data: {}, env: envFor(db), request: paymentRequest(500, 'MYR') }), { code: 'currency_mismatch' });
  const created = await (await checkout({ data: {}, env: envFor(db), request: paymentRequest(100) })).json();
  const replay = await (await checkout({ data: {}, env: envFor(db), request: paymentRequest(100) })).json();
  assert.equal(created.bid.id, replay.bid.id);
  assert.equal((await readBoard(db)).rankings[0].bid.amount_minor, 125);
  await assert.rejects(sendEvent(db, created.bid.id, 'MYR', 100), { code: 'payment_mismatch' });
  await assert.rejects(sendEvent(db, created.bid.id, 'USD', 101), { code: 'payment_mismatch' });
  await sendEvent(db, created.bid.id, 'USD', 100);
  await sendEvent(db, created.bid.id, 'USD', 100); // duplicate success never adds money
  assert.equal((await readBoard(db)).rankings[0].bid.amount_minor, 225);
  const second = await (await checkout({ data: {}, env: envFor(db), request: paymentRequest(200, 'USD', 'second-request-key') })).json();
  await sendEvent(db, second.bid.id, 'USD', 200);
  assert.equal((await readBoard(db)).rankings[0].bid.amount_minor, 425);
  await sendEvent(db, 'legacy', 'MYR', 500, 'refund.succeeded');
  assert.equal((await readBoard(db)).rankings[0].bid.amount_minor, 300);
  await sendEvent(db, created.bid.id, 'USD', 100, 'dispute.opened');
  assert.equal((await readBoard(db)).rankings[0].bid.amount_minor, 200);
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
  assert.match(html, /Earlier MYR payments count toward USD equivalent totals/);
  assert.match(currencyNotice(rates, 'zh'), /等值排名/);
});
