import { safeSecretEqual } from '../../../_lib/security.js';
import { graph, runSocialPublisher, socialContent } from '../../../_lib/social-publishing.js';
import { loadBoard, loadPublicBoard } from '../../../_lib/repository.js';
import { json } from '../../../_lib/http.js';

async function authorized(request, env) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer /, '');
  return Boolean(env.SOCIAL_SERVICE_TOKEN) && await safeSecretEqual(token, env.SOCIAL_SERVICE_TOKEN);
}

async function render(env, model) {
  return env.SOCIAL_RENDERER.fetch('https://social-renderer/render', {
    method: 'POST', headers: { Authorization: `Bearer ${env.SOCIAL_SERVICE_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(model), signal: AbortSignal.timeout(45000),
  });
}

// Authenticated setup checks never publish or create a delivery job.
export async function onRequestGet({ request, env }) {
  if (!(await authorized(request, env))) return json({ error: 'unauthorized' }, { status: 401 });
  if (new URL(request.url).searchParams.get('preview') === 'true') {
    const board = await loadBoard(env.DB, env.BOARD_SLUG || 'global');
    const payload = await loadPublicBoard(env.DB, board, { category: 'all', period: 'all', limit: 100 });
    const listingId = new URL(request.url).searchParams.get('listing');
    const entry = listingId ? payload.rankings.find((row) => row.listing.id === listingId) : payload.rankings[0];
    if (!entry) return json({ error: 'no_listing' }, { status: 404 });
    return render(env, socialContent(entry, new Date().toISOString()).model);
  }
  const instagram = await graph(env, env.META_INSTAGRAM_USER_ID, { fields: 'id,username' });
  const targetPage = env.SOCIAL_FACEBOOK_PAGE_ID ? await graph(env, env.SOCIAL_FACEBOOK_PAGE_ID,
    { fields: 'id,name,instagram_business_account{id,username}' }).catch((error) => ({ error: error.message })) : null;
  const pages = await graph(env, 'me/accounts', { fields: 'id,name,tasks,instagram_business_account', limit: '100' });
  const permissions = await graph(env, 'me/permissions', {}).catch((error) => ({ error: error.message }));
  const matches = (pages.data || []).filter((page) => String(page.instagram_business_account?.id) === String(env.META_INSTAGRAM_USER_ID));
  return json({ enabled: env.SOCIAL_PUBLISHING_ENABLED === 'true', start_at: env.SOCIAL_START_AT,
    instagram, permissions, target_page: targetPage, matching_pages: matches, available_pages: pages.data || [], renderer_configured: Boolean(env.SOCIAL_RENDERER) });
}

export async function onRequestPost({ request, env }) {
  if (!(await authorized(request, env))) {
    return json({ error: 'unauthorized' }, { status: 401 });
  }
  return json(await runSocialPublisher(env, { renderImage: async (model) => {
    const response = await render(env, model);
    if (!response.ok) throw new Error('social_render_failed');
    return response.arrayBuffer();
  } }));
}
