import { requireDatabase } from '../../../_lib/config.js';

export async function onRequestGet({ env, params }) {
  const card = await requireDatabase(env).prepare(`SELECT j.image FROM social_jobs j
    JOIN listings l ON l.id=j.listing_id WHERE j.id=?1 AND l.status='approved'
    AND EXISTS (SELECT 1 FROM bids b WHERE b.listing_id=l.id AND b.status='settled')`)
    .bind(String(params.jobId || '')).first();
  if (!card?.image) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(card.image), { headers: {
    'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=300',
    'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex',
  } });
}
