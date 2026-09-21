import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../app.js', import.meta.url), 'utf8');
const body = source.match(/async function startLiveCheckout\(amount\) \{([\s\S]*?)\n  \}\n\n  function showToast/)[1];
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

for (const url of ['https://www.instagram.com/new_merchant', 'https://www.facebook.com/NewMerchant']) {
  test(`new submission resolves the full profile on the server: ${url}`, async () => {
    const calls = [];
    const fn = new AsyncFunction('amount', 'activeBid', 'state', 'pendingChallenge', 'fetch', 'window', 'elements',
      'remoteCurrency', 'remoteSnapshotId', 'TERMS_VERSION', 'checkoutFailure', 'submissionError', 'checkoutError',
      'canReviewPayment', 'hasCurrentQuote', 'chosenMarket', body);
    const fetcher = async (path, init) => {
      calls.push({ path, body: JSON.parse(init.body) });
      return Response.json(path.endsWith('/listings') ? { listing: { id: 'correct-merchant' } } : { checkout_url: 'https://checkout.example.test' });
    };
    await fn(15, { type: 'new' }, { listings: [{ id: 'wrong-merchant', url: new URL('/glowmebykimisoi', url).href }] },
      { url: new URL(url), category: 'Beauty' }, fetcher, { location: { assign() {} } }, { bidAgree: { checked: true } },
      'MYR', 'browsed-today-snapshot', '2026-09-08', Error, String, String, () => true, () => true, { snapshotId: 'quoted-all-time-snapshot' });
    assert.equal(calls[0].path, './api/v1/listings');
    assert.equal(calls[0].body.url, url);
    assert.equal(calls[1].body.listing_id, 'correct-merchant');
    assert.equal(calls[1].body.amount_minor, 1500);
    assert.equal(calls[1].body.snapshot_id, 'quoted-all-time-snapshot');
  });
}

test('explicit existing-listing payment retains the selected merchant', async () => {
  const calls = [];
  const fn = new AsyncFunction('amount', 'activeBid', 'state', 'pendingChallenge', 'fetch', 'window', 'elements',
    'remoteCurrency', 'remoteSnapshotId', 'TERMS_VERSION', 'checkoutFailure', 'submissionError', 'checkoutError',
    'canReviewPayment', 'hasCurrentQuote', 'chosenMarket', body);
  await fn(5, { type: 'listing', listingId: 'chosen' }, { listings: [{ id: 'chosen' }] }, null,
    async (path, init) => { calls.push({ path, body: JSON.parse(init.body) }); return Response.json({ checkout_url: 'https://checkout.example.test' }); },
    { location: { assign() {} } }, { bidAgree: { checked: true } }, 'MYR', null, '2026-09-08', Error, String, String,
    () => true, () => true, null);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].body.listing_id, 'chosen');
});
