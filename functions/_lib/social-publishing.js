import { loadBoard, loadPublicBoard } from './repository.js';
import { profilePath } from './platform.js';
import { formatMoney } from './product.js';
import { readImageHeader } from './imageheader.js';

const ORIGIN = 'https://rankoff.my';
const PLATFORMS = ['facebook', 'instagram'];
const clean = (value, limit) => String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, limit);

export function socialContent(entry, now) {
  const url = new URL(profilePath(entry.listing.hostname), ORIGIN).href;
  const name = clean(entry.listing.title, 160);
  const description = clean(entry.listing.description, 240);
  return {
    caption: [`Meet ${name} on RANKOFF.`, description, `Explore this business: ${url}`,
      `Sponsored listing. Rank reflects total paid, captured ${now.slice(0, 10)}.`].filter(Boolean).join('\n\n'),
    model: { language: 'en', url: entry.listing.url, card: { name, place: entry.rank,
      where: 'RANKOFF', total: formatMoney(entry.bid.amount_minor, entry.bid.currency),
      period: 'all', capturedAt: now.slice(0, 10) } },
  };
}

export async function discoverSocialJobs(db, startAt, now) {
  if (!startAt || !Number.isFinite(Date.parse(startAt))) throw new Error('social_start_date_required');
  // Include reversed historic settlements in MIN: an old merchant's top-up is
  // never mistaken for a first payment. Discovery is entirely off the webhook.
  await db.prepare(`INSERT OR IGNORE INTO social_jobs
    (id, listing_id, first_settled_at, next_attempt_at, created_at, updated_at)
    SELECT 'intro_' || l.id, l.id, MIN(b.settled_at), ?2, ?2, ?2
    FROM listings l JOIN bids b ON b.listing_id = l.id
    WHERE b.settled_at IS NOT NULL AND l.status = 'approved'
    GROUP BY l.id HAVING MIN(b.settled_at) >= ?1
      AND SUM(CASE WHEN b.status = 'settled' THEN 1 ELSE 0 END) > 0`)
    .bind(new Date(startAt).toISOString(), now).run();
}

class MetaError extends Error {
  constructor(code, ambiguous = false) { super(code); this.ambiguous = ambiguous; }
}

export async function graph(env, path, fields, method = 'GET', fetcher = fetch, token = env.META_ACCESS_TOKEN) {
  const version = /^v\d+\.\d+$/.test(env.META_GRAPH_API_VERSION || '') ? env.META_GRAPH_API_VERSION : 'v25.0';
  const url = new URL(`https://graph.facebook.com/${version}/${path}`);
  const params = new URLSearchParams(fields);
  if (method === 'GET') url.search = params.toString();
  let response, data;
  try {
    response = await fetcher(url, { method, headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      ...(method === 'POST' ? { body: params } : {}), signal: AbortSignal.timeout(15000) });
    data = await response.json();
  } catch { throw new MetaError('meta_response_uncertain', method === 'POST'); }
  if (!response.ok || data.error) {
    // Persist numeric diagnostics only; Graph can echo credentials in messages.
    throw new MetaError(`meta_http_${response.status}_code_${Number(data.error?.code || 0)}_subcode_${Number(data.error?.error_subcode || 0)}`,
      method === 'POST' && response.status >= 500);
  }
  return data;
}

async function deliveryUpdate(db, jobId, platform, state, error = null, postId = null) {
  await db.prepare(`UPDATE social_deliveries SET state=?3, last_error=?4,
    post_id=COALESCE(?5, post_id), updated_at=?6 WHERE job_id=?1 AND platform=?2`)
    .bind(jobId, platform, state, error, postId, new Date().toISOString()).run();
}

