# Production Handoff

Rankoff's local state is a visual product demo only. Production must treat every
rank as a paid advertising placement. A browser must never decide a rank, price,
payment result, click total, or conversion result.

## Production Rule

`Highest settled eligible bid wins the sponsored rank.`

The public board must describe the placement as **Sponsored** and say that order
is determined by verified paid bids. It must not imply an editorial endorsement,
organic search ranking, traffic guarantee, conversion guarantee, or SEO benefit.

## Authoritative Data

Move listings, ranks, bid attempts, payments, click events, moderation decisions,
and audit records to a server-owned database. Use immutable IDs and UTC timestamps.

- A listing has an owner account, verified destination URL, status, category,
  current settled amount, and current rank.
- A bid records its requested amount, currency, listing, bidder, payment-provider
  reference, idempotency key, lifecycle status, and the rank snapshot it challenged.
- A placement is eligible only after payment settlement and moderation approval.
- The board reads a server-generated ranking snapshot. Client values are display
  hints only and must be refreshed after checkout or a realtime update.

Keep monetary amounts as integer minor units. Use one currency per board. Never
combine USD and MYR bids in a single ranking through an exchange-rate conversion.

## Payment Transaction Flow

1. The server validates the listing, its ownership, the board, minimum increment,
   currency, and bidder eligibility, then creates a `pending_payment` bid attempt.
2. The server creates a payment-provider checkout or payment intent with internal
   bid ID and immutable metadata. Amount, currency, and beneficiary are supplied
   by the server, never trusted from the client.
3. The buyer completes payment on the provider-hosted flow. Returning to Rankoff
   only shows `pending verification`; it does not promote the listing.
4. Verify the provider's signed webhook, persist the raw event safely, deduplicate
   it by provider event ID, and transition the bid to `settled` only for the final
   successful payment state required by the provider.
5. In one database transaction, lock the affected board, recalculate its ordered
   eligible bids, publish a new ranking snapshot, and append an audit event.
6. A failed, expired, refunded, disputed, or reversed payment must remove its bid
   from eligibility and recalculate the board. Show a neutral public status rather
   than exposing payment failure details.

Use provider webhooks as the source of truth. Reconcile provider settlements,
refunds, disputes, and payouts on a scheduled job; alert on unmatched records.
Do not mark a bid paid based on a redirect, client callback, or webhook delivery
alone before signature verification.

## Idempotency And Contention

- Require an idempotency key for bid creation and store the response against the
  authenticated account and request fingerprint. Replays return the original bid.
- Accept duplicate and out-of-order webhooks safely. Each state transition must be
  monotonic and recorded once.
- Re-evaluate rank at settlement, not at checkout creation. Two users can checkout
  concurrently; only settled, eligible amounts determine the displayed order.
- Define a deterministic tie-breaker before launch: earlier settled timestamp, then
  immutable bid ID. Publish it in the rules.
- Use transactional row/advisory locks or optimistic versioning for a board update.
  Never perform read-sort-write ranking in separate unguarded operations.
- Maintain a payment-to-bid reconciliation report and a repair command that is
  idempotent, access-controlled, and audit-logged.

## Listings, Links, And Disclosure

Listings require verified ownership and a live public product or business URL.
Normalize URLs, require HTTPS where possible, resolve redirects in a sandbox, and
reject private-network, loopback, malformed, malicious, parked, deceptive, and
policy-prohibited destinations. Re-check destination safety periodically and when
a redirect changes.

Every placement and outbound listing link must be visibly labelled `Sponsored`.
Outbound paid links must use `rel="sponsored nofollow"` (with `noopener noreferrer`
for a new tab). Do not sell or imply follow links, PageRank, organic placement, or
search-engine ranking improvements. Maintain a separate, clearly labelled organic
area only if an independent ranking policy exists.

## Moderation And Marketplace Safety

Before a listing can bid, verify account email and listing ownership; queue new or
high-risk listings for review. Screen names, descriptions, images, URLs, redirects,
and categories for impersonation, illegal goods/services, financial scams,
malware, adult content where prohibited, hate/harassment, copyright/trademark
abuse, and misleading claims. Provide report, takedown, appeal, suspension, and
refund pathways. Human reviewers need a reason code, evidence references, and no
ability to silently alter a settled transaction.

