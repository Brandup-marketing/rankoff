# Rankoff controlled launch runbook

Rankoff is safe to publish as a preview. It is **not ready to accept real money**
until every credential and operating gate below is complete. Keep the committed
defaults at `RANKOFF_MODE=demo` and `PAYMENTS_ENABLED=false` while any gate is open.

## Public state contract

`GET /api/v1/status` is the canonical machine-readable disclosure for the UI and
support team:

- `mode=demo` means rankings are sample data and charges are impossible.
- `mode=production` means the board reads D1 settled bids.
- `checkout.state=live` appears only when the board switch is enabled, the app is
  in production, live Dodo mode is selected, and all checkout/webhook credentials
  are present.

A new listing is always `pending_review`. The creation response includes a
`status_url`; `GET /api/v1/listings/:listingId` exposes its neutral review status.
It never exposes the private moderation reason. Approval is required before a
listing can bid or appear on the public board.

## Moderation operator flow

The launch board is invite-only. Create listings with the admin bearer token,
then approve, suspend, or remove them through:

```text
PATCH /api/v1/admin/listings/:listingId
Authorization: Bearer <ADMIN_API_TOKEN>
Content-Type: application/json

{"status":"approved","reason":""}
```

Suspension and removal require a reason. A removed listing is terminal; create a
new reviewed listing if it must return. Every decision appends an audit event.
Never paste the admin token into frontend code, tickets, analytics, or screenshots.

## Enablement order

1. Apply D1 migrations and verify backup/restore.
2. Set `RANKOFF_MODE=production`; leave both checkout switches off.
3. Configure `ADMIN_API_TOKEN` and `SESSION_HASH_SALT`, then review seed listings.
4. Configure live Dodo product, API key, webhook signing key, return URL, and the
   signed webhook endpoint. Run test settlement, duplicate, refund, and dispute flows.
5. Verify `GET /api/v1/status` still reports checkout disabled.
6. Set the board row `checkout_enabled=1`, then set `PAYMENTS_ENABLED=true`.
7. Verify status reports live, complete one spend-capped real transaction, and
   reconcile the bid, webhook, audit event, ranking, and provider payout.
8. Monitor 4xx/5xx responses, D1 errors, unmatched provider events, abuse reports,
   and checkout conversion. Disable either switch immediately on mismatch.

## Credential gates remaining

- `ADMIN_API_TOKEN`
- `SESSION_HASH_SALT` (at least 32 characters)
- `DODO_PRODUCT_ID`
- `DODO_PAYMENTS_API_KEY`
- `DODO_PAYMENTS_WEBHOOK_KEY`
- `DODO_ENVIRONMENT=live_mode`
- board `checkout_enabled=1`
- `PAYMENTS_ENABLED=true` only after the operational checks above

See `PRODUCTION_HANDOFF.md` for legal, moderation, reconciliation, rate-limiting,
incident response, and jurisdiction-specific gates that credentials alone cannot satisfy.
