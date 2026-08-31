import { ApiError, marketCategoryMembers } from "./config.js";

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

export async function loadPublicBoard(db, board, { category, period, limit, page = 1 }) {
  const where = [
    "b.board_id = ?1",
    "b.status = 'settled'",
    "l.status = 'approved'",
  ];
  const bindings = [board.id];
  if (category !== "all") {
    const members = marketCategoryMembers(category);
    if (!members.length) {
      where.push("1 = 0");
    } else {
      const memberBindings = members.map((member) => {
        bindings.push(member);
        return `?${bindings.length}`;
      });
      where.push(`l.category IN (${memberBindings.join(", ")})`);
    }
  }
  if (period === "today") {
    where.push("b.settled_at >= datetime('now', '-24 hours')");
  }
  const filterBindings = [...bindings];
  bindings.push(limit);
  const limitBinding = `?${bindings.length}`;
  bindings.push((page - 1) * limit);
  const offsetBinding = `?${bindings.length}`;

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
         SUM(b.amount_minor) OVER (PARTITION BY b.listing_id) AS total_minor,
         ROW_NUMBER() OVER (
           PARTITION BY b.listing_id
           ORDER BY b.settled_at DESC, b.id DESC
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
           ORDER BY total_minor DESC, settled_at ASC, bid_id ASC
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
     LIMIT ${limitBinding} OFFSET ${offsetBinding}`,
  );
  const summaryStatement = db.prepare(
    `SELECT
       COUNT(*) AS total_count,
       COALESCE(MAX(listing_total), 0) AS top_amount_minor
     FROM (
       SELECT SUM(b.amount_minor) AS listing_total
       FROM bids b
       INNER JOIN listings l ON l.id = b.listing_id
       WHERE ${where.join(" AND ")}
       GROUP BY b.listing_id
     )`,
  );
  const activityStatement = db.prepare(
    `WITH recent AS (
       SELECT
         b.id AS bid_id,
         b.listing_id,
         b.amount_minor,
         b.settled_at,
         l.title,
         l.destination_url,
         l.favicon_url,
         (SELECT COALESCE(SUM(previous.amount_minor), 0)
          FROM bids previous
          WHERE previous.board_id = b.board_id
            AND previous.listing_id = b.listing_id
            AND previous.status = 'settled'
            AND (
              previous.settled_at < b.settled_at
              OR (previous.settled_at = b.settled_at AND previous.id < b.id)
            )) AS previous_amount_minor,
         ROW_NUMBER() OVER (
           PARTITION BY b.listing_id
           ORDER BY b.settled_at DESC, b.id DESC
         ) AS activity_order
       FROM bids b
       INNER JOIN listings l ON l.id = b.listing_id
       WHERE ${where.join(" AND ")}
     )
     SELECT * FROM recent
     WHERE activity_order = 1
     ORDER BY settled_at DESC, bid_id DESC
     LIMIT 20`,
  );

  const [rankingResult, summary, snapshot, activityResult] = await Promise.all([
    statement.bind(...bindings).all(),
    summaryStatement.bind(...filterBindings).first(),
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
    activityStatement.bind(...filterBindings).all(),
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
      amount_minor: Number(row.total_minor),
      currency: row.currency,
      settled_at: row.settled_at,
    },
    clicks: Number(row.clicks || 0),
  }));
  const topAmount = Number(summary?.top_amount_minor || 0);
  const total = Number(summary?.total_count || 0);
  const rankByListing = new Map(rankings.map((entry) => [entry.listing.id, entry.rank]));
  const activity = activityResult.results
    .filter((row) => rankByListing.has(row.listing_id))
    .map((row) => {
      const previousAmount = Number(row.previous_amount_minor || 0);
      const paid = Number(row.amount_minor || 0);
      return {
        id: row.bid_id,
        type: previousAmount > 0 ? "topped_up" : "joined",
        listing_id: row.listing_id,
        listing_name: row.title,
        listing_url: row.destination_url,
        icon_url: row.favicon_url,
        amount_minor: previousAmount + paid,
        delta_minor: paid,
        rank: rankByListing.get(row.listing_id),
        created_at: row.settled_at,
      };
    });

  return {
    mode: "production",
    board: publicBoard(board),
    snapshot_id: snapshot?.id || null,
    generated_at: new Date().toISOString(),
    rankings,
    activity,
    pagination: {
      page,
      page_size: limit,
      total,
      total_pages: Math.max(1, Math.ceil(total / limit)),
      has_previous: page > 1,
      has_next: page * limit < total,
    },
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
  // Cumulative ranking: every settled payment adds to the listing's total, so any
  // amount from the board increment upward is a valid top-up. Taking a specific
  // position is a matter of the resulting total, not a per-payment floor.
  return Number(listing.min_increment_minor);
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
         created_at, updated_at, terms_version, agreed_at
       ) VALUES (?1, ?2, ?3, ?4, ?5, 'pending_payment', ?6, ?7, 1, ?8, 'dodo', ?9, ?9, ?10, ?11)`,
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
      bid.termsVersion,
      bid.agreedAt,
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
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11)`,
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
      listing.status || "pending_review",
      listing.createdAt,
    )
    .run();
}

export async function loadListingReview(db, listingId) {
  return db
    .prepare(
      `SELECT id, title, destination_url, category, status, created_at, updated_at
       FROM listings WHERE id = ?1`,
    )
    .bind(listingId)
    .first();
}

export async function moderateListing(db, listing, decision) {
  await db.batch([
    db.prepare(
      `UPDATE listings
       SET status = ?2, moderation_reason = ?3, updated_at = ?4
       WHERE id = ?1 AND status = ?5`,
    ).bind(listing.id, decision.status, decision.reason || null, decision.createdAt, listing.status),
    db.prepare(
      `INSERT INTO audit_events (
         id, actor_type, action, target_type, target_id, request_id,
         before_json, after_json, created_at
       ) VALUES (?1, 'admin', 'listing.moderated', 'listing', ?2, ?3, ?4, ?5, ?6)`,
    ).bind(
      crypto.randomUUID(),
      listing.id,
      decision.requestId,
      JSON.stringify({ status: listing.status }),
      JSON.stringify({ status: decision.status, reason: decision.reason || null }),
      decision.createdAt,
    ),
  ]);
  return loadListingReview(db, listing.id);
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

export async function findListingByHostname(db, boardId, hostname) {
  return db
    .prepare(
      `SELECT id, title, status, hostname FROM listings
       WHERE board_id = ?1 AND hostname = ?2
       ORDER BY created_at ASC LIMIT 1`,
    )
    .bind(boardId, hostname)
    .first();
}

export async function countListingsCreatedSince(db, boardId, sinceIso) {
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM listings WHERE board_id = ?1 AND created_at >= ?2`)
    .bind(boardId, sinceIso)
    .first();
  return Number(row?.n || 0);
}
