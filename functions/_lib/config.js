export const CATEGORIES = Object.freeze([
  "Agents",
  "Marketing",
  "Developer",
  "Business",
  "Agencies",
  "Ecommerce",
  "Productivity",
  "Design",
  "SEO",
  "Other",
]);

export function isProduction(env) {
  return env.RANKOFF_MODE === "production";
}

export function paymentsEnabled(env) {
  return isProduction(env) && env.PAYMENTS_ENABLED === "true";
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
