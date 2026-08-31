-- Record which Terms of Service the payer agreed to, and when.
-- Additive and safe to apply while the board is live: existing rows keep NULL,
-- which reads as "settled before consent was logged" rather than "did not agree".
-- Apply BEFORE deploying the code that writes these columns.
ALTER TABLE bids ADD COLUMN terms_version TEXT;
ALTER TABLE bids ADD COLUMN agreed_at TEXT;
