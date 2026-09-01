export const MARKET_GROUPS = Object.freeze({
  AI: Object.freeze(["AI", "Agents", "AIMedia"]),
  Creators: Object.freeze(["Creators", "Attention", "People"]),
  Property: Object.freeze(["Property", "RealEstate", "Travel"]),
  Interior: Object.freeze(["Interior"]),
  Beauty: Object.freeze(["Beauty"]),
  Health: Object.freeze(["Health"]),
  Sports: Object.freeze(["Sports"]),
  Food: Object.freeze(["Food"]),
  Marketing: Object.freeze(["Marketing", "SEO", "Social", "Sales", "Agencies"]),
  Creative: Object.freeze(["Creative", "Design", "Writing", "Audio", "News"]),
  Professional: Object.freeze(["Professional", "Business", "Careers", "Productivity"]),
  Education: Object.freeze(["Education", "Training", "Academy"]),
  Finance: Object.freeze(["Finance", "Insurance", "Banking", "Crypto"]),
  Electronics: Object.freeze(["Electronics", "Repair"]),
  Retail: Object.freeze(["Retail", "Ecommerce"]),
  Construction: Object.freeze(["Construction", "Hardware"]),
  Home: Object.freeze(["Home"]),
  Automotive: Object.freeze(["Automotive", "Auto"]),
  Other: Object.freeze(["Other", "Developer", "Security", "Games", "Domains", "Discovery"]),
});

export const VISIBLE_CATEGORIES = Object.freeze(Object.keys(MARKET_GROUPS));

// The names a reader sees. Kept beside the groups so a market cannot be added
// to the board without one.
export const MARKET_LABELS = Object.freeze({
  AI: "AI Tools & Agents",
  Creators: "Creators & Talent",
  Property: "Property & Agents",
  Interior: "Interior & Renovation",
  Beauty: "Beauty & Wellness",
  Health: "Health & Clinics",
  Sports: "Sports & Fitness",
  Food: "Food & Beverage",
  Marketing: "Marketing & Advertising",
  Creative: "Creative & Production",
  Professional: "Professional Services",
  Education: "Education & Training",
  Finance: "Finance & Insurance",
  Electronics: "Electronics & Repair",
  Retail: "Retail & Ecommerce",
  Construction: "Hardware & Construction",
  Home: "Home Services",
  Automotive: "Automotive",
  Other: "Other",
});

export function marketLabel(value) {
  return MARKET_LABELS[marketCategory(value)] || MARKET_LABELS.Other;
}

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
