# Rankoff deployment runbook

## Production targets

- Cloudflare Pages project: `rankoff-git`
- Pages URL: `https://rankoff-git.pages.dev`
- Custom domain: `https://rankoff.my`
- GitHub repository: `https://github.com/Brandup-marketing/rankoff`
- Production branch: `main`

Cloudflare Pages is connected to the GitHub repository with production and
preview deployments enabled. A successful push to `main` should create the
production deployment automatically; pull-request branches may create previews.

On 2026-08-28 the apex hostname was attached to `rankoff-git` and the active
Cloudflare DNS zone received a proxied, automatic-TTL CNAME from `rankoff.my` to
`rankoff-git.pages.dev`. DNS control validation passed; Cloudflare may briefly
show certificate validation as pending while the hostname finishes activating.

## Current repository history warning

The local repository and the GitHub `main` branch were created as unrelated root
histories. Do not force-push and do not discard either history. After the product
changes have been committed locally, join the histories once with a merge commit
that keeps the reviewed local tree, then push normally:

```sh
git fetch origin main
git merge --allow-unrelated-histories -s ours origin/main \
  -m "Join GitHub upload history with local Rankoff history"
git push origin main
```

Run this only from a clean worktree after the intended application changes are
committed. The merge records the existing GitHub commit as an ancestor and avoids
rewriting remote history. The `ours` merge strategy intentionally keeps the local
tree because the uploaded GitHub commit omitted the `assets/` directory.

## Release verification

After every production push:

1. Confirm the latest Pages deployment was triggered by `github:push`, uses the
   expected commit SHA, and finished with `success`.
2. Check both `https://rankoff-git.pages.dev/` and `https://rankoff.my/` return
   HTTP 200.
3. Verify the logo and favicon URLs return image content, not the HTML fallback.
4. Smoke-test the homepage, About, Legal, bidding review flow, mobile layout, and
   any API endpoints.
5. Check browser console and network errors, then record the deployed commit SHA.

Example read-only checks:

```sh
curl -I https://rankoff-git.pages.dev/
curl -I https://rankoff.my/
curl -I https://rankoff.my/assets/rankoff-brand-lockup.png
dig +short rankoff.my A
```

## Rollback

Use Cloudflare Pages deployment history to promote the last verified deployment,
or revert the faulty Git commit and push the revert. Do not delete the `rankoff`
or `rankoff-git` Pages projects during a release. The older `rankoff` direct-upload
project is intentionally left untouched until its removal is separately approved.

## Required production configuration

Store payment keys, webhook secrets, database bindings, and admin secrets in
Cloudflare environment bindings. Never commit them to Git or expose them to
browser JavaScript. Keep preview and production secrets separate and complete the
payment, moderation, security, legal, and reconciliation gates in
`PRODUCTION_HANDOFF.md` before enabling real charges.

The committed config intentionally stays in safe preview mode. Production needs:

- D1 binding `DB`, with `migrations/0001_production_core.sql` applied
- vars `RANKOFF_MODE=production`, `PAYMENTS_ENABLED=false` initially, and the correct board/currency
- secrets `ADMIN_API_TOKEN`, `SESSION_HASH_SALT`, `DODO_PAYMENTS_API_KEY`, and `DODO_PAYMENTS_WEBHOOK_KEY`
- variable/secret `DODO_PRODUCT_ID` for a one-time Dodo **Pay What You Want** product
- Dodo webhook URL `https://rankoff.my/api/webhooks/dodo`

Enable the board database flag and `PAYMENTS_ENABLED=true` only after test checkout,
signed webhook, duplicate delivery, refund, dispute, and rank-rebuild tests pass.
