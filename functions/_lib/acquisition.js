import { ApiError, sessionHashSalt } from "./config.js";
import { sha256Hex } from "./security.js";

const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CAMPAIGN_LABEL = /^[a-z0-9][a-z0-9_.-]{0,63}$/;

export function acquisitionInput(input) {
  if (!input || typeof input !== "object" || !SESSION_ID.test(input.session_id || "")) {
    throw new ApiError(422, "invalid_session", "A valid visit identifier is required.");
  }
  const clean = (value, fallback) => {
    const label = typeof value === "string" ? value.toLowerCase() : "";
    return CAMPAIGN_LABEL.test(label) ? label : fallback;
  };
  return {
    session_id: input.session_id.toLowerCase(),
    source: clean(input.source, "direct"), medium: clean(input.medium, "none"),
    campaign: clean(input.campaign, "none"), content: clean(input.content, "none"),
  };
}

export async function recordAcquisition(db, env, boardId, input, event = "visit", now = new Date().toISOString()) {
  if (!["visit", "review_opened"].includes(event)) {
    throw new ApiError(422, "invalid_event", "Only visit and review_opened are accepted here.");
  }
  const value = acquisitionInput(input);
  const hash = await sha256Hex(`${sessionHashSalt(env)}:${value.session_id}`);
  // First source within this browser-tab session wins. Reloads and retries
  // cannot inflate visits or rewrite a checkout's campaign.
  await db.prepare(`INSERT OR IGNORE INTO acquisition_sessions
    (session_hash, board_id, source, medium, campaign, content, started_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`)
    .bind(hash, boardId, value.source, value.medium, value.campaign, value.content, now).run();
  if (event === "review_opened") {
    await db.prepare(`UPDATE acquisition_sessions SET reviewed_at = COALESCE(reviewed_at, ?1)
      WHERE session_hash = ?2 AND board_id = ?3`).bind(now, hash, boardId).run();
  }
  return hash;
}

export async function attributePayment(db, env, bid, input) {
  if (!input) return;
  const hash = await recordAcquisition(db, env, bid.boardId, input);
  await db.prepare(`INSERT OR IGNORE INTO payment_attribution (bid_id, session_hash)
    SELECT ?1, session_hash FROM acquisition_sessions WHERE session_hash = ?2 AND board_id = ?3`)
    .bind(bid.id, hash, bid.boardId).run();
}

export async function acquisitionReport(db, boardId, since) {
  // Settlements come only from the payment ledger, never a browser event.
  // Repeat means an earlier still-settled payment on the same listing; this
  // does not prove that the same person paid twice or that owners are independent.
  const result = await db.prepare(`WITH payment_metrics AS (
    SELECT a.session_hash,
      SUM(CASE WHEN b.checkout_url IS NOT NULL THEN 1 ELSE 0 END) AS checkouts,
      SUM(CASE WHEN b.status = 'settled' THEN 1 ELSE 0 END) AS settled_payments,
      COUNT(DISTINCT CASE WHEN b.status = 'settled' THEN b.listing_id END) AS paid_listings,
      SUM(CASE WHEN b.status = 'settled' AND EXISTS (
        SELECT 1 FROM bids earlier WHERE earlier.listing_id = b.listing_id AND earlier.status = 'settled'
        AND (earlier.settled_at < b.settled_at OR (earlier.settled_at = b.settled_at AND earlier.id < b.id))
      ) THEN 1 ELSE 0 END) AS repeat_payments
    FROM payment_attribution a JOIN bids b ON b.id = a.bid_id AND b.board_id = ?1
    GROUP BY a.session_hash
  ), clicks AS (
    SELECT session_hash, COUNT(*) AS outbound_clicks FROM click_events
    WHERE board_id = ?1 AND occurred_at >= ?2 GROUP BY session_hash
  ) SELECT s.source, s.medium, s.campaign, s.content, COUNT(*) AS visits,
    SUM(CASE WHEN s.reviewed_at IS NOT NULL THEN 1 ELSE 0 END) AS reviewed_visits,
    SUM(COALESCE(p.checkouts, 0)) AS checkouts,
    SUM(COALESCE(p.settled_payments, 0)) AS settled_payments,
    SUM(COALESCE(p.repeat_payments, 0)) AS repeat_payments,
    SUM(COALESCE(c.outbound_clicks, 0)) AS outbound_clicks
    FROM acquisition_sessions s LEFT JOIN payment_metrics p ON p.session_hash = s.session_hash
    LEFT JOIN clicks c ON c.session_hash = s.session_hash
    WHERE s.board_id = ?1 AND s.started_at >= ?2
    GROUP BY s.source, s.medium, s.campaign, s.content
    ORDER BY settled_payments DESC, visits DESC, s.source, s.campaign`).bind(boardId, since).all();
  const coverage = await db.prepare(`SELECT COUNT(*) AS settled_payments,
    SUM(CASE WHEN a.bid_id IS NOT NULL THEN 1 ELSE 0 END) AS attributed_payments,
    COUNT(DISTINCT b.listing_id) AS paid_listings
    FROM bids b LEFT JOIN payment_attribution a ON a.bid_id = b.id
    WHERE b.board_id = ?1 AND b.status = 'settled' AND b.settled_at >= ?2`).bind(boardId, since).first();
  return { since, model: "first_source_per_tab_session", campaigns: result.results || [], coverage };
}