async function deliver(db, env, job, platform, fetcher) {
  await db.prepare(`INSERT OR IGNORE INTO social_deliveries(job_id,platform,updated_at) VALUES (?1,?2,?3)`)
    .bind(job.id, platform, new Date().toISOString()).run();
  const delivery = await db.prepare('SELECT * FROM social_deliveries WHERE job_id=?1 AND platform=?2').bind(job.id, platform).first();
  if (delivery.state === 'published' || delivery.state === 'review') return;
  if (delivery.state === 'publishing') {
    await deliveryUpdate(db, job.id, platform, 'review', 'interrupted_publish_verify_before_retry');
    return;
  }
  let publishing = false;
  try {
    const imageUrl = `${ORIGIN}/api/v1/social-cards/${encodeURIComponent(job.id)}`;
    if (platform === 'facebook') {
      let pageId = env.META_FACEBOOK_PAGE_ID;
      if (!pageId) {
        const pages = await graph(env, 'me/accounts', { fields: 'id,instagram_business_account', limit: '100' }, 'GET', fetcher);
        const matches = (pages.data || []).filter((page) => String(page.instagram_business_account?.id) === String(env.META_INSTAGRAM_USER_ID));
        if (matches.length !== 1) throw new MetaError('facebook_page_id_missing');
        pageId = matches[0].id;
      }
      if (!/^\d+$/.test(pageId || '')) throw new MetaError('facebook_page_id_missing');
      // A System User token is exchanged for the Page token in memory only.
      const page = await graph(env, pageId, { fields: 'access_token' }, 'GET', fetcher);
      if (!page.access_token) throw new MetaError('facebook_page_token_missing');
      await deliveryUpdate(db, job.id, platform, 'publishing');
      publishing = true;
      const result = await graph(env, `${pageId}/photos`,
        { url: imageUrl, caption: job.caption, published: 'true' }, 'POST', fetcher, page.access_token);
      if (!result.post_id && !result.id) throw new MetaError('facebook_publish_id_missing', true);
      await deliveryUpdate(db, job.id, platform, 'published', null, String(result.post_id || result.id));
    } else {
      if (!/^\d+$/.test(env.META_INSTAGRAM_USER_ID || '')) throw new MetaError('instagram_user_id_missing');
      let containerId = delivery.container_id;
      if (!containerId) {
        const result = await graph(env, `${env.META_INSTAGRAM_USER_ID}/media`,
          { image_url: imageUrl, caption: job.caption }, 'POST', fetcher);
        if (!result.id) throw new MetaError('instagram_container_id_missing');
        containerId = String(result.id);
        await db.prepare('UPDATE social_deliveries SET container_id=?3 WHERE job_id=?1 AND platform=?2')
          .bind(job.id, platform, containerId).run();
      }
      const status = await graph(env, containerId, { fields: 'status_code' }, 'GET', fetcher);
      if (status.status_code === 'PUBLISHED') {
        await deliveryUpdate(db, job.id, platform, 'published');
        return;
      }
      if (['EXPIRED', 'ERROR'].includes(status.status_code)) {
        await db.prepare('UPDATE social_deliveries SET container_id=NULL WHERE job_id=?1 AND platform=?2').bind(job.id, platform).run();
        throw new MetaError(`instagram_container_${status.status_code.toLowerCase()}`);
      }
      if (status.status_code !== 'FINISHED') return;
      await deliveryUpdate(db, job.id, platform, 'publishing');
      publishing = true;
      const result = await graph(env, `${env.META_INSTAGRAM_USER_ID}/media_publish`, { creation_id: containerId }, 'POST', fetcher);
      if (!result.id) throw new MetaError('instagram_publish_id_missing', true);
      await deliveryUpdate(db, job.id, platform, 'published', null, String(result.id));
    }
  } catch (error) {
    const uncertain = publishing && (!(error instanceof MetaError) || error.ambiguous);
    await deliveryUpdate(db, job.id, platform, uncertain ? 'review' : 'pending',
      error instanceof MetaError ? error.message : 'delivery_storage_failed');
  }
}

export async function runSocialPublisher(env, { renderImage, fetcher = fetch, now = new Date().toISOString() } = {}) {
  if (env.SOCIAL_PUBLISHING_ENABLED !== 'true') return { enabled: false };
  if (!env.META_ACCESS_TOKEN) throw new Error('meta_access_token_missing');
  const db = env.DB;
  await discoverSocialJobs(db, env.SOCIAL_START_AT, now);
  const lease = crypto.randomUUID();
  const job = await db.prepare(`UPDATE social_jobs SET lease_token=?1, lease_until=?2,
    attempts=attempts+1, updated_at=?3 WHERE id=(SELECT id FROM social_jobs
      WHERE state='pending' AND next_attempt_at<=?3 AND (lease_until IS NULL OR lease_until<?3)
      ORDER BY created_at,id LIMIT 1) RETURNING *`)
    .bind(lease, new Date(Date.parse(now) + 180000).toISOString(), now).first();
  if (!job) return { enabled: true, processed: 0 };
  let lastError = null;
  try {
    const listing = await db.prepare('SELECT board_id,status FROM listings WHERE id=?1').bind(job.listing_id).first();
    const boardRow = await db.prepare('SELECT slug FROM boards WHERE id=?1').bind(listing.board_id).first();
    const board = await loadBoard(db, boardRow.slug);
    // Paginate instead of silently excluding merchants beyond the first page.
    let entry;
    for (let page = 1; ; page++) {
      const payload = await loadPublicBoard(db, board, { category: 'all', period: 'all', limit: 100, page });
      entry = payload.rankings.find((row) => row.listing.id === job.listing_id);
      if (entry || !payload.pagination.has_next) break;
    }
    if (listing.status !== 'approved' || !entry) throw new Error('listing_not_currently_eligible');
    if (!job.image) {
      const content = socialContent(entry, now);
      const image = new Uint8Array(await renderImage(content.model));
      const header = readImageHeader(image);
      if (header?.contentType !== 'image/jpeg' || header.width !== 1200 || header.height !== 630 || image.length > 600 * 1024) {
        throw new Error('invalid_social_card');
      }
      await db.prepare(`UPDATE social_jobs SET caption=?2,card_model_json=?3,image=?4 WHERE id=?1 AND lease_token=?5`)
        .bind(job.id, content.caption, JSON.stringify(content.model), image, lease).run();
      job.caption = content.caption;
    }
    for (const platform of PLATFORMS) await deliver(db, env, job, platform, fetcher);
  } catch (error) {
    lastError = ['listing_not_currently_eligible', 'invalid_social_card'].includes(error.message) ? error.message : 'social_job_failed';
  }
  const deliveries = (await db.prepare('SELECT state FROM social_deliveries WHERE job_id=?1').bind(job.id).all()).results;
  const complete = deliveries.length === 2 && deliveries.every((d) => d.state === 'published');
  const review = deliveries.some((d) => d.state === 'review') || job.attempts >= 8;
  const next = new Date(Date.parse(now) + Math.min(3600000, 300000 * 2 ** Math.min(job.attempts - 1, 4))).toISOString();
  await db.prepare(`UPDATE social_jobs SET state=?2,next_attempt_at=?3,lease_token=NULL,lease_until=NULL,last_error=?4
    WHERE id=?1 AND lease_token=?5`).bind(job.id, complete ? 'complete' : review ? 'review' : 'pending', next, lastError, lease).run();
  return { enabled: true, processed: 1, complete, review };
}
