# USD launch record — updated 2026-09-21

The USD release is authorized. Production uses a new Dodo USD product and keeps
the original MYR product and payment rows intact. No real charge was made during
verification; the Dodo Test Mode checkout completed at USD 100.

Current implementation and validation: [20 September report](reports/global/2026-09-20-implementation.md).
A full read-only production-ledger proposal is now available in the
[carryover review](reports/global/2026-09-20-carryover-review.md), using the verified
18 September BNM reference rate. The rate and actual cutover time remain unapproved;
the timestamp in the calculation input is illustrative, not a scheduled release.
Test totals below must be taken from the final verification run. Dodo hosted
testing and desktop/mobile browser QA remain release gates; no production setting
has been changed. The latest scope preserves the original leaderboard and traffic;
country filters and additional location badges are deferred.

## Proposed behavior

- New listings and top-ups start at **US$100**, with a **US$1** amount-input step.
- `boards.min_increment_minor = 10000` deliberately supplies both the minimum
  accepted USD payment and the increment above an existing total used by suggested
  rank quotes. The input step remains independently 100 minor units. This preserves
  the existing pricing rule; the current MYR configuration stays at 500.
- On an empty USD board, the entry minimum and #1 suggestion are US$2. With a
  US$12 leader, a new entrant is offered US$14, while a US$2 payment remains valid
  at a lower position. A listing with US$3.25 is offered US$11 to exceed that leader
  by the US$2 quote increment after whole-dollar rounding.
- English, Chinese and Malay pages, metadata, payment review, category pages, listing
  details and generated rank cards use the board currency. Historical equivalents
  retain cents; suggested new payments round up to whole dollars.
- Dodo checkout first verifies the product is a USD one-time, pay-what-you-want,
  tax-inclusive product with no PPP or discount and a minimum no higher than the
  requested amount. The request fixes the billing currency and disables currency
  selection and discount codes. Signed webhooks still verify the original amount
  and currency before settlement.
- Existing payment records and receipts remain in their original currency.
  Admin payment totals are grouped by currency, never summed as mixed money.

## Legacy balance policy and pending release inputs

The user's current direction selects carrying MYR ranking value forward using one
recorded, immutable MYR-to-USD rate, while preserving all original transactions.
**The actual documented rate and cutover time remain release inputs.** Historical
handoff restrictions do not supersede the current authorized local implementation.

For carryover, record the source URL, observation date, numerator, denominator,
and cutover timestamp. Convert each eligible original payment to USD cents with
`ROUND(original_minor * numerator / denominator)`, then sum those cents. Keep
the exact policy in the release/accounting documentation; the user removed the
fixed-rate paragraph from public leaderboard pages. Late MYR checkouts use the same rate; refunds and
disputes remove that payment's contribution. Rounding can create ties; the existing
deterministic tie-break applies. Review every existing listing's before/after
total and rank before approving the cutover.

The full conversion table requires original payments: rounding each contribution
can differ from converting a listing's public aggregate once. Record the data
timestamp, original totals by currency, proposed ranking total, previous/new rank
and rounding ties. A public-board-only table must be labelled incomplete; it
cannot reveal every original transaction or still-pending checkout.

Use the read-only reconciliation tool with a separately supplied original ledger
export. It writes a JSON proposal to standard output and makes no database,
network or provider calls:

```
node scripts/reconcile-usd.mjs --input /path/to/ledger.json
```

The input contract is:

```json
{
  "captured_at": "2026-09-20T10:00:00.000Z",
  "board": { "id": "board_global", "currency": "MYR" },
  "rate": {
    "source_currency": "MYR", "target_currency": "USD",
    "numerator": 1, "denominator": 4,
    "source_url": "https://example.com/fictional-test-rate",
    "rate_date": "2026-09-20", "cutover_at": "2026-09-21T00:00:00.000Z"
  },
  "listings": [{ "id": "fixture", "title": "Synthetic example", "status": "approved" }],
  "payments": [{
    "id": "fixture-payment", "board_id": "board_global", "listing_id": "fixture",
    "amount_minor": 500, "currency": "MYR", "status": "settled",
    "settled_at": "2026-09-01T00:00:00.000Z"
  }]
}
```

