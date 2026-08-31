import { ApiError, defaultBoardSlug, isProduction, requireDatabase } from "../../_lib/config.js";
import { json, methodNotAllowed, readJson } from "../../_lib/http.js";
import { countListingsCreatedSince, createListing, findListingByHostname, loadBoard } from "../../_lib/repository.js";
import { sha256Hex } from "../../_lib/security.js";
import { normalizeCategory, normalizeDestinationUrl, optionalString } from "../../_lib/validation.js";

// Self-serve screening: obvious gambling/adult terms are refused at submission.
// The Terms reserve the right to remove anything after publication, so this
// list only needs to catch what must never appear on the board even briefly.
const BLOCKED_TERMS = [
  "casino", "gambling", "judi", "togel", "poker", "betting", "bet365", "slot888",
  "jackpot", "lottery", "lucky draw", "porn", "xxx", "sex cam", "escort",
  "onlyfans", "hentai", "viagra", "cialis",
];

// A flood guard, not a business rule: more unique new websites per hour than
// this means someone is scripting submissions, not buying advertising.
const MAX_NEW_LISTINGS_PER_HOUR = 60;

function screenText(...parts) {
  const haystack = parts.filter(Boolean).join(" ").toLowerCase();
  for (const term of BLOCKED_TERMS) {
    if (haystack.includes(term)) {
      throw new ApiError(422, "listing_refused", "This website cannot be listed on the board.");
    }
  }
}

export async function onRequestPost(context) {
  if (!isProduction(context.env)) {
    throw new ApiError(503, "production_only", "Listing submission is disabled on the preview board.");
  }
  const input = await readJson(context.request);
  const db = requireDatabase(context.env);
  const board = await loadBoard(db, defaultBoardSlug(context.env));
  const destination = normalizeDestinationUrl(input.url);
  const title = optionalString(input.title, "title", { max: 96 }) || destination.hostname;
  const description = optionalString(input.description, "description", { max: 240 });
  screenText(destination.hostname, title, description);

  // One website, one listing: a repeat submission returns the existing entry
  // so every payment lands on the same cumulative total (an add-on, not a
  // duplicate). Only a moderated-away site is refused here.
  const existing = await findListingByHostname(db, board.id, destination.hostname);
  if (existing) {
    if (existing.status !== "approved") {
      throw new ApiError(403, "listing_unavailable", "This website cannot be listed on the board.");
    }
    return json({
      listing: { id: existing.id, status: existing.status, title: existing.title },
      existing: true,
    });
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recentCount = await countListingsCreatedSince(db, board.id, oneHourAgo);
  if (recentCount >= MAX_NEW_LISTINGS_PER_HOUR) {
    throw new ApiError(429, "submission_limit", "Too many new listings right now. Try again shortly.");
  }

  const createdAt = new Date().toISOString();
  const listing = {
    id: crypto.randomUUID(),
    boardId: board.id,
    ownerReferenceHash: await sha256Hex(
      optionalString(input.owner_reference, "owner_reference", { max: 256 }) || destination.hostname,
    ),
    title,
    description,
    destinationUrl: destination.url,
    hostname: destination.hostname,
    faviconUrl: destination.faviconUrl,
    category: normalizeCategory(input.category),
    status: "approved",
    createdAt,
  };
  await createListing(db, listing);
  return json(
    {
      listing: { id: listing.id, status: listing.status, title: listing.title, url: listing.destinationUrl, category: listing.category },
      existing: false,
    },
    { status: 201 },
  );
}

export function onRequest() {
  return methodNotAllowed(["POST"]);
}
