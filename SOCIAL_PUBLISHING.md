# Merchant introductions on Facebook and Instagram

## Deployment status — 2026-09-15

Both publishing switches are enabled for new merchants whose first settlement
is at or after 2026-09-15T09:51:33.281Z (17:51 Malaysia time). No historical
backfill is enabled. All 185 backend tests and the source checks passed.

Meta access was verified after the owner assigned the Rankoff assets:
- Canonical Facebook Page ID: `1356018630922623`, name `Rankoff`.
- Connected Instagram ID: `17841423594914143`, username `rankoff.my`.
- The Page tasks include `MANAGE` and `CREATE_CONTENT`.

The supplied public Facebook profile ID `61594359445528` did not resolve through
Graph. Publishing now uses the canonical ID returned by `/me/accounts`.
The BrandUp profile-discovery bindings remain independent of these explicit
publishing destinations. The owner authorized backfill for Express Queen Lash
and Hypex Auto. Initial Facebook delivery exposed a missing `pages_manage_posts`
scope; the owner replaced the secret and live permission checks now confirm it.
Both Facebook posts and Hypex Auto Instagram delivery succeeded.

The first Queen Lash Instagram image lacked its logo because socialContent passed
an external merchant URL to the internal image-proxy resolver. It now passes the
Rankoff profile URL. Unicode initials are normalized without splitting surrogate
pairs, and social rendering refuses a card when its expected logo fails to load.
Both merchants' corrected Browser Run JPEGs were visually checked. The owner
approved replacing Queen Lash's old Instagram post; its old permalink was verified
unavailable before resetting delivery, with the original post ID retained in audit_events.

The service token is stored in both Cloudflare deployments. For future local
diagnostics, replace it in both services through secret stdin if necessary;
never print it or commit it. Existing Meta credentials remain untouched.

Every five minutes `rankoff-social-publisher` calls the authenticated Pages
endpoint `/api/v1/internal/social-publish`. Pages reads settled payments and
stores one `social_jobs` row per listing. Checkout and payment webhooks have no
dependency on this service. Top-ups do not create another introduction.

Only approved listings whose earliest recorded settlement is at or after
`SOCIAL_START_AT` are discovered. Old listings are not backfilled. The rank,
total paid, capture date, description and JPEG are frozen before delivery.
The renderer uses the existing `share-card.js` template through Browser Run.

Pages owns the existing Meta secrets. The worker does not receive them. Pages
calls the renderer through the `SOCIAL_RENDERER` service binding; both services
authenticate requests with `SOCIAL_SERVICE_TOKEN`. The worker has no public URL.
Publishing requires explicit `SOCIAL_FACEBOOK_PAGE_ID` and
`SOCIAL_INSTAGRAM_USER_ID` settings for Rankoff. It never falls back to the
agency accounts used by the existing profile-discovery integration.

## Operations

- Kill switch: set `SOCIAL_PUBLISHING_ENABLED` to `false` in either service.
- Pages configuration: `SOCIAL_START_AT`, `SOCIAL_PUBLISHING_ENABLED`,
  `META_ACCESS_TOKEN`, `SOCIAL_FACEBOOK_PAGE_ID`, `SOCIAL_INSTAGRAM_USER_ID`,
  `SOCIAL_SERVICE_TOKEN`, and `SOCIAL_RENDERER`. Optional `META_GRAPH_API_VERSION`.
- Worker configuration: `BROWSER`, `SOCIAL_SERVICE_TOKEN`,
  `SOCIAL_PUBLISHING_ENABLED`.
- Read `/api/v1/admin/social` with the existing admin bearer credential to see
  captions, delivery states, numeric Meta diagnostics, containers and post IDs.
- Authenticated GET `/api/v1/internal/social-publish` checks account matching;
  add `?preview=true` to render the current first listing without publishing.
- Apply only `migrations/0008_social_publishing.sql` using `wrangler d1 execute`.
  Never run `wrangler d1 migrations apply`: historical migration 0002 resets pricing.

Each job has a lease, and each platform has its own state. Successful platforms
are skipped on retries. Explicit rejections and image failures retry with
backoff, up to eight job attempts. A timeout or interrupted publish is held for
review because Meta might already have created the post. Exactly-once delivery
cannot be guaranteed across an external API and database commit.

For a review job, inspect the actual Page/profile and the stored container before
changing state. If the post exists, record its post ID and mark that delivery
published. Only reset a delivery to pending after confirming it did not publish.
Then reset the parent job to pending with attempts=0 and next_attempt_at set to
the current UTC time. Never clear a successful platform's record. An Instagram
container with status PUBLISHED is treated as delivered even if its media ID was
lost; its container ID remains available for reconciliation.

## Validation

Run `node scripts/check.mjs`, `node --test tests/backend/*.test.js`,
`node scripts/build-static.mjs`, the Pages Functions build, and
`wrangler deploy --dry-run --config workers/social-publisher/wrangler.jsonc`.
Preview the real rendered JPEG before activation. Do not create fake payments
or publish synthetic merchants to test this service.