Every value above is a **synthetic example**, including the rate and timestamps.
Supply all listing statuses and original payment statuses, including pending and
reversed rows, without buyer contact details or credentials. This tool accepts the
original MYR board only and rejects already mixed original payment currencies;
that requires a separate reconciliation of existing conversion policies. Export
completeness and the supplied rate source still need independent verification.

Existing reversal behavior removes the entire bid on `payment.refunded`,
`refund.succeeded`, `dispute.opened` or `dispute.created`. Partial refund accounting
and automatic reinstatement following a won dispute are not implemented. The
current tests verify full reversals, not these unsupported cases.

The local fixtures use **4 MYR = 1 USD solely for deterministic testing**. They
are fictional businesses and must never be copied into production or quoted as
a current exchange rate.

## Deployment prerequisites and order

1. Confirm the actual documented rate and cutover time. Prepare a table from a
   fresh production read showing original payment totals by currency, proposed
   USD ranking equivalents, and before/after ranks. Finalize the legal conversion
   explanation in all three languages against that approved policy.
2. Verify a real Dodo USD product and test-mode hosted checkout, including US$2,
   a larger top-up, receipt currency, inclusive tax behavior and signed settlement.
   Provider calls in the automated tests are mocked; a real hosted USD checkout
   has **not** been verified. Use the official product GET endpoint to inspect
   settings. Never change a shared MYR product merely to relabel it USD.
3. Present the code, actual reconciliation, exchange rate, timing and concrete
   production steps for release approval. This task authorizes local development;
   do not perform a real charge or production cutover as part of validation.
4. Back up D1 and record the current deployment, board settings, original payment
   totals by currency, and any still-open MYR checkouts. Plan a short maintenance
   window so old code cannot serve original MYR values under a USD board label.
5. Inspect the live schema and applied migrations first. If the ranking-currency
   schema is absent, review and apply only the needed additive statements from
   `migrations/0006_ranking_currency.sql` explicitly with D1 execute. Its presence
   in source is not evidence it remains unapplied. It adds a table, immutable-rate
   triggers and a ranking view; it does not switch currency or modify payments.
   **Never run `wrangler d1 migrations apply`.** Migration 0002 is unsafe to replay.
6. With checkout paused and the public board in maintenance, insert the approved
   conversion record for the actual board ID and change that board to USD with
   `min_increment_minor = 200`. Do not update `bids.amount_minor`, `bids.currency`
   or old snapshots. Keep all original rows, including pending MYR attempts.
7. Deploy this code with the verified USD `DODO_PRODUCT_ID`, `DEFAULT_CURRENCY=USD`
   and payments still disabled. The checked-in product ID is the existing MYR
   product, so **it must be replaced before enabling checkout**. Check effective
   deployed variables; do not assume dashboard overrides match the file.
8. Confirm no settled `ranking_payments` row has a NULL `ranking_amount_minor`.
   Reconcile the board, each category, activity, stats, listing records and admin
   totals against the reviewed before/after table. Confirm the same merchant IDs,
   logo bindings and accumulated page/click counts; currency conversion must not
   delete or replace page_events, click_events or acquisition_sessions. Verify
   initial HTML and hydrated prices in all three languages.
   Reopen the board only on success.
   Regenerate stored listing rank cards with the USD admin page. Pre-cutover cards
   remain stored but are no longer selected. New product OG URLs include currency;
   purge old image URLs where possible and refresh social previews (third-party
   caches may persist). The generic brand image contains no price.
9. Enable payments only after these checks. Jake completes any real payment
   verification. Verify the actual signed webhook, receipt and resulting rank
   before running ads that say “from US$2.”

## Rollback

Before any USD settlement, restore the old board currency/floor, product settings
and deployment together under maintenance; additive schema and original records
can remain. After a USD settlement, **do not simply switch the board back to MYR**
or restore an old database backup over newer payments. Pause checkout and fix
forward or design a reviewed rollback that accounts for every currency and any
late provider events. Immutable conversion records must not be edited or deleted.

