import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

export function testDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  for (const name of ['0001_production_core', '0003_bid_terms_consent', '0004_buyer_contact', '0005_listing_share_cards', '0006_ranking_currency', '0007_acquisition']) {
    sqlite.exec(readFileSync(new URL(`../../migrations/${name}.sql`, import.meta.url), 'utf8'));
  }
  const prepare = (sql) => {
    const statement = sqlite.prepare(sql);
    const bind = (...values) => {
      const params = Object.fromEntries(values.map((v, i) => [String(i + 1), v]));
      return {
        all: async () => ({ results: statement.all(params) }),
        first: async () => statement.get(params) || null,
        run: async () => statement.run(params),
      };
    };
    return { bind, ...bind() };
  };
  return {
    sqlite, prepare,
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const result = [];
        for (const statement of statements) result.push(await statement.run());
        sqlite.exec('COMMIT');
        return result;
      } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
}

export function seedListing(db, id = 'example', category = 'Marketing') {
  db.sqlite.prepare(`INSERT INTO listings (id, board_id, owner_reference_hash, title, description, destination_url,
    hostname, favicon_url, category, status, created_at, updated_at)
    VALUES (?, 'board_global', 'test-only', ?, '', ?, ?, '', ?, 'approved', '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z')`)
    .run(id, `${id} fixture`, `https://${id}.example.com`, `${id}.example.com`, category);
}

export function seedPayment(db, { id, listing = 'example', amount = 500, currency = 'MYR', status = 'settled', at = '2026-09-01T00:00:00.000Z' }) {
  db.sqlite.prepare(`INSERT INTO bids (id, board_id, listing_id, amount_minor, currency, status, idempotency_key,
    request_fingerprint, settled_at, created_at, updated_at) VALUES (?, 'board_global', ?, ?, ?, ?, ?, 'fixture', ?, ?, ?)`)
    .run(id, listing, amount, currency, status, id, status === 'settled' ? at : null, at, at);
}

export function seedConversion(db) {
  // Synthetic 4 MYR = 1 USD for deterministic tests; never a live rate.
  db.sqlite.exec(`INSERT INTO board_currency_rates VALUES ('board_global', 'MYR', 'USD', 1, 4,
    'https://example.com/test-rate', '2026-09-01', '2026-09-08T00:00:00.000Z');
    UPDATE boards SET checkout_enabled = 1 WHERE id = 'board_global';`);
}
