import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { adminPayment, loadSettledPayments } from "../../functions/_lib/repository.js";
import { onRequest as paymentsFallback, onRequestGet as getPayments } from "../../functions/api/v1/admin/payments.js";
import { stripPrivatePaths } from "../../functions/sitemap.xml.js";

const ADMIN_TOKEN = "owner-token-for-tests";
const BOARD = { id: "board_1", slug: "global", name: "Rankoff", currency: "MYR", min_increment_minor: 100, status: "open", checkout_enabled: 1 };

const SETTLED_ROW = {
  id: "bid_1",
  amount_minor: 500,
  currency: "MYR",
  settled_at: "2026-08-31T09:15:00.000Z",
  created_at: "2026-08-31T09:14:00.000Z",
  provider_payment_id: "pay_1",
  invoice_url: "https://live.dodopayments.com/invoices/payments/pay_1",
  card_network: "visa",
  card_last_four: "0566",
  buyer_name: "Owner Name",
  buyer_email: "owner@example.com",
  buyer_phone: "+60 12-345 6789",
  provider_customer_id: "cus_1",
  buyer_street: "5, Jalan Example",
  buyer_city: "Nusajaya",
  buyer_state: "Johor",
  buyer_zipcode: "79100",
  buyer_country: "MY",
  listing_id: "listing_1",
  title: "Example Listing",
  hostname: "example.com",
  category: "Marketing",
  listing_status: "approved",
};

function fakeDatabase({ rows = [SETTLED_ROW], summary = { settled_count: 1, total_minor: 500 } } = {}) {
  const statements = [];
  return {
    statements,
    prepare(sql) {
      return {
        bind(...bindings) {
          statements.push({ sql, bindings });
          return {
            all: async () => ({ results: rows }),
            first: async () => (sql.includes("FROM boards") ? BOARD : summary),
          };
        },
      };
    },
  };
}

function adminRequest(token, url = "https://rankoff.my/api/v1/admin/payments") {
  return new Request(url, { headers: token ? { authorization: `Bearer ${token}` } : {} });
}

const productionEnv = (db) => ({ RANKOFF_MODE: "production", ADMIN_API_TOKEN: ADMIN_TOKEN, BOARD_SLUG: "global", DB: db });

test("a settled row becomes the contact record the owner needs", () => {
  const payment = adminPayment(SETTLED_ROW);
  assert.equal(payment.buyer.email, "owner@example.com");
  assert.equal(payment.buyer.phone, "+60 12-345 6789");
  assert.equal(payment.buyer.address.city, "Nusajaya");
  assert.equal(payment.invoice_url, "https://live.dodopayments.com/invoices/payments/pay_1");
  assert.equal(payment.amount_minor, 500);
  assert.equal(payment.listing.hostname, "example.com");
});

test("contact that was never recorded reads as null, not as an empty string", () => {
  const payment = adminPayment({ ...SETTLED_ROW, buyer_email: "   ", buyer_phone: null, invoice_url: "", card_last_four: undefined });
  assert.equal(payment.buyer.email, null);
  assert.equal(payment.buyer.phone, null);
  assert.equal(payment.invoice_url, null);
  assert.equal(payment.card_last_four, null);
});

test("the owner query reads settled bids for one board, paginated", async () => {
  const db = fakeDatabase({ summary: { settled_count: 4, total_minor: 2000 } });
  const payload = await loadSettledPayments(db, BOARD, { limit: 2, page: 2 });
  const listQuery = db.statements.find((statement) => statement.sql.includes("FROM bids b"));
  assert.ok(listQuery.sql.includes("b.status = 'settled'"));
  assert.deepEqual(listQuery.bindings, ["board_1", 2, 2]);
  assert.deepEqual(payload.summary, { settled_count: 4, total_minor: 2000, currency: "MYR" });
  assert.deepEqual(payload.pagination, {
    page: 2,
    page_size: 2,
    total: 4,
    total_pages: 2,
    has_previous: true,
    has_next: false,
  });
  assert.equal(payload.payments[0].buyer.name, "Owner Name");
});

