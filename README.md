# Rankoff

Rankoff is a sponsored bidding leaderboard. The static frontend runs as a safe preview by default; Cloudflare Pages Functions provide the production API, D1 persistence, deterministic ranking, tracked redirects, and the server-owned Dodo Payments checkout/webhook boundary.

## Run locally

```sh
python3 -m http.server 4173 --directory /Users/jakening/Documents/Codex/rankoff
```

Open `http://localhost:4173`.

## Safe default

`RANKOFF_MODE=demo` and `PAYMENTS_ENABLED=false` are committed defaults. The preview API returns sample listings and every write/payment endpoint refuses to charge. Static `file://` use falls back to browser-local demo state.

## Verify

```sh
pnpm install
pnpm run check
pnpm test
pnpm run cf:dry-run
pnpm run cf:dev
```

## Production resources

Before changing `RANKOFF_MODE` to `production`:

1. Create a D1 database, add its `DB` binding to `wrangler.jsonc`, and apply `migrations/0001_production_core.sql`.
2. Keep `checkout_enabled=0` on the board and `PAYMENTS_ENABLED=false` until moderation, legal, refund, abuse, and reconciliation gates pass.
3. In Dodo Payments, create a one-time **Pay What You Want** product. Store `DODO_PRODUCT_ID`, `DODO_PAYMENTS_API_KEY`, and `DODO_PAYMENTS_WEBHOOK_KEY` as Cloudflare production secrets/bindings.
4. Register `https://rankoff.my/api/webhooks/dodo` for payment, refund, and dispute events. The signed webhook is the only source that can settle a bid.
5. Set a strong `SESSION_HASH_SALT` and `ADMIN_API_TOKEN`; never expose either to frontend JavaScript.

The checkout API uses Dodo's documented dynamic `amount` field in integer minor units. A redirect back to Rankoff only shows “pending verification” and never promotes a listing.

## Files

- `index.html` - semantic, accessible product surface
- `styles.css` - responsive visual system
- `app.js` - deterministic local board and bidding interaction
- `functions/` - Pages Functions API, checkout, webhook, click redirect, and security boundary
- `migrations/` - D1 production schema
- `tests/backend/` - ranking, validation, route-safety, and webhook-signature tests
- `PRODUCT.md` and `DESIGN.md` - product and visual decisions
- `PRODUCTION_HANDOFF.md` - real payment and operating controls needed before launch
- `LAUNCH_RUNBOOK.md` - controlled enablement order, moderation API, and credential gates
