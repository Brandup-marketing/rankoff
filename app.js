(() => {
  "use strict";

  const STORE_KEY = "rankoff-mvp-demo-v3";
  const MAX_BID = 1_000_000;
  const DEFAULT_CATEGORY = "all";
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
    onlineCount: document.querySelector("[data-online-count]"),
    visitorCount: document.querySelector("[data-visitor-count]"),
    analyticsState: document.querySelector("[data-analytics-state]"),
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

  let state = loadState();
  let activeBid = null;
  let pendingChallenge = null;
  let lastTrigger = null;
  let toastTimer = null;
  let changedListingId = null;

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
          url: String(listing.url || "https://rankoff.io/demo"),
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
      return difference || first.name.localeCompare(second.name);
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

  function listingLink(listing) {
    const link = createElement("a", "product-name", listing.name);
    link.href = listing.url;
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
    if (listing.iconUrl) {
      const icon = document.createElement("img");
      icon.src = listing.iconUrl;
      icon.alt = "";
      icon.loading = "lazy";
      icon.addEventListener("load", () => mark.classList.add("has-icon"), { once: true });
      icon.addEventListener("error", () => icon.remove(), { once: true });
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
    if (listing.id === changedListingId) card.classList.add("is-updated");

    const rank = createElement("div", "featured-rank", position === 1 ? "CHAMPION · #1" : `#${position}`);
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
    row.setAttribute("role", "listitem");
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

    const actions = createElement("div", "row-actions");
    const min = getBid(ranked[0]) + 1;
    const bidButton = createElement("button", "bid-button", "Challenge board");
    bidButton.type = "button";
    bidButton.dataset.prepareChallenge = String(min);
    bidButton.dataset.listingId = listing.id;
    bidButton.setAttribute("aria-label", `Prepare a new challenge for the lead at ${money(min)}`);

    const shareButton = createElement("button", "share-button", "Share");
    shareButton.type = "button";
    shareButton.dataset.share = "";
    shareButton.dataset.listingId = listing.id;
    actions.append(bidButton, shareButton);

    row.append(rank, productIdentity(listing), bid, clicks, actions);
    return row;
  }

  function renderLeader() {
    const leader = rankedListings()[0];
    if (!leader) return;
    const nextPrice = getBid(leader) + 1;

    if (elements.heroPrice) elements.heroPrice.textContent = money(nextPrice);
    if (elements.heroContext) {
      elements.heroContext.textContent = `${money(nextPrice)} takes #1 on the ${state.category === DEFAULT_CATEGORY ? windowLabel().toLowerCase() : state.category} board until a higher verified bid wins.`;
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
        ...state.activity.slice(0, 5).map((item) => {
          const li = createElement("li");
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
  });

  elements.categorySelect?.addEventListener("change", (event) => {
    const value = event.currentTarget instanceof HTMLSelectElement ? event.currentTarget.value : categories[0];
    if (categories.includes(value)) state.category = value;
    saveState();
    render();
  });

  elements.windowButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextWindow = button.dataset.boardWindow;
      if (nextWindow !== "all" && nextWindow !== "today") return;
      state.activeWindow = nextWindow;
      saveState();
      render();
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
    const rawUrl = String(formData.get("productUrl") || "").trim();
    let parsedUrl;
    try {
      parsedUrl = rawUrl.startsWith("@")
        ? new URL(`https://x.com/${encodeURIComponent(rawUrl.slice(1))}`)
        : new URL(rawUrl);
    } catch {
      showToast("Enter a complete URL or an @handle.", "error");
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

  elements.bidForm?.addEventListener("submit", (event) => {
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

  async function loadPublicAnalytics() {
    const endpoint = window.RANKOFF_ANALYTICS_ENDPOINT || "./api/public-analytics";
    try {
      const response = await fetch(endpoint, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error("Analytics endpoint unavailable");
      const payload = await response.json();
      const online = Number(payload.online);
      const visitors = Number(payload.visitors);
      if (!Number.isFinite(online) || !Number.isFinite(visitors)) throw new Error("Analytics payload invalid");
      if (elements.onlineCount) elements.onlineCount.textContent = compact.format(online);
      if (elements.visitorCount) elements.visitorCount.textContent = compact.format(visitors);
      if (elements.analyticsState) elements.analyticsState.textContent = "Live analytics";
    } catch {
      if (elements.onlineCount) elements.onlineCount.textContent = "—";
      if (elements.visitorCount) elements.visitorCount.textContent = "—";
      if (elements.analyticsState) elements.analyticsState.textContent = "Demo telemetry · connect DataFast";
    }
  }

  render();
  loadPublicAnalytics();
})();