test("an empty board reports one page rather than dividing by nothing", async () => {
  const db = fakeDatabase({ rows: [], summary: { settled_count: 0, total_minor: 0 } });
  const payload = await loadSettledPayments(db, BOARD, { limit: 50, page: 1 });
  assert.deepEqual(payload.payments, []);
  assert.equal(payload.pagination.total_pages, 1);
  assert.equal(payload.pagination.has_next, false);
});

test("the owner view answers a valid admin token with settled payments and no caching", async () => {
  const db = fakeDatabase();
  const response = await getPayments({ request: adminRequest(ADMIN_TOKEN), env: productionEnv(db) });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(payload.payments.length, 1);
  assert.equal(payload.payments[0].buyer.email, "owner@example.com");
  assert.equal(payload.board.slug, "global");
});

test("buyer contact is never read without a valid admin credential", async () => {
  // The database refuses to answer at all: proof the refusal happens before any read.
  const sealed = { prepare() { throw new Error("the database must not be touched"); } };
  for (const token of ["", "wrong-token", `${ADMIN_TOKEN}x`]) {
    await assert.rejects(
      getPayments({ request: adminRequest(token), env: productionEnv(sealed) }),
      (error) => error.status === 401 && error.code === "unauthorized",
    );
  }
});

test("the owner view is closed when no admin token is configured and off the live board", async () => {
  await assert.rejects(
    getPayments({ request: adminRequest(ADMIN_TOKEN), env: { RANKOFF_MODE: "production" } }),
    (error) => error.status === 503 && error.code === "admin_auth_unavailable",
  );
  await assert.rejects(
    getPayments({ request: adminRequest(ADMIN_TOKEN), env: { RANKOFF_MODE: "demo", ADMIN_API_TOKEN: ADMIN_TOKEN } }),
    (error) => error.status === 503 && error.code === "production_only",
  );
});

test("the owner view rejects an out-of-range page instead of guessing", async () => {
  await assert.rejects(
    getPayments({
      request: adminRequest(ADMIN_TOKEN, "https://rankoff.my/api/v1/admin/payments?limit=500"),
      env: productionEnv(fakeDatabase()),
    }),
    (error) => error.status === 422 && error.code === "invalid_limit",
  );
});

test("the owner view is read-only", async () => {
  const response = await paymentsFallback();
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("Allow"), "GET");
});

test("the owner page is never offered to a crawler in the sitemap", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://rankoff.my/</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://rankoff.my/admin.html</loc>
    <priority>0.5</priority>
  </url>
</urlset>`;
  const filtered = stripPrivatePaths(xml);
  assert.ok(!filtered.includes("admin.html"));
  assert.ok(filtered.includes("https://rankoff.my/"));
  assert.ok(!readFileSync(new URL("../../sitemap.xml", import.meta.url), "utf8").includes("admin"));
});

test("the owner page ships, hides itself from search, and keeps the token out of storage", () => {
  const html = readFileSync(new URL("../../admin.html", import.meta.url), "utf8");
  const script = readFileSync(new URL("../../admin.js", import.meta.url), "utf8");
  const build = readFileSync(new URL("../../scripts/build-static.mjs", import.meta.url), "utf8");

  assert.match(html, /<meta name="robots" content="noindex, nofollow"/);
  for (const file of ["admin.html", "admin.js", "admin.css"]) assert.ok(build.includes(`'${file}'`), `${file} is missing from the build list`);
  // Version-agnostic: a cache bust is expected to change, but the reference
  // must exist and must carry one.
  assert.match(html, /\.\/admin\.js\?v=\d+/);
  assert.match(html, /\.\/admin\.css\?v=\d+/);

  // The token may only ever live in the `token` variable: no storage, no URL,
  // no cookie, and no logging of anything this page loads.
  assert.ok(!/localStorage\.setItem\([^)]*token/i.test(script));
  assert.ok(!/sessionStorage|document\.cookie|indexedDB/.test(script));
  assert.ok(!/console\.(log|info|warn|error|debug)/.test(script));
  assert.ok(!/searchParams\.set\([^)]*token|[?&]token=/i.test(script));
  assert.ok(script.includes("Authorization: `Bearer ${token}`"));
  assert.ok(script.includes("https://wa.me/${digits}"));

  execFileSync(process.execPath, ["--check", new URL("../../admin.js", import.meta.url).pathname], { stdio: "inherit" });
});
