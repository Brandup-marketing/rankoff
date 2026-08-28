PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  currency TEXT NOT NULL CHECK (length(currency) = 3),
  min_increment_minor INTEGER NOT NULL CHECK (min_increment_minor > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
  checkout_enabled INTEGER NOT NULL DEFAULT 0 CHECK (checkout_enabled IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS listing_invitations (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  owner_reference_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id),
  owner_reference_hash TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  destination_url TEXT NOT NULL,
  hostname TEXT NOT NULL,
  favicon_url TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'suspended', 'removed')),
  moderation_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (board_id, destination_url)
);

CREATE TABLE IF NOT EXISTS bids (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id),
  listing_id TEXT NOT NULL REFERENCES listings(id),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL CHECK (length(currency) = 3),
  status TEXT NOT NULL
    CHECK (status IN (
      'pending_payment', 'checkout_created', 'payment_failed', 'settled', 'reversed', 'cancelled'
    )),
  idempotency_key TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  challenged_rank INTEGER,
  challenged_snapshot_id TEXT,
  provider TEXT NOT NULL DEFAULT 'dodo',
  provider_checkout_id TEXT,
  provider_payment_id TEXT UNIQUE,
  checkout_url TEXT,
  last_provider_event_id TEXT,
  settled_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (listing_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_timestamp TEXT,
  payload_json TEXT NOT NULL,
  received_at TEXT NOT NULL,
  processed_at TEXT,
  last_error TEXT,
  UNIQUE (provider, provider_event_id)
);

CREATE TABLE IF NOT EXISTS ranking_snapshots (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id),
  source_event_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ranking_snapshot_entries (
  snapshot_id TEXT NOT NULL REFERENCES ranking_snapshots(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL REFERENCES listings(id),
  bid_id TEXT NOT NULL REFERENCES bids(id),
  rank INTEGER NOT NULL CHECK (rank > 0),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  PRIMARY KEY (snapshot_id, listing_id),
  UNIQUE (snapshot_id, rank)
);

CREATE TABLE IF NOT EXISTS click_events (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id),
  listing_id TEXT NOT NULL REFERENCES listings(id),
  snapshot_id TEXT,
  displayed_rank INTEGER,
  session_hash TEXT,
  destination_host TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS page_events (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('board_viewed')),
  snapshot_id TEXT,
  session_hash TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  provider_event_id TEXT UNIQUE,
  request_id TEXT,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_listings_board_status_category
  ON listings(board_id, status, category);
CREATE INDEX IF NOT EXISTS idx_bids_board_status_amount
  ON bids(board_id, status, amount_minor DESC, settled_at, id);
CREATE INDEX IF NOT EXISTS idx_bids_listing_status_amount
  ON bids(listing_id, status, amount_minor DESC, settled_at, id);
CREATE INDEX IF NOT EXISTS idx_clicks_listing_time
  ON click_events(listing_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_page_events_board_time
  ON page_events(board_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_webhooks_processing
  ON webhook_events(processed_at, received_at);

INSERT OR IGNORE INTO boards (
  id, slug, name, currency, min_increment_minor, status, checkout_enabled, created_at, updated_at
) VALUES (
  'board_global', 'global', 'Rankoff Global', 'USD', 100, 'active', 0,
  '2026-08-28T00:00:00.000Z', '2026-08-28T00:00:00.000Z'
);
