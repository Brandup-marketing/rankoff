import { requireDatabase } from '../../../_lib/config.js';
import { requireAdmin } from '../../../_lib/security.js';
import { json } from '../../../_lib/http.js';

export async function onRequestGet({ request, env }) {
  await requireAdmin(request, env);
  const db = requireDatabase(env);
  const jobs = await db.prepare(`SELECT j.id,j.listing_id,l.title,j.state,j.caption,j.attempts,
    j.next_attempt_at,j.last_error,j.created_at,d.platform,d.state AS delivery_state,
    d.container_id,d.post_id,d.last_error AS delivery_error
    FROM social_jobs j JOIN listings l ON l.id=j.listing_id
    LEFT JOIN social_deliveries d ON d.job_id=j.id ORDER BY j.created_at DESC LIMIT 100`).all();
  return json({ jobs: jobs.results });
}
