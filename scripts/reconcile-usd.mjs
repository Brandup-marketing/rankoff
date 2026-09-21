// Read-only cutover preparation. Reads a supplied ledger export, never D1,
// provider credentials, a network endpoint or a production configuration.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
const isDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(value).toISOString().slice(0, 10) === value;
const isTimestamp = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
const safeInteger = (value, maximum = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value) && value > 0 && value <= maximum;
const checkedNumber = (value) => {
  requireValue(value <= BigInt(Number.MAX_SAFE_INTEGER), 'A computed amount exceeds safe integer precision.');
  return Number(value);
};
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const roundMinor = (amount, numerator, denominator) => checkedNumber(
  (2n * BigInt(amount) * BigInt(numerator) + BigInt(denominator)) / (2n * BigInt(denominator)),
);

export function reconcileUsd(input) {
  requireValue(input && typeof input === 'object', 'A ledger export object is required.');
  const { board, rate, listings, payments, captured_at: capturedAt } = input;
  requireValue(isTimestamp(capturedAt), 'captured_at must identify the ledger export timestamp.');
  requireValue(board?.id && board.currency === 'MYR', 'This tool reconciles one current MYR board into USD.');
  requireValue(rate?.source_currency === 'MYR' && rate.target_currency === 'USD', 'A documented MYR-to-USD rate is required.');
  requireValue(safeInteger(rate.numerator, 100000000) && safeInteger(rate.denominator, 100000000), 'Rate numerator and denominator must be positive integers no greater than 100000000.');
  requireValue(isDate(rate.rate_date) && isTimestamp(rate.cutover_at), 'Rate date and planned cutover timestamp are required.');
  requireValue(/^https:\/\//.test(String(rate.source_url || '')), 'Record an HTTPS rate source URL.');
  requireValue(Array.isArray(listings) && Array.isArray(payments), 'listings and payments arrays are required.');

  const rows = new Map();
  for (const listing of listings) {
    requireValue(typeof listing.id === 'string' && listing.id && !rows.has(listing.id), 'Listing IDs must be non-empty and unique.');
    requireValue(['approved', 'pending_review', 'suspended', 'removed'].includes(listing.status), `Unsupported listing status for ${listing.id}.`);
    rows.set(listing.id, {
      listing_id: listing.id, title: typeof listing.title === 'string' ? listing.title : null,
      listing_status: listing.status, settled_count: 0,
      original_settled_totals: {}, before_ranking_minor: 0, after_ranking_minor: 0,
      pending_payment_count: 0, last_settled_at: '', last_bid_id: '',
    });
  }
  const seen = new Set();
  const warnings = [];
  const statusCounts = {};
  for (const payment of payments) {
    requireValue(typeof payment.id === 'string' && payment.id && !seen.has(payment.id), 'Payment IDs must be non-empty and unique.');
    seen.add(payment.id);
    requireValue(payment.board_id === board.id && rows.has(payment.listing_id), `Payment ${payment.id} does not belong to a declared listing on this board.`);
    requireValue(safeInteger(payment.amount_minor), `Payment ${payment.id} has an invalid original amount.`);
    requireValue(payment.currency === 'MYR', `Payment ${payment.id} is not MYR; supply an export for the original MYR board, not an already mixed board.`);
    requireValue(['settled', 'pending_payment', 'checkout_created', 'payment_failed', 'reversed', 'cancelled'].includes(payment.status), `Unsupported status for payment ${payment.id}.`);
    statusCounts[payment.status] = (statusCounts[payment.status] || 0) + 1;
    const row = rows.get(payment.listing_id);
    if (['pending_payment', 'checkout_created', 'payment_failed'].includes(payment.status)) row.pending_payment_count++;
    if (payment.status !== 'settled') continue;
    requireValue(isTimestamp(payment.settled_at), `Settled payment ${payment.id} needs its original settlement timestamp.`);
    const usdMinor = roundMinor(payment.amount_minor, rate.numerator, rate.denominator);
    if (usdMinor === 0) warnings.push(`Payment ${payment.id} rounds to zero USD cents; review snapshot and display behavior before cutover.`);
    row.original_settled_totals.MYR = checkedNumber(BigInt(row.original_settled_totals.MYR || 0) + BigInt(payment.amount_minor));
    row.before_ranking_minor = row.original_settled_totals.MYR;
    row.after_ranking_minor = checkedNumber(BigInt(row.after_ranking_minor) + BigInt(usdMinor));
    row.settled_count++;
    // Match the repository: newest settled bid, then descending bid ID.
    if (compareText(payment.settled_at, row.last_settled_at) > 0
        || (payment.settled_at === row.last_settled_at && compareText(payment.id, row.last_bid_id) > 0)) {
      row.last_settled_at = payment.settled_at;
      row.last_bid_id = payment.id;
    }
  }
  const eligible = [...rows.values()].filter((row) => row.listing_status === 'approved' && row.settled_count > 0);
  const order = (key) => [...eligible].sort((left, right) => right[key] - left[key]
    || compareText(left.last_settled_at, right.last_settled_at) || compareText(left.last_bid_id, right.last_bid_id));
  const beforeRanks = new Map(order('before_ranking_minor').map((row, index) => [row.listing_id, index + 1]));
  const afterRanks = new Map(order('after_ranking_minor').map((row, index) => [row.listing_id, index + 1]));
  const ties = new Map();
  for (const row of eligible) ties.set(row.after_ranking_minor, [...(ties.get(row.after_ranking_minor) || []), row.listing_id]);
  const comparisons = [...rows.values()].map((row) => ({
    ...row, before_currency: 'MYR', after_currency: 'USD',
    before_rank: beforeRanks.get(row.listing_id) ?? null,
    after_rank: afterRanks.get(row.listing_id) ?? null,
    rank_change: beforeRanks.has(row.listing_id) ? beforeRanks.get(row.listing_id) - afterRanks.get(row.listing_id) : null,
    rounding_difference_from_aggregate_minor: row.after_ranking_minor - roundMinor(row.before_ranking_minor, rate.numerator, rate.denominator),
    tied_after: beforeRanks.has(row.listing_id) ? (ties.get(row.after_ranking_minor) || []).filter((id) => id !== row.listing_id) : [],
  })).sort((left, right) => (left.after_rank ?? Infinity) - (right.after_rank ?? Infinity) || compareText(left.listing_id, right.listing_id));
  return {
    mode: 'read_only_proposal', captured_at: capturedAt, board_id: board.id,
    rate: { source_currency: 'MYR', target_currency: 'USD', numerator: rate.numerator,
      denominator: rate.denominator, source_url: rate.source_url, rate_date: rate.rate_date, cutover_at: rate.cutover_at },
    rate_verification: 'The source and rate are supplied inputs; this script does not independently verify them.',
    completeness: 'Calculated only from supplied rows; reconcile export counts and totals against the original ledger before approval.',
    proposed_minimum_minor: 10000, proposed_quote_increment_minor: 10000, input_step_minor: 100,
    payment_count: payments.length, payment_status_counts: statusCounts, warnings,
    original_settled_totals: { MYR: checkedNumber(comparisons.reduce((total, row) => total + BigInt(row.original_settled_totals.MYR || 0), 0n)) },
    ranking_equivalent_totals: { USD: checkedNumber(eligible.reduce((total, row) => total + BigInt(row.after_ranking_minor), 0n)) },
    listings: comparisons,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    requireValue(process.argv.length === 4 && process.argv[2] === '--input', 'Usage: node scripts/reconcile-usd.mjs --input /path/to/ledger.json');
    const input = JSON.parse(await readFile(resolve(process.argv[3]), 'utf8'));
    console.log(JSON.stringify(reconcileUsd(input), null, 2));
  } catch (error) {
    console.error(`Reconciliation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
