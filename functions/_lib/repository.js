import { ApiError } from "./config.js";

export async function loadBoard(db, slug) {
  const board = await db
    .prepare(
      `SELECT id, slug, name, currency, min_increment_minor, status, checkout_enabled
       FROM boards
       WHERE slug = ?1`,
    )
    .bind(slug)
    .first();
  if (!board || board.status === "closed") {
    throw new ApiError(404, "board_not_found", "That board is not available.");
  }
  return board;
}

export async function loadPublicBoard(db, board, { category, period, limit }) {
  const where = [
    "b.board_id = ?1",
    "b.status = 'settled'",
    "l.status = 'approved'",
  ];
  const bindings = [board.id];
  if (category !== "all") {
    bindings.push(category);
    where.push(`l.category = ?${bindings.length}`);
  }
  if (period === "today") {
    where.push("b.settled_at >= datetime('now', '-24 hours')");
  }
  bindings.push(limit);
  const limitBinding = `?${bindings.length}`;

  const statement = db.prepare(
    `WITH eligible AS (
       SELECT
         b.id AS bid_id,
         b.listing_id,
         b.amount_minor,
         b.currency,
         b.settled_at,
         l.title,
         l.description,
         l.destination_url,
         l.hostname,
         l.favicon_url,
         l.category,
         ROW_NUMBER() OVER (
           PARTITION BY b.listing_id
           ORDER BY b.amount_minor DESC, b.settled_at ASC, b.id ASC
         ) AS listing_bid_order
       FROM bids b
       INNER JOIN listings l ON l.id = b.listing_id
       WHERE ${where.join(" AND ")}
     ), best AS (
       SELECT * FROM eligible WHERE listing_bid_order = 1
     ), ranked AS (
       SELECT
         *,
         ROW_NUMBER() OVER (
           ORDER BY amount_minor DESC, settled_at ASC, bid_id ASC
         ) AS public_rank
       FROM best
     )
     SELECT
       ranked.*,
       (SELECT COUNT(*) FROM click_events c
        WHERE c.listing_id = ranked.listing_id
        ${period === "today" ? "AND c.occurred_at >= datetime('now', '-24 hours')" : ""}) AS clicks
     FROM ranked
     ORDER BY public_rank ASC
     LIMIT ${limitBinding}`,
  );

  const [rankingResult, snapshot] = await Promise.all([
    statement.bind(...bindings).all(),
    db
      .prepare(
        `SELECT id, created_at
         FROM ranking_snapshots
         WHERE board_id = ?1
         ORDER BY created_at DESC, id DESC
         LIMIT 1`,
      )
      .bind(board.id)
      .first(),
  ]);

  const rankings = rankingResult.results.map((row) => ({
    rank: Number(row.public_rank),
    listing: {
      id: row.listing_id,
      title: row.title,
      description: row.description,
      url: row.destination_url,
      hostname: row.hostname,
      favicon_url: row.favicon_url,
      category: row.category,
    },
    bid: {
      id: row.bid_id,
      amount_minor: Number(row.amount_minor),
      currency: row.currency,
      settled_at: row.settled_at,
    },
    clicks: Number(row.clicks || 0),
  }));
  const topAmount = rankings[0]?.bid.amount_minor || 0;

  return {
    mode: "production",
    board: publicBoard(board),
    snapshot_id: snapshot?.id || null,
    generated_at: new Date().toISOString(),
    rankings,
    next_bid_minor: topAmount + Number(board.min_increment_minor),
  };
}

export async function loadPublicStats(db, board) {
  const result = await db
    .prepare(
      `SELECT
         (SELECT COUNT(DISTINCT session_hash)
          FROM page_events
          WHERE board_id = ?1) AS total_visitors,
         (SELECT COUNT(DISTINCT session_hash)
          FROM page_events
          WHERE board_id = ?1
            AND CAST(strftime('%s', occurred_at) AS INTEGER) >= unixepoch() - 300) AS online_now,
         (SELECT COUNT(*) FROM click_events WHERE board_id = ?1) AS total_clicks,
         (SELECT COALESCE(SUM(amount_minor), 0)
          FROM bids
          WHERE board_id = ?1 AND status = 'settled') AS settled_revenue_minor`,
    )
    .bind(board.id)
    .first();

  return {
    mode: "production",
    board_id: board.id,
    online_now: Number(result?.online_now || 0),
    total_visitors: Number(result?.total_visitors || 0),
    total_clicks: Number(result?.total_clicks || 0),
    settled_revenue_minor: Number(result?.settled_revenue_minor || 0),
    currency: board.currency,
    updated_at: new Date().toISOString(),
  };
}

