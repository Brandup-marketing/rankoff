import test from 'node:test';
import assert from 'node:assert/strict';
import { testDatabase, seedListing, seedPayment } from '../helpers/sqlite.js';
import { discoverSocialJobs, runSocialPublisher, socialContent, graph } from '../../functions/_lib/social-publishing.js';
import { onRequestGet as card } from '../../functions/api/v1/social-cards/[jobId].js';
import { onRequestGet as admin } from '../../functions/api/v1/admin/social.js';
import { onRequestPost as trigger, onRequestGet as diagnostics } from '../../functions/api/v1/internal/social-publish.js';

const now = '2026-09-14T06:00:00.000Z';
const envFor = (DB) => ({ DB, SOCIAL_PUBLISHING_ENABLED: 'true', SOCIAL_START_AT: '2026-09-14T00:00:00.000Z',
  META_ACCESS_TOKEN: 'test-secret', META_FACEBOOK_PAGE_ID: '123', META_INSTAGRAM_USER_ID: '456',
  SOCIAL_FACEBOOK_PAGE_ID: '123', SOCIAL_INSTAGRAM_USER_ID: '456' });
const jpeg = new Uint8Array([255,216,255,192,0,17,8,4,56,4,56,3,1,17,0,2,17,0,3,17,0,255,217]);
function setup() {
  const db = testDatabase(); db.sqlite.exec("UPDATE boards SET currency='MYR'");
  seedListing(db); seedPayment(db, { id: 'first', at: now }); return db;
}
const deliveries = (db) => db.sqlite.prepare('SELECT * FROM social_deliveries ORDER BY platform').all();
function meta(calls, override) {
  return async (url, options) => {
    calls.push({ path: url.pathname, method: options.method, body: options.body });
    const custom = await override?.(url, options);
    if (custom) return custom;
    if (url.pathname.endsWith('/123')) return Response.json({ access_token: 'page-secret' });
    if (url.pathname.endsWith('/photos')) return Response.json({ id: 'photo', post_id: 'fb-post' });
    if (url.pathname.endsWith('/media')) return Response.json({ id: 'container' });
    if (url.pathname.endsWith('/container')) return Response.json({ status_code: 'FINISHED' });
    if (url.pathname.endsWith('/media_publish')) return Response.json({ id: 'ig-post' });
    throw new Error('unexpected request');
  };
}

test('discovers one intro per merchant; excludes old merchants, reversals, pending payments and unapproved listings', async () => {
  const db = setup(); seedPayment(db, { id: 'top-up', at: now });
  seedListing(db, 'old'); seedPayment(db, { id: 'old-first', listing: 'old' }); seedPayment(db, { id: 'old-new', listing: 'old', at: now });
  seedListing(db, 'unpaid'); seedPayment(db, { id: 'unpaid', listing: 'unpaid', status: 'pending_payment', at: now });
  seedListing(db, 'removed'); seedPayment(db, { id: 'removed', listing: 'removed', at: now });
  db.sqlite.exec("UPDATE listings SET status='removed' WHERE id='removed'; UPDATE bids SET status='reversed' WHERE id='old-first'");
  await discoverSocialJobs(db, envFor(db).SOCIAL_START_AT, now);
  await discoverSocialJobs(db, envFor(db).SOCIAL_START_AT, now);
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM social_jobs').get().n, 1);
  await assert.rejects(discoverSocialJobs(db, '', now)); db.sqlite.close();
});

test('publishes both platforms once with frozen JPEG and never repeats for a top-up', async () => {
  const db = setup(), calls = []; let renders = 0;
  const options = { now, renderImage: async () => { renders++; return jpeg; }, fetcher: meta(calls) };
  assert.equal((await runSocialPublisher(envFor(db), options)).complete, true);
  seedPayment(db, { id: 'top-up', at: now });
  await runSocialPublisher(envFor(db), options);
  assert.equal(renders, 1); assert.equal(calls.filter((c) => c.method === 'POST').length, 3);
  assert.deepEqual(deliveries(db).map((d) => d.post_id), ['fb-post', 'ig-post']);
  const response = await card({ env: envFor(db), params: { jobId: 'intro_example' } });
  assert.equal(response.headers.get('content-type'), 'image/jpeg');
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), jpeg);
  db.sqlite.exec("UPDATE listings SET status='suspended'");
  assert.equal((await card({ env: envFor(db), params: { jobId: 'intro_example' } })).status, 404);
  db.sqlite.close();
});

test('partial success retries only Instagram and reuses its container and image', async () => {
  const db = setup(), calls = []; let ready = false;
  const fetcher = meta(calls, (url) => url.pathname.endsWith('/container') ? Response.json({ status_code: ready ? 'FINISHED' : 'IN_PROGRESS' }) : null);
  await runSocialPublisher(envFor(db), { now, renderImage: async () => jpeg, fetcher });
  ready = true;
  const result = await runSocialPublisher(envFor(db), { now: '2026-09-14T06:06:00.000Z', renderImage: () => { throw Error('must reuse'); }, fetcher });
  assert.equal(result.complete, true);
  assert.equal(calls.filter((c) => c.path.endsWith('/photos')).length, 1);
  assert.equal(calls.filter((c) => c.path.endsWith('/media')).length, 1); db.sqlite.close();
});

