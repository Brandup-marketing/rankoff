# USD launch preparation — 2026-09-08

Local development only. Nothing in this change has been deployed, applied to the
production database, or used to create a real payment. Do not push `main` as a
routine save: it deploys the live site.

## Proposed behavior

- New listings and top-ups start at **US$1**, in whole US dollars.
- English and Chinese pages, metadata, payment review, category pages, listing
  details and generated rank cards use the board currency. Historical equivalents
  retain cents; suggested new payments round up to whole dollars.
- Dodo checkout first verifies the product is a USD one-time, pay-what-you-want,
  tax-inclusive product with no PPP or discount and a minimum no higher than the
  requested amount. The request fixes the billing currency and disables currency
  selection and discount codes. Signed webhooks still verify the original amount
  and currency before settlement.
- Existing payment records and receipts remain in their original currency.
  Admin payment totals are grouped by currency, never summed as mixed money.

## Legacy balance decision remains open

The implementation supports carrying MYR ranking value forward using one recorded,
immutable MYR-to-USD rate. **This policy and its actual rate are not approved.**
The old `PRODUCTION_HANDOFF.md` prohibits mixed-currency ranking through conversion;
activating this option requires Jake's explicit decision to supersede that rule.
The alternative is an archived MYR board and a fresh USD board, which would need
additional archive/routing work before launch.

For carryover, record the source URL, observation date, numerator, denominator,
and cutover timestamp. Convert each eligible original payment to USD cents with
`ROUND(original_minor * numerator / denominator)`, then sum those cents. Display
the fixed rate beside the board. Late MYR checkouts use the same rate; refunds and
disputes remove that payment's contribution. Rounding can create ties; the existing
deterministic tie-break applies. Review every existing listing's before/after
total and rank before approving the cutover.

The local fixtures use **4 MYR = 1 USD solely for deterministic testing**. They
are fictional businesses and must never be copied into production or quoted as
a current exchange rate.

## Deployment prerequisites and order

1. Confirm the legacy policy and actual documented rate. Prepare a table from a
   fresh production read showing original payment totals by currency, proposed
   USD ranking equivalents, and before/after ranks. Finalize the legal conversion
   explanation in both languages against that approved policy.
2. Verify a real Dodo USD product and test-mode hosted checkout, including US$1,
   a larger top-up, receipt currency, inclusive tax behavior and signed settlement.
   Provider calls in the automated tests are mocked; a real hosted USD checkout
   has **not** been verified. Use the official product GET endpoint to inspect
   settings. Never change a shared MYR product merely to relabel it USD.
3. Obtain the live release approval required by
   `HANDOFF_2026-09-07_SESSION.md`: “Money/publishing actions stay human-gated.”
   Do not click Continue to checkout on Jake's behalf.
4. Back up D1 and record the current deployment, board settings, original payment
   totals by currency, and any still-open MYR checkouts. Plan a short maintenance
   window so old code cannot serve original MYR values under a USD board label.
5. Apply **only** `migrations/0006_ranking_currency.sql` explicitly with D1 execute
   after reviewing it. It adds a table, immutable-rate triggers and a ranking
   view; it does not switch currency or modify original payments.
   **Never run `wrangler d1 migrations apply`.** Migration 0002 is unsafe to replay.
6. With checkout paused and the public board in maintenance, insert the approved
   conversion record for the actual board ID and change that board to USD with
   `min_increment_minor = 100`. Do not update `bids.amount_minor`, `bids.currency`
   or old snapshots. Keep all original rows, including pending MYR attempts.
7. Deploy this code with the verified USD `DODO_PRODUCT_ID`, `DEFAULT_CURRENCY=USD`
   and payments still disabled. The checked-in product ID is the existing MYR
   product, so **it must be replaced before enabling checkout**. Check effective
   deployed variables; do not assume dashboard overrides match the file.
8. Confirm no settled `ranking_payments` row has a NULL `ranking_amount_minor`.
   Reconcile the board, each category, activity, stats, listing records and admin
   totals against the reviewed before/after table. Reopen the board only on success.
   Regenerate stored listing rank cards with the USD admin page. Pre-cutover cards
   remain stored but are no longer selected. New product OG URLs include currency;
   purge old image URLs where possible and refresh social previews (third-party
   caches may persist). The generic brand image contains no price.
9. Enable payments only after these checks. Jake completes any real payment
   verification. Verify the actual signed webhook, receipt and resulting rank
   before running ads that say “from US$1.”

## Rollback

Before any USD settlement, restore the old board currency/floor, product settings
and deployment together under maintenance; additive schema and original records
can remain. After a USD settlement, **do not simply switch the board back to MYR**
or restore an old database backup over newer payments. Pause checkout and fix
forward or design a reviewed rollback that accounts for every currency and any
late provider events. Immutable conversion records must not be edited or deleted.

## Local validation

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

The launch follow-up adds migration `0007_acquisition.sql`. Apply that reviewed,
additive file explicitly with D1 execute before enabling campaign measurement;
never use migrations apply. It only adds first-party session/payment-attribution
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