export async function loadListingForBid(db, listingId) {
  const listing = await db
    .prepare(
      `SELECT
         l.id, l.board_id, l.title, l.description, l.destination_url, l.hostname,
         l.favicon_url, l.category, l.status,
         b.slug AS board_slug, b.currency, b.min_increment_minor, b.status AS board_status,
         b.checkout_enabled
       FROM listings l
       INNER JOIN boards b ON b.id = l.board_id
       WHERE l.id = ?1`,
    )
    .bind(listingId)
    .first();
  if (!listing || listing.status !== "approved") {
    throw new ApiError(404, "listing_not_eligible", "That listing is not eligible to bid.");
  }
  if (listing.board_status !== "active" || Number(listing.checkout_enabled) !== 1) {
    throw new ApiError(503, "checkout_paused", "Checkout is paused for this board.");
  }
  return listing;
}

export async function loadMinimumBid(db, listing) {
  const row = await db
    .prepare(
      `SELECT COALESCE(MAX(amount_minor), 0) AS top_amount_minor
       FROM bids
       WHERE board_id = ?1 AND status = 'settled'`,
    )
    .bind(listing.board_id)
    .first();
  return Number(row?.top_amount_minor || 0) + Number(listing.min_increment_minor);
}

export async function findIdempotentBid(db, listingId, idempotencyKey) {
  return db
    .prepare(
      `SELECT
         id, listing_id, amount_minor, currency, status, request_fingerprint,
         checkout_url, created_at, settled_at
       FROM bids
       WHERE listing_id = ?1 AND idempotency_key = ?2`,
    )
    .bind(listingId, idempotencyKey)
    .first();
}

export async function createPendingBid(db, bid) {
  await db
    .prepare(
      `INSERT INTO bids (
         id, board_id, listing_id, amount_minor, currency, status, idempotency_key,
         request_fingerprint, challenged_rank, challenged_snapshot_id, provider,
         created_at, updated_at
       ) VALUES (?1, ?2, ?3, ?4, ?5, 'pending_payment', ?6, ?7, 1, ?8, 'dodo', ?9, ?9)`,
    )
    .bind(
      bid.id,
      bid.boardId,
      bid.listingId,
      bid.amountMinor,
      bid.currency,
      bid.idempotencyKey,
      bid.fingerprint,
      bid.snapshotId,
      bid.createdAt,
    )
    .run();
}

export async function updateBidCheckout(db, bidId, checkout, now) {
  await db
    .prepare(
      `UPDATE bids
       SET status = 'checkout_created', provider_checkout_id = ?2,
           provider_payment_id = COALESCE(?3, provider_payment_id), checkout_url = ?4,
           updated_at = ?5
       WHERE id = ?1 AND status = 'pending_payment'`,
    )
    .bind(bidId, checkout.sessionId, checkout.paymentId, checkout.checkoutUrl, now)
    .run();
}

export async function markBidSetupFailed(db, bidId, now) {
  await db
    .prepare(
      `UPDATE bids
       SET status = 'payment_failed', updated_at = ?2
       WHERE id = ?1 AND status = 'pending_payment'`,
    )
    .bind(bidId, now)
    .run();
}

export async function loadPublicBid(db, bidId) {
  const bid = await db
    .prepare(
      `SELECT id, listing_id, amount_minor, currency, status, created_at, settled_at
       FROM bids
       WHERE id = ?1`,
    )
    .bind(bidId)
    .first();
  if (!bid) throw new ApiError(404, "bid_not_found", "That bid could not be found.");
  return publicBid(bid);
}

