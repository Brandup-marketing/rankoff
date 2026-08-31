import { ApiError, CATEGORIES, VISIBLE_CATEGORIES, marketCategory } from "./config.js";
import { accountFrom, listingIdentity } from "./platform.js";
import { isKnownTld } from "./tlds.js";

const BLOCKED_HOST_SUFFIXES = [
  ".internal",
  ".local",
  ".localhost",
  ".test",
  ".example",
  ".invalid",
];

export function requireString(value, field, { min = 1, max = 256 } = {}) {
  if (typeof value !== "string") {
    throw new ApiError(422, "invalid_field", `${field} must be text.`, { field });
  }
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    throw new ApiError(422, "invalid_field", `${field} has an invalid length.`, {
      field,
      min,
      max,
    });
  }
  return normalized;
}

export function optionalString(value, field, { max = 512 } = {}) {
  if (value === undefined || value === null || value === "") return "";
  return requireString(value, field, { min: 0, max });
}

export function normalizeCategory(value) {
  const category = requireString(value, "category", { max: 32 });
  const matched = CATEGORIES.find((item) => item.toLowerCase() === category.toLowerCase());
  if (!matched) {
    throw new ApiError(422, "invalid_category", "Choose a supported category.", {
      allowed: VISIBLE_CATEGORIES,
    });
  }
  return marketCategory(matched);
}

export function normalizeDestinationUrl(value) {
  const input = requireString(value, "url", { max: 2048 });
  let url;
  try {
    url = new URL(input);
  } catch {
    throw new ApiError(422, "invalid_url", "Enter a valid HTTPS website URL.");
  }

  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    throw new ApiError(
      422,
      "unsafe_url",
      "The listing URL must use HTTPS without credentials or a custom port.",
    );
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (isIpAddress(hostname) || isBlockedHostname(hostname)) {
    throw new ApiError(422, "unsafe_url", "Private, test, and local destinations are not allowed.");
  }

  url.hash = "";
  const account = accountFrom(url);
  // "mumeiyan.arkadia" is an Instagram handle, not a domain — without this it
  // would quietly become a listing pointing at a website that does not exist.
  if (!account && !isKnownTld(hostname)) {
    throw new ApiError(
      422,
      "unknown_tld",
      "That is not a website address. For an Instagram, Facebook or TikTok account, paste the full profile link, such as instagram.com/yourname.",
    );
  }
  if (account && !account.handle) {
    throw new ApiError(
      422,
      "profile_required",
      `Use the ${account.label} profile address, such as ${hostname}/yourname — not a post, reel, story or group.`,
    );
  }

  return {
    url: url.toString(),
    hostname,
    identity: listingIdentity(hostname, account),
    handle: account?.handle || "",
    platform: account?.key || "",
    platformLabel: account?.label || "",
    // A platform favicon is the platform's own logo, identical on every listing.
    faviconUrl: account ? "" : `${url.origin}/favicon.ico`,
  };
}

export function parsePositiveMinorUnits(value, field, max) {
  if (!Number.isSafeInteger(value) || value < 1 || value > max) {
    throw new ApiError(422, "invalid_amount", `${field} must be a valid integer minor-unit amount.`, {
      field,
      max,
    });
  }
  return value;
}

export function normalizeCurrency(value) {
  const currency = requireString(value, "currency", { min: 3, max: 3 }).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new ApiError(422, "invalid_currency", "Currency must be a three-letter ISO code.");
  }
  return currency;
}

export function normalizePeriod(value) {
  return value === "today" ? "today" : "all";
}

export function normalizeLimit(value, fallback = 50, max = 100) {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
    throw new ApiError(422, "invalid_limit", `limit must be between 1 and ${max}.`);
  }
  return parsed;
}

export function normalizePage(value, fallback = 1, max = 10_000) {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
    throw new ApiError(422, "invalid_page", `page must be between 1 and ${max}.`);
  }
  return parsed;
}

function isBlockedHostname(hostname) {
  if (hostname === "localhost") return true;
  return BLOCKED_HOST_SUFFIXES.some(
    (suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix),
  );
}

function isIpAddress(hostname) {
  if (hostname.startsWith("[") || hostname.includes(":")) return true;
  const parts = hostname.split(".");
  if (parts.length !== 4 || !parts.every((part) => /^\d{1,3}$/.test(part))) return false;
  return parts.every((part) => Number(part) >= 0 && Number(part) <= 255);
}