## Current verification and remaining limits

The currency suites now exercise US$2 first/repeat payment boundaries, larger
whole-dollar payments, unchanged RM5 validation and the separately calculated #1
suggestion. Real SQLite and signed synthetic events cover original ledger
preservation, rounding/ties, immutable rates, grouped admin totals, snapshots,
late MYR settlement, duplicate events, amount/currency mismatch, full reversals
and stale share cards. Provider API responses are mocked.

Initial-homepage regressions render MYR/RM5 and USD/US$2 through the actual handler
in English, Chinese and Malay. They cover symbols, input minimum, one-unit
controls, review placeholders, floor copy and the distinct live #1 quote. The
currency pass preserves merchant-provided prices rather than replacing currency
tokens across the entire page.

No real hosted USD test checkout has yet been completed by this task and no payment
credentials were read. A full read-only ledger proposal and sourced reference
rate are available in the linked carryover review. Refresh that ledger and approve
the actual rate/time at cutover; hosted checkout verification remains required.

Run the current full gates and report actual results:

```
pnpm run check
pnpm test
pnpm run build
pnpm run cf:dry-run
git diff --check
```

## Historical validation — 2026-09-08, not current release evidence

- Syntax gate: `node scripts/check.mjs`.
- Backend gate: `node --test tests/backend/*.test.js` (127 tests).
- Build: `node scripts/build-static.mjs` and Wrangler Pages Functions bundle.
- Added real SQLite coverage for conversion, missing rates, immutable rates,
  grouped admin totals, snapshots, late MYR settlement, duplicate webhooks,
  currency/amount mismatch, top-ups, refunds/disputes and stale share cards.
- Browser: homepage, categories and listing details in English/Chinese. A synthetic
  US$1.25 prior balance plus US$1 shows US$2.25 and expected #1 on both the listing
  form and homepage review. No hosted checkout button was clicked.
- The About page shows global copy and USD totals. The 390px mobile layout has
  no horizontal page overflow. No browser console warnings or errors were recorded
  during the homepage, category and listing checks.
- Local preview: `/tmp/rankoff-usd-preview`, `http://127.0.0.1:8789`, isolated local
  D1 with synthetic records and no real payment keys.

Provider references checked during development:
[checkout sessions](https://docs.dodopayments.com/developer-resources/checkout-session)
and [dynamic pricing](https://docs.dodopayments.com/developer-resources/dynamic-pricing-checkout).

## Launch clarity and acquisition follow-up

The launch follow-up added migration `0007_acquisition.sql`. Check its current
applied state before any individually reviewed DDL; never replay it based on this
historical note and never use migrations apply. It adds first-party session/payment-attribution
storage and indexes. It neither changes board currency nor marks a payment settled.
The existing SESSION_HASH_SALT must be configured. Campaign failures do not prevent
checkout. Phone collection remains available but is optional for global customers.

`/admin` now shows a 30-day campaign report using the existing admin token, kept
only in tab memory. No Meta pixel, advertising spend import, messages or automated
posts are enabled. See `FOUNDER_LAUNCH_KIT.md` for the measurement model and manual
launch workflow. Deploying analytics does not complete founder recruitment.

The updated generic social preview is `assets/rankoff-og-claim.png` (1730 × 909).
It was edited with the built-in imagegen tool from the original OG asset using
this prompt: “Change ONLY the small tagline under RANKOFF from BID YOUR WAY TO #1
to exactly CLAIM YOUR POSITION. Keep the recognizable red and white R mark, the
RANKOFF wordmark, black background, centered composition and all existing logo
geometry unchanged. Preserve the two red dots around the tagline. Keep the same
wide social preview aspect ratio, ideally 1200 by 630 pixels. Crisp clean lettering.
No added text, numbers, prices, claims, decoration or watermark.” The resulting
image was visually inspected and its actual dimensions are declared in metadata.
