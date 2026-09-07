-- Additive schema only. Does not change any board or original payment.
-- Apply this file explicitly; do NOT replay the migrations directory (0002).
CREATE TABLE IF NOT EXISTS board_currency_rates (
  board_id TEXT NOT NULL REFERENCES boards(id),
  source_currency TEXT NOT NULL CHECK (length(source_currency) = 3),
  target_currency TEXT NOT NULL CHECK (length(target_currency) = 3),
  numerator INTEGER NOT NULL CHECK (numerator > 0 AND numerator <= 100000000),
  denominator INTEGER NOT NULL CHECK (denominator > 0 AND denominator <= 100000000),
  source_url TEXT NOT NULL,
  rate_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  CHECK (source_currency <> target_currency),
  PRIMARY KEY (board_id, source_currency, target_currency)
);

-- Rates are fixed at the cutover, not floating FX. Future source-currency
-- webhooks (including old checkouts) use the same rate; reversals naturally
-- remove the original payment from every ranking and total.
CREATE TRIGGER IF NOT EXISTS board_currency_rates_no_update
BEFORE UPDATE ON board_currency_rates BEGIN
  SELECT RAISE(ABORT, 'Ranking conversion rates are immutable');
END;
CREATE TRIGGER IF NOT EXISTS board_currency_rates_no_delete
BEFORE DELETE ON board_currency_rates BEGIN
  SELECT RAISE(ABORT, 'Ranking conversion rates are immutable');
END;

CREATE VIEW IF NOT EXISTS ranking_payments AS
SELECT b.*,
       boards.currency AS ranking_currency,
       CASE WHEN b.currency = boards.currency THEN b.amount_minor
            WHEN r.numerator IS NOT NULL
            THEN CAST(ROUND(b.amount_minor * 1.0 * r.numerator / r.denominator) AS INTEGER)
            ELSE NULL END AS ranking_amount_minor
FROM bids b
JOIN boards ON boards.id = b.board_id
LEFT JOIN board_currency_rates r
  ON r.board_id = b.board_id AND r.source_currency = b.currency
 AND r.target_currency = boards.currency;
