// A payment preview must see the complete scope, including returning listings
// outside page one. Never promise a rank from a truncated leaderboard.
export async function readCompleteBoard(endpoint, fetcher = fetch) {
  const url = new URL(endpoint);
  url.searchParams.set("limit", "100");
  url.searchParams.delete("country");
  url.searchParams.set("period", "all");
  const rankings = [];
  let initial = null;
  for (let page = 1; page <= 20; page += 1) {
    url.searchParams.set("page", String(page));
    const response = await fetcher(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!response.ok) throw new Error("preview_unavailable");
    const payload = await response.json();
    if (payload.mode !== "production" || !Array.isArray(payload.rankings)) throw new Error("preview_unavailable");
    if (!initial) initial = payload;
    if (payload.board?.currency !== initial.board?.currency || payload.pagination?.total !== initial.pagination?.total) throw new Error("preview_changed");
    rankings.push(...payload.rankings);
    if (!payload.pagination?.has_next) {
      if (payload.pagination && rankings.length !== Number(payload.pagination.total)) throw new Error("preview_incomplete");
      if (new Set(rankings.map((entry) => entry.listing.id)).size !== rankings.length) throw new Error("preview_changed");
      return { ...initial, rankings };
    }
  }
  throw new Error("preview_too_large");
}
