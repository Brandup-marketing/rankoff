-- Keep the buyer reachable. Dodo already sends email, name and phone on every
-- payment.succeeded, and the raw payload was being stored verbatim; this lifts
-- the four fields the business actually needs into columns and leaves the
-- billing address where it is, unread.
--
-- Additive and safe while the board is live: existing rows keep NULL, which
-- reads as "settled before contact was recorded" rather than "no contact".
-- Apply BEFORE deploying the code that writes these columns.
ALTER TABLE bids ADD COLUMN buyer_email TEXT;
ALTER TABLE bids ADD COLUMN buyer_name TEXT;
ALTER TABLE bids ADD COLUMN buyer_phone TEXT;
ALTER TABLE bids ADD COLUMN provider_customer_id TEXT;

-- Owner's call: keep the billing address Dodo already sends, plus the invoice
-- link and the card brand/last four so a dispute or a resend needs no login.
-- The full card number is never sent to us and is never stored.
ALTER TABLE bids ADD COLUMN buyer_country TEXT;
ALTER TABLE bids ADD COLUMN buyer_state TEXT;
ALTER TABLE bids ADD COLUMN buyer_city TEXT;
ALTER TABLE bids ADD COLUMN buyer_street TEXT;
ALTER TABLE bids ADD COLUMN buyer_zipcode TEXT;
ALTER TABLE bids ADD COLUMN invoice_url TEXT;
ALTER TABLE bids ADD COLUMN card_last_four TEXT;
ALTER TABLE bids ADD COLUMN card_network TEXT;