Rate-limit signup, listing creation, checkout creation, webhook processing, click
collection, reporting, and moderation actions. Add bot detection and anomaly rules
for self-clicking, traffic laundering, rapid bid cycling, payment fraud, and
account farms. Capture the minimum data necessary; do not expose bidder identity,
payment details, or private analytics publicly without explicit permission.

## Audit, Privacy, And Legal

Append an immutable audit event for authentication, listing changes, URL checks,
bid intent creation, provider events, bid state transitions, rank changes,
moderation, admin access, refunds, and manual interventions. Record actor, action,
target, timestamp, request/correlation ID, and before/after values where lawful.

Publish, obtain acceptance for, and version-store:

- Terms of Service and Sponsored Placement Rules
- Privacy Notice and cookie/analytics notice
- Acceptable Use, content moderation, takedown, refund, dispute, and appeal rules
- statement that Rankoff is an advertising marketplace, not an SEO service or
  outcome guarantee

Implement data-retention schedules, deletion/export requests, consent controls
where required, encrypted secrets, encryption in transit and at rest, least-
privilege admin roles, MFA for privileged users, backup/restore testing, and an
incident response contact. Obtain jurisdiction-specific legal, tax, consumer,
payments, and advertising review before accepting paid bids in each market.

## Analytics Contract

Use server-generated event IDs and a consistent `listing_id`, `board_id`,
`bid_id`, `rank_snapshot_id`, `session_id`, and `request_id` where relevant.

| Event | Required properties |
| --- | --- |
| `board_viewed` | board ID, snapshot ID, session, referrer class |
| `listing_impression` | listing ID, board ID, snapshot ID, rank, sponsored flag |
| `listing_clicked` | listing ID, board ID, snapshot ID, rank, click ID, destination host |
| `bid_checkout_started` | bid ID, listing ID, amount, currency, challenged rank |
| `bid_payment_settled` | bid ID, provider, amount, currency, settlement timestamp |
| `rank_changed` | listing ID, board ID, old rank, new rank, resulting bid ID |
| `conversion_reported` | listing ID, click ID/source, type, value/currency if opted in |

Click totals shown publicly must filter bots and be labelled as measured referral
clicks. Leads, revenue, and conversion metrics are private by default; only show
verified metrics publicly with the listing owner's explicit opt-in and a documented
verification method.

## Security And Operations

Protect checkout and admin endpoints with authentication, authorization, CSRF
defences where relevant, strict origin/CSP policies, input validation, request-size
limits, secure headers, secret rotation, webhook signature validation, structured
logs with redaction, error monitoring, uptime monitoring, database backups, and a
tested rollback plan. Do not log card data, provider secrets, raw session tokens,
or unnecessary IP/device identifiers.

Admin tools must be separate from the public app, role-gated, MFA-protected, and
fully audited. Manual refunds, placement removals, and rank repairs require a
recorded reason and dual approval above a defined value threshold.

## Rollout Gates

Do not open public bids until all gates pass:

1. Payment provider is approved for the operating entity, webhook verification and
   replay tests pass, and test refunds/disputes reconcile correctly.
2. Concurrent-bid, duplicate-request, duplicate-webhook, outage, refund, chargeback,
   and ranking-rebuild tests produce deterministic results.
3. Sponsored disclosure, paid-link attributes, terms, privacy notice, refund policy,
   and restricted-content policy are reviewed for the launch jurisdiction.
4. URL validation, moderation queue, abuse reporting, account suspension, rate
   limiting, access controls, backups, logging, monitoring, and incident ownership
   are working.
5. Analytics totals reconcile between raw events, filtered metrics, and public
   board displays; no private conversion data appears without opt-in.
6. Launch first as an invite-only, spend-capped board with human support and a
   kill switch for checkout, a listing, or the entire board. Expand only after
   settlement, abuse, support, and refund metrics remain within defined limits.

