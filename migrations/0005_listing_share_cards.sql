-- A rank card that WhatsApp, Facebook and X can show in a link preview.
--
-- The card is painted on a canvas in a browser; Workers have no canvas, so the
-- bytes are produced once by an authenticated admin and kept here. Its own
-- table so a large blob never sits in the row the board reads on every request.
--
-- Writes are admin-only. An open upload would let anyone choose the picture
-- that represents a paying merchant in every share of their page.
CREATE TABLE IF NOT EXISTS listing_share_cards (
  listing_id    TEXT PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
  content_type  TEXT NOT NULL,
  width         INTEGER NOT NULL,
  height        INTEGER NOT NULL,
  bytes         INTEGER NOT NULL,
  image         BLOB NOT NULL,
  source_rank   INTEGER,
  source_total  TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
