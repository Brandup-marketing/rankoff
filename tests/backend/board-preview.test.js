import assert from 'node:assert/strict';
import test from 'node:test';
import { readCompleteBoard } from '../../board-preview.js';

test('payment preview reads every page and ignores legacy country filters, keeping a returning merchant beyond page one', async () => {
  const requests = [];
  const rows = Array.from({ length: 101 }, (_, index) => ({ listing: { id: `merchant-${index}` }, bid: { amount_minor: 200 } }));
  const payload = await readCompleteBoard('https://rankoff.my/api/v1/board?category=Marketing&country=MY&period=today', async (url) => {
    requests.push(new URL(url));
    const page = Number(url.searchParams.get('page'));
    return Response.json({ mode: 'production', board: { currency: 'USD' }, rankings: rows.slice((page - 1) * 100, page * 100), pagination: { total: 101, has_next: page === 1 } });
  });
  assert.equal(payload.rankings.at(-1).listing.id, 'merchant-100');
  assert.equal(payload.rankings.length, 101);
  assert.ok(requests.every((url) => !url.searchParams.has('country') && url.searchParams.get('category') === 'Marketing'));
  assert.ok(requests.every((url) => url.searchParams.get('period') === 'all'));
});

test('a truncated or changing board cannot produce a payable rank preview', async () => {
  for (const scenario of ['missing', 'duplicate', 'currency']) {
    let page = 0;
    await assert.rejects(readCompleteBoard('https://rankoff.my/api/v1/board', async () => {
      page++;
      return Response.json({ mode: 'production', board: { currency: scenario === 'currency' && page === 2 ? 'MYR' : 'USD' },
        rankings: scenario === 'missing' && page === 2 ? [] : [{ listing: { id: scenario === 'duplicate' ? 'same' : String(page) } }], pagination: { total: 2, has_next: page === 1 } });
    }));
  }
});
