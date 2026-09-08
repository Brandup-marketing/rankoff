-- Additive first-party campaign attribution. Does not change payment or rank data.
CREATE TABLE IF NOT EXISTS acquisition_sessions (
  session_hash TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id),
  source TEXT NOT NULL,
  medium TEXT NOT NULL,
  campaign TEXT NOT NULL,
  content TEXT NOT NULL,
  started_at TEXT NOT NULL,
  reviewed_at TEXT
);
CREATE TABLE IF NOT EXISTS payment_attribution (
  bid_id TEXT PRIMARY KEY REFERENCES bids(id),
  session_hash TEXT NOT NULL REFERENCES acquisition_sessions(session_hash)
);
CREATE INDEX IF NOT EXISTS idx_acquisition_board_time ON acquisition_sessions(board_id, started_at);
CREATE INDEX IF NOT EXISTS idx_attribution_session ON payment_attribution(session_hash);
CREATE INDEX IF NOT EXISTS idx_clicks_session_time ON click_events(session_hash, occurred_at);
