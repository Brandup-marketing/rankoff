import { marketCategoryMembers } from "./config.js";

const DEMO_LISTINGS = Object.freeze([
  {
    id: "model-harbor",
    title: "Model Harbor",
    description: "A release desk for production AI models, approvals, and customer notices.",
    url: "https://modelharbor.example/",
    hostname: "modelharbor.example",
    favicon_url: "",
    category: "Agents",
    amount_minor: 248_000,
    clicks: 2840,
    settled_at: "2026-08-27T10:00:00.000Z",
  },
  {
    id: "trackline",
    title: "Trackline",
    description: "Campaign reporting for teams that need a clean answer to what moved.",
    url: "https://trackline.example/",
    hostname: "trackline.example",
    favicon_url: "",
    category: "Marketing",
    amount_minor: 216_000,
    clicks: 1910,
    settled_at: "2026-08-27T11:00:00.000Z",
  },
  {
    id: "patchnote",
    title: "Patchnote",
    description: "Release notes that turn product changes into useful customer updates.",
    url: "https://patchnote.example/",
    hostname: "patchnote.example",
    favicon_url: "",
    category: "Developer",
    amount_minor: 193_000,
    clicks: 2180,
    settled_at: "2026-08-27T12:00:00.000Z",
  },
  {
    id: "canvas-relay",
    title: "Canvas Relay",
    description: "Creative hand-offs, feedback, and approved files in one focused space.",
    url: "https://canvasrelay.example/",
    hostname: "canvasrelay.example",
    favicon_url: "",
    category: "Design",
    amount_minor: 118_000,
    clicks: 1490,
    settled_at: "2026-08-26T10:00:00.000Z",
  },
  {
    id: "switchboard",
    title: "Switchboard",
    description: "A routing layer for the AI tools already inside an operator stack.",
    url: "https://switchboard.example/",
    hostname: "switchboard.example",
    favicon_url: "",
    category: "Agents",
    amount_minor: 94_000,
    clicks: 1210,
    settled_at: "2026-08-27T13:00:00.000Z",
  },
]);

export function demoBoard({ category = "all", period = "all", limit = 50, page = 1 } = {}) {
  const members = marketCategoryMembers(category);
  const matchingRows = DEMO_LISTINGS.filter(
    (listing) => String(category).toLowerCase() === "all" || members.includes(listing.category),
  );
  const offset = (page - 1) * limit;
  const rows = matchingRows.slice(offset, offset + limit);
  const rankings = rows.map((listing, index) => ({
    rank: offset + index + 1,
    listing: {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      url: listing.url,
      hostname: listing.hostname,
      favicon_url: listing.favicon_url,
      category: listing.category,
    },
    bid: {
      id: `demo-${period}-${listing.id}`,
      amount_minor: period === "today" ? Math.max(100, Math.floor(listing.amount_minor / 4)) : listing.amount_minor,
      currency: "USD",
      settled_at: listing.settled_at,
    },
    clicks: period === "today" ? Math.floor(listing.clicks / 5) : listing.clicks,
  }));
  const topAmount = matchingRows[0]
    ? (period === "today" ? Math.max(100, Math.floor(matchingRows[0].amount_minor / 4)) : matchingRows[0].amount_minor)
    : 0;

  return {
    mode: "demo",
    board: {
      id: "demo-global",
      slug: "global",
      name: "Rankoff Global",
      currency: "USD",
      min_increment_minor: 100,
    },
    snapshot_id: `demo-${period}`,
    generated_at: new Date().toISOString(),
    rankings,
    pagination: {
      page,
      page_size: limit,
      total: matchingRows.length,
      total_pages: Math.max(1, Math.ceil(matchingRows.length / limit)),
      has_previous: page > 1,
      has_next: offset + rows.length < matchingRows.length,
    },
    next_bid_minor: topAmount + 100,
  };
}

export function demoStats() {
  return {
    mode: "demo",
    board_id: "demo-global",
    online_now: null,
    total_visitors: null,
    total_clicks: DEMO_LISTINGS.reduce((sum, listing) => sum + listing.clicks, 0),
    settled_revenue_minor: DEMO_LISTINGS.reduce(
      (sum, listing) => sum + listing.amount_minor,
      0,
    ),
    currency: "USD",
    updated_at: new Date().toISOString(),
  };
}
