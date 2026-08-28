(() => {
  "use strict";

  const STORE_KEY = "rankoff-mvp-demo-v3";
  const MAX_BID = 1_000_000;
  const DEFAULT_CATEGORY = "all";
  const BOARD_API_ENDPOINT = "./api/v1/board";
  const categories = [
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
  ];

  const currency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  const compact = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  });

  const seedListings = [
    {
      id: "model-harbor",
      name: "Model Harbor",
      mark: "MH",
      url: "https://modelharbor.example",
      description: "A release desk for production AI models, approvals, and customer notices.",
      category: "Agents",
      age: "18h",
      clicks: 2840,
      todayClicks: 412,
      verified: true,
      bids: { all: 2480, today: 620 },
    },
    {
      id: "trackline",
      name: "Trackline",
      mark: "TL",
      url: "https://trackline.example",
      description: "Campaign reporting for teams that need a clean answer to what moved.",
      category: "Marketing",
      age: "7h",
      clicks: 1910,
      todayClicks: 524,
      verified: true,
      bids: { all: 2160, today: 810 },
    },
    {
      id: "patchnote",
      name: "Patchnote",
      mark: "PN",
      url: "https://patchnote.example",
      description: "Release notes that turn product changes into useful customer updates.",
      category: "Developer",
      age: "1d",
      clicks: 2180,
      todayClicks: 381,
      verified: true,
      bids: { all: 1930, today: 554 },
    },
    {
      id: "canvas-relay",
      name: "Canvas Relay",
      mark: "CR",
      url: "https://canvasrelay.example",
      description: "Creative hand-offs, feedback, and approved files in one focused space.",
      category: "Design",
      age: "2d",
      clicks: 1490,
      todayClicks: 228,
      verified: false,
      bids: { all: 1180, today: 296 },
    },
    {
      id: "switchboard",
      name: "Switchboard",
      mark: "SB",
      url: "https://switchboard.example",
      description: "A routing layer for the AI tools already inside an operator stack.",
      category: "Agents",
      age: "4h",
      clicks: 1210,
      todayClicks: 467,
      verified: true,
      bids: { all: 940, today: 735 },
    },
    {
      id: "focus-coda",
      name: "Focus Coda",
      mark: "FC",
      url: "https://focuscoda.example",
      description: "A launch-day workspace for teams shipping more often than once a quarter.",
      category: "Productivity",
      age: "12h",
      clicks: 1080,
      todayClicks: 214,
      verified: false,
      bids: { all: 860, today: 241 },
    },
    {
      id: "sandbox-kit",
      name: "Sandbox Kit",
      mark: "SK",
      url: "https://sandboxkit.example",
      description: "Disposable preview environments for showing work before it goes live.",
      category: "Developer",
      age: "3d",
      clicks: 920,
      todayClicks: 164,
      verified: true,
      bids: { all: 650, today: 202 },
    },
    {
      id: "palette-runner",
      name: "Palette Runner",
      mark: "PR",
      url: "https://paletterunner.example",
      description: "Brand-safe creative variants for small teams that need fast campaigns.",
      category: "Design",
      age: "9h",
      clicks: 730,
      todayClicks: 132,
      verified: false,
      bids: { all: 520, today: 188 },
    },
  ];

  const seedActivity = [
    { id: "a1", time: "2m ago", text: "Switchboard challenged the Today board for $735." },
    { id: "a2", time: "11m ago", text: "Trackline became the Marketing category leader." },
    { id: "a3", time: "24m ago", text: "Patchnote recorded 381 clicks today." },
    { id: "a4", time: "43m ago", text: "Model Harbor defended the all-time lead at $2,480." },
  ];

  const elements = {
    root: document.documentElement,
    boardList: document.querySelector("[data-board-list]"),
    topThree: document.querySelector("[data-top-three]"),
    boardSummary: document.querySelector("[data-board-summary]"),
    categoryRail: document.querySelector("[data-category-rail]"),
    categorySelect: document.querySelector("[data-category-select]"),
    windowButtons: Array.from(document.querySelectorAll("[data-board-window]")),
    themeToggle: document.querySelector("[data-theme-toggle]"),
    inlineChallenge: document.querySelector("[data-inline-challenge]"),
    inlineBid: document.querySelector("[data-inline-bid]"),
    inlineUrl: document.querySelector("[data-inline-url]"),
    heroPrice: document.querySelector("[data-hero-next-price]"),
    heroContext: document.querySelector("[data-hero-context]"),
    boardState: document.querySelector("[data-board-state]"),
    demoNote: document.querySelector("[data-demo-note]"),
    inlineSubmit: document.querySelector("[data-inline-submit]"),
    currentLeader: document.querySelector("[data-current-leader]"),
    leaderBid: document.querySelector("[data-leader-bid]"),
    leaderClicks: document.querySelector("[data-leader-clicks]"),
    leaderCategory: document.querySelector("[data-leader-category]"),
    todayCard: document.querySelector("[data-today-card]"),
    activityList: document.querySelector("[data-activity-list]"),
    statVisitors: document.querySelector("[data-stat-visitors]"),
    statRevenue: document.querySelector("[data-stat-revenue]"),
    resultClicks: document.querySelector("[data-result-clicks]"),
    resultBids: document.querySelector("[data-result-bids]"),
    dialog: document.querySelector("[data-bid-dialog]"),
    bidForm: document.querySelector("[data-bid-form]"),
    bidAmount: document.querySelector("#bid-amount"),
    bidTarget: document.querySelector("[data-bid-target]"),
    bidHint: document.querySelector("[data-bid-hint]"),
    orderPosition: document.querySelector("[data-order-position]"),
    toast: document.querySelector("[data-toast]"),
  };

  if (!elements.boardList) return;

  let boardSource = "local";
  let remoteRequestId = 0;
  let state = loadState();
  let activeBid = null;
  let pendingChallenge = null;
  let lastTrigger = null;
  let toastTimer = null;
  let changedListingId = null;
  let remoteNextBid = null;
  let remoteSnapshotId = null;
  let remoteCurrency = "USD";
  let boardViewSent = false;

  function cloneListing(listing) {
    return { ...listing, bids: { ...listing.bids } };
  }

  function toBid(value, fallback) {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > MAX_BID) return fallback;
    return parsed;
  }

  function loadState() {
    const fallback = {
      activeWindow: "all",
      category: DEFAULT_CATEGORY,
      theme: "dark",
      listings: seedListings.map(cloneListing),
      activity: [...seedActivity],
    };

    const url = new URL(window.location.href);
    if (url.searchParams.has("reset")) {
      try {
        window.localStorage.removeItem(STORE_KEY);
      } catch {
        /* Demo state falls back to the seed board when storage is unavailable. */
      }
      url.searchParams.delete("reset");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      return fallback;
    }

    try {
      const saved = JSON.parse(window.localStorage.getItem(STORE_KEY));
      if (!saved || !Array.isArray(saved.listings)) return fallback;
      const savedById = new Map(saved.listings.map((listing) => [listing?.id, listing]));
      const restored = seedListings.map((seed) => {
        const savedListing = savedById.get(seed.id);
        if (!savedListing) return cloneListing(seed);
        return {
          ...cloneListing(seed),
          bids: {
            all: toBid(savedListing.bids?.all, seed.bids.all),
            today: toBid(savedListing.bids?.today, seed.bids.today),
          },
        };
      });

      for (const listing of saved.listings) {
        if (!listing?.isDemo || restored.some((item) => item.id === listing.id)) continue;
        restored.push({
          id: String(listing.id),
          name: String(listing.name || "Your demo listing").slice(0, 64),
          mark: String(listing.mark || "YOU").slice(0, 4).toUpperCase(),
          url: String(listing.url || "https://rankoff.my/demo"),
          iconUrl: typeof listing.iconUrl === "string" ? listing.iconUrl : "",
          description: "A local-only challenger created in this browser.",
          category: categories.includes(listing.category) ? listing.category : categories[0],
          age: "now",
          clicks: 0,
          todayClicks: 0,
          verified: false,
          bids: {
            all: toBid(listing.bids?.all, 1),
            today: toBid(listing.bids?.today, 1),
          },
          isDemo: true,
        });
      }

      return {
        activeWindow: saved.activeWindow === "today" ? "today" : "all",
        category: saved.category === DEFAULT_CATEGORY || categories.includes(saved.category) ? saved.category : DEFAULT_CATEGORY,
        theme: "dark",
        listings: restored,
        activity: Array.isArray(saved.activity) ? saved.activity.slice(0, 6) : [...seedActivity],
      };
    } catch {
      return fallback;
    }
  }

  function saveState() {
    if (boardSource !== "local") return;
    try {
      window.localStorage.setItem(
        STORE_KEY,
        JSON.stringify({
          activeWindow: state.activeWindow,
          category: state.category,
          theme: state.theme,
          listings: state.listings,
          activity: state.activity.slice(0, 6),
        }),
      );
    } catch {
      showToast("This browser could not save demo changes for later.", "error");
    }
  }

  function dollarsFromMinor(value, fallback = 1) {
    const minor = Number(value);
    if (!Number.isSafeInteger(minor) || minor < 0) return fallback;
    return Math.max(1, Math.ceil(minor / 100));
  }

  function normalizedClickCount(value) {
    if (Number.isFinite(Number(value))) return Math.max(0, Math.round(Number(value)));
    if (value && typeof value === "object") {
      const candidate = value.count ?? value.total ?? value.verified ?? 0;
      return Number.isFinite(Number(candidate)) ? Math.max(0, Math.round(Number(candidate))) : 0;
    }
    return 0;
  }

  function normalizeApiRanking(entry, index, period) {
    const listing = entry?.listing || {};
    const url = String(listing.url || "https://rankoff.my");
    const previous = state.listings.find((item) => item.id === String(listing.id || ""));
    const amount = dollarsFromMinor(entry?.bid?.amount_minor, previous ? getBid(previous, period) : 1);
    const clicks = normalizedClickCount(entry?.clicks);
    const bids = previous ? { ...previous.bids } : { all: amount, today: amount };
    bids[period] = amount;

    return {
      id: String(listing.id || `remote-${index + 1}`),
      serverRank: Number.isFinite(Number(entry?.rank)) ? Number(entry.rank) : index + 1,
      name: String(listing.title || listing.hostname || `Listing ${index + 1}`).slice(0, 96),
      mark: initialsFromUrl(url),
      url,
      iconUrl: typeof listing.favicon_url === "string" ? listing.favicon_url : "",
      description: String(listing.description || "Sponsored listing on Rankoff.").slice(0, 240),
      category: String(listing.category || "Other"),
      age: entry?.bid?.settled_at ? "settled" : "live",
      clicks: period === "all" ? clicks : previous?.clicks || clicks,
      todayClicks: period === "today" ? clicks : previous?.todayClicks || 0,
      verified: true,
      bids,
    };
  }

  function updateBoardSourceLabels() {
    const production = boardSource === "production";
    if (elements.boardState) {
      elements.boardState.lastChild.textContent = production ? " Live board" : boardSource === "local" ? " Preview board" : " Connected preview";
    }
    if (elements.demoNote) {
      elements.demoNote.textContent = production
        ? "Live ranking data · payment is only confirmed after hosted checkout"
        : "Preview only · no payment is collected";
    }
  }

  async function refreshBoardFromApi() {
    if (!/^https?:$/.test(window.location.protocol)) return;
    const requestId = ++remoteRequestId;
    const endpoint = new URL(BOARD_API_ENDPOINT, window.location.href);
    endpoint.searchParams.set("board", "global");
    endpoint.searchParams.set("category", state.category);
    endpoint.searchParams.set("period", state.activeWindow);
    endpoint.searchParams.set("limit", "50");

    try {
      const response = await fetch(endpoint, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      if (requestId !== remoteRequestId || !Array.isArray(payload?.rankings)) return;
      const period = state.activeWindow;
      state.listings = payload.rankings.map((entry, index) => normalizeApiRanking(entry, index, period));
      boardSource = payload.mode === "production" ? "production" : "api";
      remoteNextBid = dollarsFromMinor(payload.next_bid_minor, null);
      remoteSnapshotId = payload.snapshot_id || null;
      remoteCurrency = String(payload.board?.currency || "USD").toUpperCase();
      render();
      if (boardSource === "production" && !boardViewSent) {
        boardViewSent = true;
        void recordBoardView();
      }
    } catch {
      /* Static preview and offline use intentionally fall back to the local board. */
    }
  }

  async function recordBoardView() {
    let sessionId;
    try {
      sessionId = window.sessionStorage.getItem("rankoff-session-id") || crypto.randomUUID();
      window.sessionStorage.setItem("rankoff-session-id", sessionId);
    } catch {
      sessionId = crypto.randomUUID();
    }
    await fetch("./api/v1/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "board_viewed", board_id: "global", snapshot_id: remoteSnapshotId, session_id: sessionId }),
    }).catch(() => {});
  }

  function money(value) {
    return currency.format(value);
  }

  function getBid(listing, windowName = state.activeWindow) {
    return listing.bids[windowName];
  }

  function getClicks(listing, windowName = state.activeWindow) {
    return windowName === "today" ? listing.todayClicks : listing.clicks;
  }

  function windowLabel() {
    return state.activeWindow === "today" ? "Today" : "All-time";
  }

  function visibleListings() {
    if (state.category === DEFAULT_CATEGORY) return [...state.listings];
    return state.listings.filter((listing) => listing.category === state.category);
  }

  function rankedListings(listings = visibleListings(), windowName = state.activeWindow) {
    return [...listings].sort((first, second) => {
      const difference = second.bids[windowName] - first.bids[windowName];
      const serverOrder = (first.serverRank || Number.MAX_SAFE_INTEGER) - (second.serverRank || Number.MAX_SAFE_INTEGER);
      return difference || serverOrder || first.name.localeCompare(second.name);
    });
  }

  function allRanked(windowName = state.activeWindow) {
    return rankedListings(state.listings, windowName);
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function initialsFromUrl(url) {
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      return host
        .split(".")[0]
        .split(/[-_]/)
        .map((part) => part[0])
        .join("")
        .slice(0, 3)
        .toUpperCase() || "YOU";
    } catch {
      return "YOU";
    }
  }

  function nameFromUrl(url) {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host.split(".")[0].replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function parseProductUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) throw new TypeError("A product URL is required.");
    const parsed = raw.startsWith("@")
      ? new URL(`https://x.com/${encodeURIComponent(raw.slice(1))}`)
      : new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!/^https?:$/.test(parsed.protocol) || !parsed.hostname) throw new TypeError("Only web URLs are supported.");
    return parsed;
  }

  function faviconCandidates(listing) {
    try {
      const url = new URL(listing.url);
      if (url.hostname.endsWith(".example") && !listing.iconUrl) return [];
      const direct = `${url.origin}/favicon.ico`;
      const fallback = `https://icons.duckduckgo.com/ip3/${encodeURIComponent(url.hostname)}.ico`;
      return [...new Set([listing.iconUrl, direct, fallback].filter(Boolean))];
    } catch {
      return listing.iconUrl ? [listing.iconUrl] : [];
    }
  }

  function listingLink(listing) {
    const link = createElement("a", "product-name", listing.name);
    if (boardSource === "production") {
      const tracked = new URL(`./go/${encodeURIComponent(listing.id)}`, window.location.href);
      if (remoteSnapshotId) tracked.searchParams.set("snapshot", remoteSnapshotId);
      if (listing.serverRank) tracked.searchParams.set("rank", String(listing.serverRank));
      link.href = tracked.toString();
    } else {
      link.href = listing.url;
    }
    link.target = "_blank";
    link.rel = "sponsored nofollow noopener noreferrer";
    link.setAttribute("aria-label", `Visit ${listing.name} in a new tab`);
    return link;
  }

  function productIdentity(listing, descriptionTag = "p") {
    const wrapper = createElement("div", "product-cell");
    const mark = createElement("span", "product-mark");
    mark.setAttribute("aria-hidden", "true");
    const initials = createElement("span", "product-initials", listing.mark);
    mark.append(initials);
    const iconSources = faviconCandidates(listing);
    if (iconSources.length) {
      const icon = document.createElement("img");
      icon.alt = "";
      icon.decoding = "async";
      icon.referrerPolicy = "no-referrer";
      let sourceIndex = 0;
      const tryNextSource = () => {
        if (sourceIndex >= iconSources.length) {
          icon.remove();
          return;
        }
        icon.src = iconSources[sourceIndex];
        sourceIndex += 1;
      };
      icon.addEventListener("load", () => mark.classList.add("has-icon"), { once: true });
      icon.addEventListener("error", tryNextSource);
      tryNextSource();
      mark.append(icon);
    }

    const copy = createElement("div", "product-copy");
    const meta = createElement("div", "product-meta");
    meta.append(
      createElement("span", "sponsored-chip", "Sponsored"),
      createElement("span", "", listing.category),
      createElement("span", "", `${listing.age} live`),
    );
    meta.append(createElement("span", listing.verified ? "verified-chip" : "estimated-chip", listing.verified ? "Verified clicks" : "Estimated clicks"));
    if (listing.isDemo) meta.append(createElement("span", "local-chip", "Local"));

    const description = createElement(descriptionTag, "listing-description", listing.description);
    copy.append(listingLink(listing), meta, description);
    wrapper.append(mark, copy);
    return wrapper;
  }

  function getMinimumForPosition(position, ranked = rankedListings()) {
    if (!ranked.length) return 1;
    const index = Math.max(0, position - 1);
    if (index <= 0) return getBid(ranked[0]) + 1;
    return getBid(ranked[index - 1]) + 1;
  }

  function minimumForActiveBid() {
    const ranked = rankedListings();
    if (!ranked.length) return 1;
    if (activeBid?.type === "new") return getBid(ranked[0]) + 1;

    const listing = state.listings.find((item) => item.id === activeBid?.listingId);
    if (!listing) return getBid(ranked[0]) + 1;
    const index = ranked.findIndex((item) => item.id === listing.id);
    if (index <= 0) return getBid(listing) + 1;
    return getBid(ranked[index - 1]) + 1;
  }

  function projectedRank(amount) {
    const ranked = rankedListings();
    if (activeBid?.type === "new") {
      return ranked.filter((listing) => getBid(listing) > amount).length + 1;
    }

    const listing = state.listings.find((item) => item.id === activeBid?.listingId);
    if (!listing) return null;
    const projected = ranked.map((item) =>
      item.id === listing.id ? { ...item, bids: { ...item.bids, [state.activeWindow]: amount } } : item,
    );
    return rankedListings(projected).findIndex((item) => item.id === listing.id) + 1;
  }

  function renderCategories() {
    if (!elements.categoryRail) return;
    const buttons = [{ label: "All", value: DEFAULT_CATEGORY }, ...categories.map((category) => ({ label: category, value: category }))];
    elements.categoryRail.replaceChildren(
      ...buttons.map(({ label, value }) => {
        const button = createElement("button", "category-chip");
        button.type = "button";
        button.dataset.category = value;
        button.setAttribute("aria-pressed", String(state.category === value));
        button.textContent = label;
        return button;
      }),
    );
  }

  function renderBoard() {
    const listings = rankedListings();
    elements.boardList.setAttribute("role", "list");
    elements.boardList.hidden = false;
    document.querySelector(".board-header")?.toggleAttribute("hidden", listings.length <= 3 && listings.length > 0);

    if (elements.topThree) {
      elements.topThree.replaceChildren(...listings.slice(0, 3).map((listing, index) => featuredListingCard(listing, index + 1, listings)));
    }

    if (!listings.length) {
      const empty = createElement("p", "empty-state", "No sponsored listings match this board yet.");
      empty.setAttribute("role", "status");
      elements.boardList.replaceChildren(empty);
    } else {
      const remaining = listings.slice(3);
      elements.boardList.replaceChildren(...remaining.map((listing, index) => rankRow(listing, index + 4, listings)));
      elements.boardList.hidden = remaining.length === 0;
      document.querySelector(".board-header")?.toggleAttribute("hidden", remaining.length === 0);
    }

    if (elements.boardSummary) {
      elements.boardSummary.textContent = `${windowLabel()} board: ${listings.length} sponsored listings. Highest valid bid ranks first.`;
    }
  }

  function featuredListingCard(listing, position, ranked) {
    const card = createElement("article", `featured-listing featured-${position}`);
    card.dataset.rank = String(position);
    card.dataset.listingId = listing.id;
    card.dataset.claimLabel = `Claim this rank for ${money(getBid(ranked[0]) + 1)}`;
    if (listing.id === changedListingId) card.classList.add("is-updated");

    const rank = createElement("div", "featured-rank", `#${position}`);
    const evidence = createElement("div", "featured-evidence");
    const bid = createElement("div", "featured-metric");
    bid.append(createElement("span", "", `${windowLabel()} bid`), createElement("strong", "", money(getBid(listing))));
    const clicks = createElement("div", "featured-metric");
    clicks.append(createElement("span", "", listing.verified ? "Verified clicks" : "Estimated clicks"), createElement("strong", "", compact.format(getClicks(listing))));
    evidence.append(bid, clicks);

    const actions = createElement("div", "featured-actions");
    const minimum = getBid(ranked[0]) + 1;
    const challenge = createElement("button", "bid-button", position === 1 ? `Take #1 for ${money(minimum)}` : "Challenge board");
    challenge.type = "button";
    challenge.dataset.prepareChallenge = String(minimum);
    challenge.setAttribute("aria-label", `Prepare a new challenge for the lead at ${money(minimum)}`);
    const share = createElement("button", "share-button", "Share");
    share.type = "button";
    share.dataset.share = "";
    share.dataset.listingId = listing.id;
    actions.append(challenge, share);

    card.append(rank, productIdentity(listing, "p"), evidence, actions);
    return card;
  }

  function rankRow(listing, position, ranked) {
    const row = createElement("article", "rank-row");
    row.dataset.rank = String(position);
    row.dataset.listingId = listing.id;
    row.dataset.claimLabel = `Claim this rank for ${money(getBid(ranked[0]) + 1)}`;
    row.setAttribute("role", "listitem");
    row.setAttribute("tabindex", "0");
    row.setAttribute("aria-label", `Rank ${position}: ${listing.name}. Claim this rank for ${money(getBid(ranked[0]) + 1)}.`);
    if (listing.id === changedListingId) row.classList.add("is-updated");

    const rank = createElement("div", "rank-position", `#${position}`);
    rank.setAttribute("aria-label", `Rank ${position}`);

    const bid = createElement("div", "money-cell");
    bid.append(createElement("strong", "", money(getBid(listing))), createElement("span", "", `${windowLabel()} bid`));

    const clicks = createElement("div", "click-cell");
    clicks.append(
      createElement("strong", "", compact.format(getClicks(listing))),
      createElement("span", "", listing.verified ? "verified clicks" : "estimated clicks"),
    );

    row.append(rank, productIdentity(listing), bid, clicks);
    return row;
  }

  function renderLeader() {
    const leader = rankedListings()[0];
    if (!leader) return;
    const nextPrice = boardSource === "local" || !remoteNextBid ? getBid(leader) + 1 : remoteNextBid;

    if (elements.heroPrice) elements.heroPrice.textContent = money(nextPrice);
    if (elements.heroContext) {
      elements.heroContext.textContent = `${money(nextPrice)} takes #1 on the ${state.category === DEFAULT_CATEGORY ? windowLabel().toLowerCase() : state.category} board. Your product story stays visible until a higher verified bid wins.`;
    }
    if (elements.leaderBid) elements.leaderBid.textContent = money(getBid(leader));
    if (elements.leaderClicks) elements.leaderClicks.textContent = compact.format(getClicks(leader));
    if (elements.leaderCategory) elements.leaderCategory.textContent = leader.category;
    if (elements.currentLeader) elements.currentLeader.replaceChildren(productIdentity(leader));
    if (elements.inlineBid) {
      elements.inlineBid.min = String(nextPrice);
      elements.inlineBid.value = String(nextPrice);
    }
  }

  function renderSidebar() {
    const todayLeader = allRanked("today")[0];
    if (elements.todayCard && todayLeader) {
      elements.todayCard.replaceChildren(
        productIdentity(todayLeader),
        createElement("strong", "", `${money(todayLeader.bids.today)} today`),
        createElement("p", "", `${compact.format(todayLeader.todayClicks)} clicks since midnight.`),
      );
    }

    if (elements.activityList) {
      elements.activityList.replaceChildren(
        ...state.activity.slice(0, 5).map((item, index) => {
          const li = createElement("li", index === 0 ? "is-latest" : "");
          const time = createElement("time", "", item.time);
          time.dateTime = "PT0M";
          li.append(time, createElement("span", "", item.text));
          return li;
        }),
      );
    }
  }

  function renderTotals() {
    const totalClicks = state.listings.reduce((sum, listing) => sum + getClicks(listing), 0);
    const totalBids = state.listings.reduce((sum, listing) => sum + getBid(listing), 0);
    if (elements.statVisitors) elements.statVisitors.textContent = compact.format(totalClicks + 12_800);
    if (elements.statRevenue) elements.statRevenue.textContent = money(totalBids);
    if (elements.resultClicks) elements.resultClicks.textContent = compact.format(totalClicks);
    if (elements.resultBids) elements.resultBids.textContent = money(totalBids);
  }

  function updateWindowButtons() {
    elements.windowButtons.forEach((button) => {
      const active = button.dataset.boardWindow === state.activeWindow;
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function updateCategorySelect() {
    if (!elements.categorySelect) return;
    if (elements.categorySelect.options.length !== categories.length + 1) {
      elements.categorySelect.replaceChildren(
        new Option("Choose a market", ""),
        ...categories.map((category) => new Option(category, category)),
      );
    }
    if (state.category === DEFAULT_CATEGORY) {
      elements.categorySelect.value = "";
      return;
    }
    elements.categorySelect.value = state.category;
  }

  function renderTheme() {
    elements.root.dataset.theme = "dark";
    if (elements.themeToggle) {
      elements.themeToggle.textContent = state.theme === "dark" ? "Light" : "Dark";
      elements.themeToggle.setAttribute("aria-pressed", String(state.theme === "dark"));
    }
  }

  function render() {
    renderTheme();
    updateWindowButtons();
    updateCategorySelect();
    renderCategories();
    renderBoard();
    renderLeader();
    renderSidebar();
    renderTotals();
    updateBoardSourceLabels();
  }

  function setBidTarget() {
    if (!elements.bidTarget) return;
    const targetName =
      activeBid?.type === "new"
        ? pendingChallenge?.name || "Your demo listing"
        : state.listings.find((listing) => listing.id === activeBid?.listingId)?.name || "Selected listing";
    const label = activeBid?.type === "new" ? "Challenge #1" : "Challenge this position";
    elements.bidTarget.replaceChildren(createElement("span", "", label), createElement("strong", "", targetName));
  }

  function updateBidPreview() {
    if (!elements.bidAmount || !elements.bidHint || !activeBid) return;
    const amount = Number(elements.bidAmount.value);
    const minimum = minimumForActiveBid();
    let message;

    if (!Number.isSafeInteger(amount)) {
      elements.bidAmount.setCustomValidity("Enter a whole-dollar amount.");
      message = "Enter a whole-dollar amount.";
    } else if (amount < minimum) {
      elements.bidAmount.setCustomValidity(`Bid at least ${money(minimum)}.`);
      message = `Minimum challenge is ${money(minimum)}.`;
    } else if (amount > MAX_BID) {
      elements.bidAmount.setCustomValidity(`Demo bids cannot exceed ${money(MAX_BID)}.`);
      message = `Demo bids cannot exceed ${money(MAX_BID)}.`;
    } else {
      elements.bidAmount.setCustomValidity("");
      const rank = projectedRank(amount);
      message = `${money(amount)} would place this listing at #${rank} on the ${windowLabel().toLowerCase()} board.`;
      if (elements.orderPosition) elements.orderPosition.textContent = `Projected #${rank} on the ${windowLabel().toLowerCase()} board`;
    }

    elements.bidHint.textContent = message;
  }

  function openBidDialog(trigger, listingId = null) {
    if (!elements.dialog || !elements.bidForm || !elements.bidAmount) return;
    activeBid = listingId ? { type: "listing", listingId } : { type: "new" };
    lastTrigger = trigger;
    elements.bidForm.reset();
    setBidTarget();

    const min = minimumForActiveBid();
    elements.bidAmount.min = String(min);
    elements.bidAmount.value = String(Math.max(min, Number(elements.inlineBid?.value) || min));
    updateBidPreview();

    if (typeof elements.dialog.showModal === "function") {
      if (!elements.dialog.open) elements.dialog.showModal();
    } else {
      elements.dialog.setAttribute("open", "");
    }

    window.requestAnimationFrame(() => elements.bidAmount?.focus());
  }

  function closeBidDialog({ restoreFocus = true } = {}) {
    if (!elements.dialog) return;
    if (typeof elements.dialog.close === "function" && elements.dialog.open) {
      elements.dialog.close();
    } else {
      elements.dialog.removeAttribute("open");
    }
    activeBid = null;
    if (restoreFocus && lastTrigger?.isConnected) lastTrigger.focus();
  }

  function createOrUpdateDemoListing(amount) {
    const id = `demo-${pendingChallenge.url.hostname.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
    let listing = state.listings.find((item) => item.id === id);
    if (!listing) {
      listing = {
        id,
        name: pendingChallenge.name,
        mark: initialsFromUrl(pendingChallenge.url.toString()),
        url: pendingChallenge.url.toString(),
        description: "A local-only challenger created in this browser.",
        category: pendingChallenge.category,
        age: "now",
        clicks: 0,
        todayClicks: 0,
        verified: false,
        bids: { all: 1, today: 1 },
        isDemo: true,
      };
      state.listings.push(listing);
    }

    listing.name = pendingChallenge.name;
    listing.mark = initialsFromUrl(pendingChallenge.url.toString());
    listing.url = pendingChallenge.url.toString();
    listing.iconUrl = `${pendingChallenge.url.origin}/favicon.ico`;
    listing.category = pendingChallenge.category;
    listing.bids[state.activeWindow] = amount;
    return listing;
  }

  function applyBid(amount) {
    let listing;
    if (activeBid?.type === "new") {
      if (!pendingChallenge) return null;
      listing = createOrUpdateDemoListing(amount);
    } else {
      listing = state.listings.find((item) => item.id === activeBid?.listingId);
      if (!listing) return null;
      listing.bids[state.activeWindow] = amount;
    }

    changedListingId = listing.id;
    const rank = rankedListings().findIndex((item) => item.id === listing.id) + 1;
    state.activity.unshift({
      id: `local-${Date.now()}`,
      time: "just now",
      text: `${listing.name} challenged ${windowLabel()} rank #${rank} for ${money(amount)}.`,
    });
    state.activity = state.activity.slice(0, 6);
    saveState();
    render();

    window.setTimeout(() => {
      if (changedListingId === listing.id) {
        changedListingId = null;
        renderBoard();
      }
    }, 1100);

    return { listing, rank };
  }

  async function startLiveCheckout(amount) {
    const candidate = activeBid?.type === "listing"
      ? state.listings.find((item) => item.id === activeBid.listingId)
      : state.listings.find((item) => {
          if (!pendingChallenge) return false;
          try {
            return new URL(item.url).hostname === pendingChallenge.url.hostname;
          } catch {
            return false;
          }
        });
    if (!candidate) {
      throw new Error("This website must be approved before it can bid. Contact hello@rankoff.my for listing review.");
    }

    const idempotencyKey = crypto.randomUUID();
    const response = await fetch("./api/v1/bids", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        listing_id: candidate.id,
        amount_minor: amount * 100,
        currency: remoteCurrency,
        snapshot_id: remoteSnapshotId,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.checkout_url) {
      throw new Error(payload?.error?.message || "Hosted checkout is temporarily unavailable. No payment was made.");
    }
    window.location.assign(payload.checkout_url);
  }

  function showToast(message, type = "info") {
    if (!elements.toast) return;
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.dataset.state = type;
    elements.toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 4800);
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.append(helper);
    helper.select();
    const copied = document.execCommand("copy");
    helper.remove();
    return copied;
  }

  async function shareListing(listingId) {
    const listing = state.listings.find((item) => item.id === listingId);
    if (!listing) return;
    const rank = rankedListings().findIndex((item) => item.id === listing.id) + 1;
    const text = `${listing.name} is #${rank} on RANKOFF with a ${money(getBid(listing))} sponsored bid.`;
    const url = new URL(window.location.href);
    url.hash = `listing-${listing.id}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "RANKOFF", text, url: url.toString() });
        showToast("Share sheet opened.", "success");
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }

    try {
      const copied = await copyText(`${text} ${url.toString()}`);
      showToast(copied ? "Rank link copied." : "Unable to copy the link.", copied ? "success" : "error");
    } catch {
      showToast("Unable to copy the link.", "error");
    }
  }

  elements.categoryRail?.addEventListener("click", (event) => {
    const trigger = event.target instanceof Element ? event.target.closest("[data-category]") : null;
    if (!(trigger instanceof HTMLElement)) return;
    state.category = trigger.dataset.category || DEFAULT_CATEGORY;
    saveState();
    render();
    void refreshBoardFromApi();
  });

  elements.categorySelect?.addEventListener("change", (event) => {
    const value = event.currentTarget instanceof HTMLSelectElement ? event.currentTarget.value : categories[0];
    state.category = value === "" ? DEFAULT_CATEGORY : categories.includes(value) ? value : DEFAULT_CATEGORY;
    saveState();
    render();
    void refreshBoardFromApi();
  });

  elements.windowButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextWindow = button.dataset.boardWindow;
      if (nextWindow !== "all" && nextWindow !== "today") return;
      state.activeWindow = nextWindow;
      saveState();
      render();
      void refreshBoardFromApi();
    });
  });

  elements.themeToggle?.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    saveState();
    renderTheme();
  });

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const featured = target.closest(".featured-listing");
    if (featured instanceof HTMLElement && !(target.closest("a, button, input, select"))) {
      featured.querySelector("[data-prepare-challenge]")?.click();
      return;
    }

    const rankRow = target.closest(".rank-row");
    if (rankRow instanceof HTMLElement && !(target.closest("a, button, input, select"))) {
      elements.inlineBid?.setAttribute("data-from-row", rankRow.dataset.listingId || "");
      const minimum = Number(elements.inlineBid?.min) || minimumForActiveBid();
      if (elements.inlineBid) elements.inlineBid.value = String(minimum);
      elements.inlineChallenge?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => elements.inlineUrl?.focus(), 220);
      showToast(`Challenge prepared at ${money(minimum)}. Add your product to continue.`);
      return;
    }

    const inlineAdjust = target.closest("[data-inline-adjust]");
    if (inlineAdjust instanceof HTMLButtonElement && elements.inlineBid) {
      const amount = Number(elements.inlineBid.value) || Number(elements.inlineBid.min) || 1;
      const adjustment = Number(inlineAdjust.dataset.inlineAdjust) || 0;
      const min = Number(elements.inlineBid.min) || 1;
      elements.inlineBid.value = String(Math.min(MAX_BID, Math.max(min, amount + adjustment)));
      elements.inlineBid.focus();
      return;
    }

    const challengeTrigger = target.closest("[data-prepare-challenge]");
    if (challengeTrigger instanceof HTMLElement && elements.inlineBid) {
      const minimum = Number(challengeTrigger.dataset.prepareChallenge) || Number(elements.inlineBid.min) || 1;
      elements.inlineBid.value = String(minimum);
      elements.inlineBid.min = String(minimum);
      elements.inlineChallenge?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => elements.inlineUrl?.focus(), 220);
      showToast(`Challenge prepared at ${money(minimum)}. Add your product to continue.`);
      return;
    }

    const adjustButton = target.closest("[data-bid-adjust]");
    if (adjustButton instanceof HTMLButtonElement && elements.bidAmount && activeBid) {
      const amount = Number(elements.bidAmount.value) || minimumForActiveBid();
      const adjustment = Number(adjustButton.dataset.bidAdjust) || 0;
      const min = minimumForActiveBid();
      elements.bidAmount.value = String(Math.min(MAX_BID, Math.max(min, amount + adjustment)));
      updateBidPreview();
      elements.bidAmount.focus();
      return;
    }

    if (target.closest("[data-close-bid]")) {
      closeBidDialog();
      return;
    }

    const shareTrigger = target.closest("[data-share]");
    if (shareTrigger instanceof HTMLElement) {
      shareListing(shareTrigger.dataset.listingId);
    }
  });

  elements.inlineChallenge?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!elements.inlineChallenge.reportValidity()) return;

    const formData = new FormData(elements.inlineChallenge);
    let parsedUrl;
    try {
      parsedUrl = parseProductUrl(formData.get("productUrl"));
    } catch {
      showToast("Enter a valid website, such as yourproduct.com, or an @handle.", "error");
      return;
    }

    const category = String(formData.get("productCategory") || categories[0]);
    pendingChallenge = {
      url: parsedUrl,
      name: nameFromUrl(parsedUrl.toString()),
      category: categories.includes(category) ? category : categories[0],
    };

    const min = getMinimumForPosition(1);
    const amount = Number(formData.get("challengeAmount"));
    if (!Number.isSafeInteger(amount) || amount < min) {
      if (elements.inlineBid) elements.inlineBid.value = String(min);
      showToast(`Claiming #1 starts at ${money(min)}.`, "error");
      return;
    }

    openBidDialog(elements.inlineChallenge);
  });

  elements.bidAmount?.addEventListener("input", updateBidPreview);

  elements.bidForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!elements.bidForm || !elements.bidAmount || !activeBid) return;
    updateBidPreview();
    if (!elements.bidForm.checkValidity()) {
      elements.bidForm.reportValidity();
      return;
    }

    const amount = Number(elements.bidAmount.value);
    if (amount < minimumForActiveBid()) {
      showToast(`Bid at least ${money(minimumForActiveBid())}.`, "error");
      return;
    }

    if (boardSource === "api") {
      showToast("Live checkout is not connected for this submission yet. No payment was made.", "error");
      return;
    }

    if (boardSource === "production") {
      const submitButton = elements.bidForm.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Opening secure checkout…";
      }
      try {
        await startLiveCheckout(amount);
      } catch (error) {
        showToast(error?.message || "Hosted checkout is unavailable. No payment was made.", "error");
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Confirm challenge";
        }
      }
      return;
    }

    const result = applyBid(amount);
    if (!result) return;
    pendingChallenge = null;
    closeBidDialog({ restoreFocus: false });
    showToast(`${result.listing.name} is now #${result.rank}. No payment was collected.`, "success");
  });

  elements.dialog?.addEventListener("click", (event) => {
    if (event.target === elements.dialog) closeBidDialog();
  });

  elements.dialog?.addEventListener("cancel", () => {
    activeBid = null;
  });

  render();
  void refreshBoardFromApi();
  if (new URL(window.location.href).searchParams.has("checkout")) {
    showToast("Checkout returned. Rank changes only after verified payment settlement.");
  }
})();
