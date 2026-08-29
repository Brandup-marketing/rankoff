-- OPTIONAL: switch the board to Malaysian Ringgit for the MY launch.
-- Apply ONLY at MYR go-live, together with setting the Cloudflare env var
-- DEFAULT_CURRENCY=MYR on the Pages project. Minimum increment RM1.
-- Do not apply while USD bids exist on the board (one currency per board).
UPDATE boards
SET currency = 'MYR',
    name = 'Rankoff Malaysia',
    min_increment_minor = 100,
    updated_at = '2026-08-29T00:00:00.000Z'
WHERE id = 'board_global';
