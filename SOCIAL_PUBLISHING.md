# Merchant introductions on Facebook and Instagram

## Deployment status — 2026-09-14

Code and additive schema deployed. Both publishing switches remain off.
177 backend tests passed; real Browser Run output visually verified as a complete
1080×1080 JPEG. The live board remained MYR with a 500-minor-unit minimum.

Jake confirmed the destinations: Facebook Rankoff
`https://www.facebook.com/profile.php?id=61594359445528` and Instagram `@rankoff.my`.
The existing token lists only BrandUp Design Marketing (Page 104060961430277,
Instagram 17841459622069927). Reading the supplied Rankoff Page ID returned
Graph code 100/subcode 33. Verify the canonical Graph Page ID and grant the
BRANDUP AUTOMATION System User access to both Rankoff assets before activation.
Do not replace the existing profile-discovery Instagram binding merely to change
publishing targets. Set SOCIAL_INSTAGRAM_USER_ID to the verified Rankoff IG ID,
verify SOCIAL_FACEBOOK_PAGE_ID against Graph, set SOCIAL_START_AT to activation
time (no historical backfill), then enable both switches. No posts have been sent.

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
