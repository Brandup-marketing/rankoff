export const MARKET_GROUPS = Object.freeze({
  Agents: Object.freeze(["Agents", "AIMedia"]),
  Marketing: Object.freeze(["Marketing", "SEO", "Social", "Sales", "Attention", "People"]),
  Developer: Object.freeze(["Developer", "Security"]),
  Business: Object.freeze(["Business", "Agencies", "Careers"]),
  Crypto: Object.freeze(["Crypto"]),
  Ecommerce: Object.freeze(["Ecommerce", "Hardware"]),
  Design: Object.freeze(["Design", "Writing", "Audio", "News"]),
  Productivity: Object.freeze(["Productivity", "Education"]),
  Health: Object.freeze(["Health"]),
  Sports: Object.freeze(["Sports"]),
  Games: Object.freeze(["Games"]),
  Travel: Object.freeze(["Travel", "RealEstate"]),
  Domains: Object.freeze(["Domains", "Discovery"]),
  Other: Object.freeze(["Other"]),
});

export const VISIBLE_CATEGORIES = Object.freeze(Object.keys(MARKET_GROUPS));
export const CATEGORIES = Object.freeze([...new Set(Object.values(MARKET_GROUPS).flat())]);

// Matches the "Last updated" date printed on /legal. Bump both together, never one alone.
export const TERMS_VERSION = "2026-08-30";

export function marketCategory(value) {
  const category = String(value || "").toLowerCase();
  for (const [market, members] of Object.entries(MARKET_GROUPS)) {
    if (market.toLowerCase() === category || members.some((member) => member.toLowerCase() === category)) return market;
  }
  return "";
}

export function marketCategoryMembers(value) {
  if (String(value || "").toLowerCase() === "all") return CATEGORIES;
  const market = marketCategory(value);
  return market ? MARKET_GROUPS[market] : [];
}

export function isProduction(env) {
  return env.RANKOFF_MODE === "production";
}

export function paymentsEnabled(env) {
  return isProduction(env) && env.PAYMENTS_ENABLED === "true";
}

export function paymentConfigurationReady(env) {
  return Boolean(
    paymentsEnabled(env)
      && env.DODO_ENVIRONMENT === "live_mode"
      && env.DODO_PRODUCT_ID
      && env.DODO_PAYMENTS_API_KEY
      && env.DODO_PAYMENTS_WEBHOOK_KEY,
  );
}

export function requireDatabase(env) {
  if (!env.DB || typeof env.DB.prepare !== "function") {
    throw new ServiceUnavailableError(
      "database_unavailable",
      "The production database binding is not configured.",
    );
  }
  return env.DB;
}

export function defaultBoardSlug(env) {
  return String(env.BOARD_SLUG || "global").toLowerCase();
}

export function defaultCurrency(env) {
  return String(env.DEFAULT_CURRENCY || "USD").toUpperCase();
}

export function maxBidMinor(env) {
  const configured = Number(env.MAX_BID_MINOR);
  return Number.isSafeInteger(configured) && configured > 0 ? configured : 100_000_000;
}

export function sessionHashSalt(env) {
  if (!env.SESSION_HASH_SALT || String(env.SESSION_HASH_SALT).length < 32) {
    throw new ServiceUnavailableError(
      "session_security_unavailable",
      "Event collection is not configured.",
    );
  }
  return String(env.SESSION_HASH_SALT);
}

export class ServiceUnavailableError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ServiceUnavailableError";
    this.code = code;
    this.status = 503;
  }
}

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