test('uncertain publish is held for review while the other platform can succeed', async () => {
  const db = setup(), calls = [];
  const fetcher = meta(calls, (url) => { if (url.pathname.endsWith('/photos')) throw Error('connection lost'); });
  assert.equal((await runSocialPublisher(envFor(db), { now, renderImage: async () => jpeg, fetcher })).review, true);
  assert.deepEqual(deliveries(db).map((d) => d.state), ['review', 'published']);
  await runSocialPublisher(envFor(db), { now: '2026-09-15T06:00:00.000Z', fetcher });
  assert.equal(calls.filter((c) => c.path.endsWith('/photos')).length, 1); db.sqlite.close();
});

test('an interrupted publishing state is never blindly resent', async () => {
  const db = setup(); await discoverSocialJobs(db, envFor(db).SOCIAL_START_AT, now);
  db.sqlite.exec(`INSERT INTO social_deliveries(job_id,platform,state,updated_at) VALUES ('intro_example','facebook','publishing','${now}')`);
  const calls = []; await runSocialPublisher(envFor(db), { now, renderImage: async () => jpeg, fetcher: meta(calls) });
  assert.equal(deliveries(db)[0].state, 'review');
  assert.equal(calls.some((c) => c.path.endsWith('/photos')), false); db.sqlite.close();
});

test('overlapping runs lease the job once and disabled mode performs no database work', { timeout: 5000 }, async () => {
  assert.deepEqual(await runSocialPublisher({ SOCIAL_PUBLISHING_ENABLED: 'false' }), { enabled: false });
  const db = setup(), calls = [];
  let unblock, started;
  const blocked = new Promise((resolve) => { unblock = resolve; });
  const rendering = new Promise((resolve) => { started = resolve; });
  const first = runSocialPublisher(envFor(db), { now, fetcher: meta(calls), renderImage: async () => { started(); await blocked; return jpeg; } });
  await rendering;
  assert.equal((await runSocialPublisher(envFor(db), { now })).processed, 0);
  unblock(); await first;
  assert.equal(calls.filter((c) => c.path.endsWith('/photos')).length, 1); db.sqlite.close();
});

test('render failure cannot change payments and never invokes Meta', async () => {
  const db = setup(); const before = db.sqlite.prepare('SELECT * FROM bids').all();
  await runSocialPublisher(envFor(db), { now, renderImage: async () => { throw Error('browser down'); }, fetcher: () => { throw Error('unexpected'); } });
  assert.deepEqual(db.sqlite.prepare('SELECT * FROM bids').all(), before);
  assert.equal(db.sqlite.prepare('SELECT last_error FROM social_jobs').get().last_error, 'social_job_failed'); db.sqlite.close();
});

test('Meta errors redact messages and tokens are only sent in Authorization', async () => {
  await assert.rejects(graph(envFor(null), '123', { fields: 'id' }, 'GET', async (url, options) => {
    assert.equal(url.href.includes('test-secret'), false);
    assert.equal(options.headers.Authorization, 'Bearer test-secret');
    return Response.json({ error: { code: 190, message: 'test-secret sensitive error' } }, { status: 400 });
  }), { message: 'meta_http_400_code_190_subcode_0' });
});

test('caption uses stored business description, profile URL and sponsored disclosure', () => {
  const result = socialContent({ rank: 2, listing: { title: 'Example', description: 'Interior design.', hostname: 'instagram:example', url: 'https://instagram.com/example' }, bid: { amount_minor: 500, currency: 'MYR' } }, now);
  assert.match(result.caption, /Interior design/); assert.match(result.caption, /https:\/\/rankoff.my\/profile\/instagram\/example/);
  assert.match(result.caption, /Sponsored/); assert.equal(result.model.card.place, 2);
});

test('social operations endpoint requires admin authentication', async () => {
  await assert.rejects(admin({ env: { ADMIN_API_TOKEN: 'test' }, request: new Request('https://rankoff.my/api/v1/admin/social') }), { code: 'unauthorized' });
});

test('internal trigger and preview reject missing or incorrect credentials', async () => {
  for (const handler of [trigger, diagnostics]) {
    const response = await handler({ env: { SOCIAL_SERVICE_TOKEN: 'test' }, request: new Request('https://rankoff.my/api/v1/internal/social-publish') });
    assert.equal(response.status, 401);
  }
});

test('publishing requires explicit destinations and never falls back to agency accounts', async () => {
  const db = setup(), env = envFor(db); delete env.SOCIAL_FACEBOOK_PAGE_ID;
  await assert.rejects(runSocialPublisher(env), { message: 'rankoff_publishing_accounts_required' });
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM social_jobs').get().n, 0); db.sqlite.close();
});
