import assert from 'node:assert/strict';
import test from 'node:test';
import { testDatabase, seedListing, seedPayment } from '../helpers/sqlite.js';
import { acquisitionInput, recordAcquisition, attributePayment, acquisitionReport } from '../../functions/_lib/acquisition.js';
import { onRequestGet as report } from '../../functions/api/v1/admin/acquisition.js';
import { onRequestPost as checkout } from '../../functions/api/v1/bids/index.js';
import { onRequestGet as redirect } from '../../functions/go/[listingId].js';

const campaign = { session_id: 'bd2a0b43-6ac3-4a3e-ae08-849094399d88', source: 'founder_community', medium: 'community', campaign: 'cohort_01', content: 'invitation' };
const at = '2026-09-08T00:00:00.000Z';
const env = (db) => ({ DB: db, RANKOFF_MODE: 'production', SESSION_HASH_SALT: 'test-only-session-salt-at-least-32-characters', ADMIN_API_TOKEN: 'test-owner-token' });

test('acquisition rejects forged payment events, sanitizes labels and deduplicates first-source visits', async () => {
  const db = testDatabase();
  assert.throws(() => acquisitionInput({ session_id: 'email@example.com' }), { code: 'invalid_session' });
  const clean = acquisitionInput({ ...campaign, source: 'https://example.com?email=private@example.com', content: '<script>' });
  assert.equal(clean.source, 'direct'); assert.equal(clean.content, 'none');
  await recordAcquisition(db, env(db), 'board_global', campaign, 'visit', at);
  await recordAcquisition(db, env(db), 'board_global', { ...campaign, source: 'different' }, 'review_opened', at);
  await recordAcquisition(db, env(db), 'board_global', campaign, 'review_opened', at);
  await assert.rejects(recordAcquisition(db, env(db), 'board_global', campaign, 'payment_succeeded', at), { code: 'invalid_event' });
  const result = await acquisitionReport(db, 'board_global', at);
  assert.equal(result.campaigns.length, 1);
  assert.equal(result.campaigns[0].source, campaign.source);
  assert.equal(result.campaigns[0].visits, 1);
  assert.equal(result.campaigns[0].reviewed_visits, 1);
  assert.equal(result.campaigns[0].settled_payments, 0);
  assert.notEqual(db.sqlite.prepare('SELECT session_hash FROM acquisition_sessions').get().session_hash, campaign.session_id);
  db.sqlite.close();
});

test('campaign report reads settlements and repeats from the ledger, separates coverage, and excludes reversals', async () => {
  const db = testDatabase(); seedListing(db);
  await recordAcquisition(db, env(db), 'board_global', campaign, 'visit', at);
  seedPayment(db, { id: 'prior', at: '2026-09-01T00:00:00.000Z' });
  seedPayment(db, { id: 'new', currency: 'USD', amount: 100, at });
  seedPayment(db, { id: 'abandoned', currency: 'USD', amount: 100, status: 'checkout_created', at });
  db.sqlite.exec("UPDATE bids SET checkout_url='https://checkout.example.com' WHERE id IN ('new','abandoned')");
  for (const id of ['new', 'abandoned']) await attributePayment(db, env(db), { id, boardId: 'board_global' }, campaign);
  let result = await acquisitionReport(db, 'board_global', at);
  assert.equal(result.campaigns[0].checkouts, 2);
  assert.equal(result.campaigns[0].settled_payments, 1);
  assert.equal(result.campaigns[0].repeat_payments, 1);
  assert.equal(result.coverage.paid_listings, 1);
  db.sqlite.exec("UPDATE bids SET status='reversed' WHERE id='new'");
  result = await acquisitionReport(db, 'board_global', at);
  assert.equal(result.campaigns[0].settled_payments, 0);
  assert.equal(result.campaigns[0].repeat_payments, 0);
  db.sqlite.close();
});

test('tracked redirects join the first-party session without exposing the campaign to the destination', async () => {
  const db = testDatabase(); seedListing(db); seedPayment(db, { id: 'paid', currency: 'USD', amount: 100 });
  await recordAcquisition(db, env(db), 'board_global', campaign, 'visit', at);
  const background = [];
  const response = await redirect({ env: env(db), params: { listingId: 'example' },
    request: new Request(`https://rankoff.my/go/example?sid=${campaign.session_id}`), waitUntil: (promise) => background.push(promise) });
  await Promise.all(background);
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'https://example.example.com/');
  assert.equal((await acquisitionReport(db, 'board_global', at)).campaigns[0].outbound_clicks, 1);
  db.sqlite.close();
});

test('campaign report is owner-only and never publicly cacheable', async () => {
  const db = testDatabase();
  await assert.rejects(report({ env: env(db), request: new Request('https://rankoff.my/api/v1/admin/acquisition') }), { status: 401 });
  const response = await report({ env: env(db), request: new Request('https://rankoff.my/api/v1/admin/acquisition', { headers: { authorization: 'Bearer test-owner-token' } }) });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual((await response.json()).campaigns, []);
  db.sqlite.close();
});

test('checkout persists campaign association idempotently and remains usable if analytics storage is missing', async (t) => {
  const db = testDatabase(); seedListing(db);
  db.sqlite.exec("UPDATE boards SET checkout_enabled=1");
  const settings = { ...env(db), PAYMENTS_ENABLED: 'true', DEFAULT_CURRENCY: 'USD', DODO_PRODUCT_ID: 'test-product', DODO_ENVIRONMENT: 'live_mode', DODO_PAYMENTS_API_KEY: 'test-key', DODO_PAYMENTS_WEBHOOK_KEY: 'test-webhook-key' };
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; db.sqlite.close(); });
  globalThis.fetch = async (url) => String(url).includes('/products/')
    ? Response.json({ is_recurring: false, price: { type: 'one_time_price', currency: 'USD', price: 100, pay_what_you_want: true, purchasing_power_parity: false, discount: 0, tax_inclusive: true } })
    : Response.json({ session_id: crypto.randomUUID(), checkout_url: 'https://checkout.dodopayments.com/test' });
  const request = (key) => new Request('https://rankoff.my/api/v1/bids', { method: 'POST', headers: { 'Idempotency-Key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ listing_id: 'example', amount_minor: 100, currency: 'USD', agreed_terms: true, acquisition: campaign }) });
  for (let i = 0; i < 2; i++) assert.ok((await checkout({ env: settings, request: request('same-checkout-key'), data: {} })).ok);
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM payment_attribution').get().n, 1);
  assert.equal((await acquisitionReport(db, 'board_global', at)).campaigns[0].settled_payments, 0);
  db.sqlite.exec('DROP TABLE payment_attribution');
  assert.equal((await checkout({ env: settings, request: request('next-checkout-key'), data: {} })).status, 201);
});
