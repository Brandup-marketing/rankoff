import assert from 'node:assert/strict';
import test from 'node:test';
import { reconcileUsd } from '../../scripts/reconcile-usd.mjs';
import { testDatabase, seedListing, seedPayment, seedConversion } from '../helpers/sqlite.js';
import { loadBoard, loadPublicBoard } from '../../functions/_lib/repository.js';

const ledger = () => ({
  captured_at: '2026-09-20T10:00:00.000Z',
  board: { id: 'board_global', currency: 'MYR' },
  rate: { source_currency: 'MYR', target_currency: 'USD', numerator: 1, denominator: 4,
    source_url: 'https://example.com/fictional-test-rate', rate_date: '2026-09-20', cutover_at: '2026-09-21T00:00:00.000Z' },
  listings: [{ id: 'two-payments', title: 'Fixture one', status: 'approved' }, { id: 'earlier', title: 'Fixture two', status: 'approved' }],
  payments: [
    { id: 'first', board_id: 'board_global', listing_id: 'two-payments', amount_minor: 501, currency: 'MYR', status: 'settled', settled_at: '2026-09-01T00:00:00.000Z' },
    { id: 'second', board_id: 'board_global', listing_id: 'two-payments', amount_minor: 501, currency: 'MYR', status: 'settled', settled_at: '2026-09-02T00:00:00.000Z' },
    { id: 'earlier', board_id: 'board_global', listing_id: 'earlier', amount_minor: 1000, currency: 'MYR', status: 'settled', settled_at: '2026-09-01T00:00:00.000Z' },
    { id: 'pending', board_id: 'board_global', listing_id: 'earlier', amount_minor: 500, currency: 'MYR', status: 'checkout_created', settled_at: null },
  ],
});

test('read-only USD reconciliation preserves originals, rounds per payment and exposes changed ranks and pending checkouts', () => {
  const input = ledger();
  const originals = structuredClone(input);
  const output = reconcileUsd(input);
  assert.deepEqual(input, originals);
  assert.equal(output.mode, 'read_only_proposal');
  assert.deepEqual(output.original_settled_totals, { MYR: 2002 });
  assert.deepEqual(output.ranking_equivalent_totals, { USD: 500 });
  assert.deepEqual(output.listings.map((row) => [row.listing_id, row.before_rank, row.after_rank, row.after_ranking_minor]),
    [['earlier', 2, 1, 250], ['two-payments', 1, 2, 250]]);
  assert.equal(output.listings[1].rounding_difference_from_aggregate_minor, -1);
  assert.equal(output.listings[0].pending_payment_count, 1);
  assert.deepEqual(output.listings[0].tied_after, ['two-payments']);
});

test('reconciliation excludes suspended and reversed contributions from the public ranking', () => {
  const input = ledger();
  input.listings[1].status = 'suspended';
  input.payments[1].status = 'reversed';
  const output = reconcileUsd(input);
  assert.deepEqual(output.original_settled_totals, { MYR: 1501 });
  assert.deepEqual(output.ranking_equivalent_totals, { USD: 125 });
  assert.equal(output.listings.find((row) => row.listing_id === 'earlier').after_rank, null);
});

test('reconciliation ranks and converted cents agree with the actual SQLite ranking queries', async () => {
  const input = ledger();
  const output = reconcileUsd(input);
  const db = testDatabase();
  for (const listing of input.listings) seedListing(db, listing.id);
  for (const payment of input.payments) seedPayment(db, { id: payment.id, listing: payment.listing_id,
    amount: payment.amount_minor, currency: payment.currency, status: payment.status,
    at: payment.settled_at || input.captured_at });
  db.sqlite.exec("UPDATE boards SET currency = 'MYR' WHERE id = 'board_global'");
  const read = async () => loadPublicBoard(db, await loadBoard(db, 'global'), { category: 'all', period: 'all', limit: 50 });
  const before = await read();
  seedConversion(db);
  db.sqlite.exec("UPDATE boards SET currency = 'USD', min_increment_minor = 200 WHERE id = 'board_global'");
  const after = await read();
  for (const row of output.listings) {
    const old = before.rankings.find((entry) => entry.listing.id === row.listing_id);
    const current = after.rankings.find((entry) => entry.listing.id === row.listing_id);
    assert.equal(row.before_rank, old.rank);
    assert.equal(row.before_ranking_minor, old.bid.amount_minor);
    assert.equal(row.after_rank, current.rank);
    assert.equal(row.after_ranking_minor, current.bid.amount_minor);
  }
  db.sqlite.close();
});

test('incomplete or ambiguous exports fail instead of manufacturing a conversion table', () => {
  for (const mutate of [
    (input) => { input.payments.push({ ...input.payments[0] }); },
    (input) => { input.payments[0].currency = 'USD'; },
    (input) => { input.payments[0].amount_minor = 1.5; },
    (input) => { input.payments[0].settled_at = null; },
    (input) => { input.payments[0].listing_id = 'unknown'; },
    (input) => { input.rate.denominator = 0; },
    (input) => { input.rate.source_url = ''; },
    (input) => { input.captured_at = ''; },
  ]) {
    const input = ledger(); mutate(input);
    assert.throws(() => reconcileUsd(input));
  }
});

test('tiny conversions surface zero-cent contributions as a release concern', () => {
  const input = ledger(); input.rate.denominator = 1000000;
  const output = reconcileUsd(input);
  assert.equal(output.warnings.length, 3);
  assert.equal(output.ranking_equivalent_totals.USD, 0);
});