export async function createListing(db, listing) {
  await db
    .prepare(
      `INSERT INTO listings (
         id, board_id, owner_reference_hash, title, description, destination_url,
         hostname, favicon_url, category, status, created_at, updated_at
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'pending_review', ?10, ?10)`,
    )
    .bind(
      listing.id,
      listing.boardId,
      listing.ownerReferenceHash,
      listing.title,
      listing.description,
      listing.destinationUrl,
      listing.hostname,
      listing.faviconUrl,
      listing.category,
      listing.createdAt,
    )
    .run();
}

export async function loadApprovedDestination(db, listingId) {
  return db
    .prepare(
      `SELECT id, board_id, destination_url, hostname
       FROM listings
       WHERE id = ?1 AND status = 'approved'`,
    )
    .bind(listingId)
    .first();
}

export async function recordClick(db, click) {
  await db
    .prepare(
      `INSERT INTO click_events (
         id, board_id, listing_id, snapshot_id, displayed_rank, session_hash,
         destination_host, occurred_at
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    )
    .bind(
      click.id,
      click.boardId,
      click.listingId,
      click.snapshotId,
      click.rank,
      click.sessionHash,
      click.destinationHost,
      click.occurredAt,
    )
    .run();
}

export async function recordBoardView(db, event) {
  await db
    .prepare(
      `INSERT INTO page_events (
         id, board_id, event_type, snapshot_id, session_hash, occurred_at
       ) VALUES (?1, ?2, 'board_viewed', ?3, ?4, ?5)`,
    )
    .bind(event.id, event.boardId, event.snapshotId, event.sessionHash, event.occurredAt)
    .run();
}

export async function loadBidForWebhook(db, bidId) {
  return db
    .prepare(
      `SELECT id, board_id, listing_id, amount_minor, currency, status,
              provider_checkout_id, provider_payment_id, settled_at
       FROM bids WHERE id = ?1`,
    )
    .bind(bidId)
    .first();
}

export async function applyProviderEvent(db, event) {
  const snapshotId = event.nextStatus === "settled" || event.nextStatus === "reversed"
    ? crypto.randomUUID()
    : null;
  const statements = [
    db.prepare(
      `INSERT INTO webhook_events (
         id, provider, provider_event_id, event_type, event_timestamp,
         payload_json, received_at, processed_at
       ) VALUES (?1, 'dodo', ?2, ?3, ?4, ?5, ?6, ?6)`,
    ).bind(crypto.randomUUID(), event.providerEventId, event.eventType, event.eventTimestamp, event.payloadJson, event.receivedAt),
    db.prepare(
      `UPDATE bids
       SET status = ?2, provider_payment_id = COALESCE(?3, provider_payment_id),
           last_provider_event_id = ?4,
           settled_at = CASE WHEN ?2 = 'settled' THEN COALESCE(settled_at, ?5) ELSE settled_at END,
           updated_at = ?5
       WHERE id = ?1`,
    ).bind(event.bidId, event.nextStatus, event.paymentId, event.providerEventId, event.receivedAt),
    db.prepare(
      `INSERT INTO audit_events (
         id, actor_type, action, target_type, target_id, provider_event_id,
         request_id, before_json, after_json, created_at
       ) VALUES (?1, 'provider', ?2, 'bid', ?3, ?4, ?5, ?6, ?7, ?8)`,
    ).bind(crypto.randomUUID(), `bid.${event.nextStatus}`, event.bidId, event.providerEventId, event.requestId, JSON.stringify({ status: event.previousStatus }), JSON.stringify({ status: event.nextStatus }), event.receivedAt),
  ];
  if (snapshotId) {
    statements.push(
      db.prepare(
        `INSERT INTO ranking_snapshots (id, board_id, source_event_id, created_at)
         VALUES (?1, ?2, ?3, ?4)`,
      ).bind(snapshotId, event.boardId, event.providerEventId, event.receivedAt),
    );
  }
  await db.batch(statements);
  return snapshotId;
}

export function publicBid(bid) {
  return {
    id: bid.id,
    listing_id: bid.listing_id,
    amount_minor: Number(bid.amount_minor),
    currency: bid.currency,
    status: bid.status,
    created_at: bid.created_at,
    settled_at: bid.settled_at || null,
  };
}

function publicBoard(board) {
  return {
    id: board.id,
    slug: board.slug,
    name: board.name,
    currency: board.currency,
    min_increment_minor: Number(board.min_increment_minor),
  };
}
