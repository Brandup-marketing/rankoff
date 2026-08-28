(() => {
  "use strict";

  const STORE_KEY = "rankoff-mvp-demo-v3";
  const MAX_BID = 1_000_000;
  const PAGE_SIZE = 50;
  const DEFAULT_CATEGORY = "all";
  const BOARD_API_ENDPOINT = "./api/v1/board";
  const categoryGroups = Object.freeze({
    Agents: ["Agents", "AIMedia"],
    Marketing: ["Marketing", "SEO", "Social", "Sales", "Attention", "People"],
    Developer: ["Developer", "Security"],
    Business: ["Business", "Agencies", "Careers"],
    Crypto: ["Crypto"],
    Ecommerce: ["Ecommerce", "Hardware"],
    Design: ["Design", "Writing", "Audio", "News"],
    Productivity: ["Productivity", "Education"],
    Health: ["Health"],
    Games: ["Games"],
    Travel: ["Travel", "RealEstate"],
    Domains: ["Domains", "Discovery"],
    Other: ["Other"],
  });
  const categories = Object.freeze(Object.keys(categoryGroups));
  const categoryAliases = Object.freeze(Object.entries(categoryGroups).reduce((aliases, [market, members]) => {
    aliases[market.toLowerCase()] = market;
    members.forEach((member) => { aliases[member.toLowerCase()] = market; });
    return aliases;
  }, {}));
  const categoryIcons = Object.freeze({ all: "▦", Agents: "✦", Marketing: "↗", Developer: "</>", Business: "◆", Crypto: "₿", Ecommerce: "◇", Design: "✎", Productivity: "✓", Health: "+", Games: "◈", Travel: "⌖", Domains: "◎", Other: "•••" });
  const translations = {
    en: { navBoard: "Board", navCategories: "Categories", navAbout: "About", heroCopy: "Put your product in the spot people see first. Your listing stays at the top until someone pays more.", totalBid: "Your total bid", productUrl: "Website or social account", productUrlPlaceholder: "example.com or @yourusername", invalidWebsite: "Enter a valid website or social account, such as example.com or @yourusername.", chooseMarket: "Choose a market", challengeCategory: "Challenge category", categoryRule: "Must match the listing you’ll outrank.", reviewBid: "Review your bid", markets: "Markets", liveLeaderboard: "Live leaderboard", boardSummary: "Highest valid bid takes #1. Pay more to move up.", todayRanking: "Today’s top ranking", latestActivity: "Latest activity", liveUpdates: "Latest updates", howItWorks: "How ranking works", searchPlaceholder: "Search products and categories…", close: "Close", seeAll: "See all", past24: "Past 24h", livePulse: "Live bids", rank: "Rank", listing: "Listing", bid: "Bid", clicks: "Clicks", sponsored: "Sponsored", rules: "Every listing is sponsored. The highest verified bid ranks first.", position: "Position", positionCopy: "Held until a higher verified bid wins.", charge: "Charge", chargeCopy: "One payment after review.", reporting: "Reporting", reportingCopy: "Clicks shown for the selected timeframe.", readRules: "Read all rules →", rulesLink: "Rules", terms: "Terms", termsOfService: "Terms of Service", privacyLink: "Privacy", payments: "Payments", footerCredit: "A Brandup Marketing product", confirmRank: "Confirm this rank", confirmRankIntro: "Check the rank and price, then agree to the Terms of Service to continue.", rankLabel: "Rank", priceLabel: "Price", dueNow: "Due now", confirmationCopy: "Your listing goes live at this rank after payment confirms. Someone else can still claim a higher rank.", agreeTermsPrefix: "I have read and agree to the ", agreeTermsSuffix: ".", cancel: "Cancel", continueCheckout: "Continue to checkout" },
    zh: { navBoard: "榜单", navCategories: "分类", navAbout: "关于", heroCopy: "把产品放到最显眼的位置。只要没有更高的有效出价，你的介绍就会留在榜首。", totalBid: "你的总出价", productUrl: "网站或社交账号", productUrlPlaceholder: "example.com 或 @yourusername", invalidWebsite: "请输入有效的网站或社交账号，例如 example.com 或 @yourusername。", chooseMarket: "选择市场", challengeCategory: "挑战类别", categoryRule: "必须与您要超越的条目类别相同。", reviewBid: "确认出价", markets: "市场", liveLeaderboard: "实时榜单", boardSummary: "最高有效出价获得第 1 名。提高出价即可上升。", todayRanking: "今日热门榜", latestActivity: "最新动态", liveUpdates: "最新动态", howItWorks: "排名规则", searchPlaceholder: "搜索产品和分类…", close: "关闭", seeAll: "查看全部", past24: "近 24 小时", livePulse: "实时竞价", rank: "排名", listing: "条目", bid: "出价", clicks: "点击", sponsored: "赞助", rules: "每个条目都是赞助展示。最高的已验证出价排名第一。", position: "排名位置", positionCopy: "保持到有人以更高的已验证出价胜出。", charge: "费用", chargeCopy: "审核后一次性付款。", reporting: "数据", reportingCopy: "显示所选时间范围内的点击。", readRules: "查看完整规则 →", rulesLink: "规则", terms: "条款", termsOfService: "服务条款", privacyLink: "隐私", payments: "付款", footerCredit: "Brandup Marketing 出品", confirmRank: "确认此排名", confirmRankIntro: "核对排名与价格，同意《服务条款》后继续。", rankLabel: "排名", priceLabel: "价格", dueNow: "现在支付", confirmationCopy: "付款确认后，你的条目会以此排名上线。其他人仍可出价取得更高排名。", agreeTermsPrefix: "我已阅读并同意《", agreeTermsSuffix: "》。", cancel: "取消", continueCheckout: "继续付款" },
  };
  const categoryLabels = { Agents: "AI & Automation", Marketing: "Marketing, SEO & Social", Developer: "Developer Tools & Security", Business: "Business & Professional Services", Crypto: "Finance, Crypto & Investing", Ecommerce: "Ecommerce, Retail & Hardware", Design: "Design, Content & Media", Productivity: "Productivity & Education", Health: "Health & Wellness", Games: "Games & Entertainment", Travel: "Travel, Local & Property", Domains: "Web, Domains & Discovery", Other: "Other" };
  const categoryTranslations = { Agents: "AI 与自动化", Marketing: "营销、SEO 与社交媒体", Developer: "开发工具与安全", Business: "商业与专业服务", Crypto: "金融、加密与投资", Ecommerce: "电商、零售与硬件", Design: "设计、内容与媒体", Productivity: "效率工具与教育", Health: "健康与生活方式", Games: "游戏与娱乐", Travel: "旅行、本地与房地产", Domains: "网站、域名与发现", Other: "其他" };

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
    { id: "a1", type: "topup", timeEn: "2m ago", timeZh: "2 分钟前", listingId: "model-harbor", listingName: "Model Harbor", delta: 120, amount: 2480, rank: 1 },
    { id: "a2", type: "won", timeEn: "8m ago", timeZh: "8 分钟前", listingId: "trackline", listingName: "Trackline", delta: 260, amount: 2160, rank: 2, displacedName: "Patchnote" },
    { id: "a3", type: "outbid", timeEn: "14m ago", timeZh: "14 分钟前", listingId: "canvas-relay", listingName: "Canvas Relay", rank: 4, displacedBy: "Patchnote" },
    { id: "a4", type: "joined", timeEn: "20m ago", timeZh: "20 分钟前", listingId: "palette-runner", listingName: "Palette Runner", amount: 520, rank: 8 },
    { id: "a5", type: "won", timeEn: "31m ago", timeZh: "31 分钟前", listingId: "switchboard", listingName: "Switchboard", delta: 95, amount: 940, rank: 5, displacedName: "Focus Coda" },
    { id: "a6", type: "topup", timeEn: "43m ago", timeZh: "43 分钟前", listingId: "patchnote", listingName: "Patchnote", delta: 180, amount: 1930, rank: 3 },
  ];

  const elements = {
    root: document.documentElement,
    boardList: document.querySelector("[data-board-list]"),
    topThree: document.querySelector("[data-top-three]"),
    boardPagination: document.querySelector("[data-board-pagination]"),
    boardPageButtons: Array.from(document.querySelectorAll("[data-board-page]")),
    pageRange: document.querySelector("[data-page-range]"),
    pageTotal: document.querySelector("[data-page-total]"),
    boardSummary: document.querySelector("[data-board-summary]"),
    boardHeading: document.querySelector("[data-board-heading]"),
    measurementSummary: document.querySelector("[data-measurement-summary]"),
    measurementCopy: document.querySelector("[data-measurement-copy]"),
    categoryRail: document.querySelector("[data-category-rail]"),
    categoryScrollButtons: Array.from(document.querySelectorAll("[data-category-scroll]")),
    categorySelect: document.querySelector("[data-category-select]"),
    windowButtons: Array.from(document.querySelectorAll("[data-board-window]")),
    themeToggle: document.querySelector("[data-theme-toggle]"),
    languageToggle: document.querySelector("[data-language-toggle]"),
    inlineChallenge: document.querySelector("[data-inline-challenge]"),
    inlineBid: document.querySelector("[data-inline-bid]"),
    inlineUrl: document.querySelector("[data-inline-url]"),
    heroPrice: document.querySelector("[data-hero-next-price]"),
    heroContext: document.querySelector("[data-hero-context]"),
    boardState: document.querySelector("[data-board-state]"),
    inlineSubmit: document.querySelector("[data-inline-submit]"),
    currentLeader: document.querySelector("[data-current-leader]"),
    leaderBid: document.querySelector("[data-leader-bid]"),
    leaderClicks: document.querySelector("[data-leader-clicks]"),
    leaderCategory: document.querySelector("[data-leader-category]"),
    todayRankingList: document.querySelector("[data-today-ranking-list]"),
    todaySeeAll: document.querySelector("[data-today-see-all]"),
    activityList: document.querySelector("[data-activity-list]"),
    activityNote: document.querySelector("[data-activity-note]"),
    liveDot: document.querySelector(".live-dot"),
    panelToggles: Array.from(document.querySelectorAll("[data-panel-toggle]")),
    statVisitors: document.querySelector("[data-stat-visitors]"),
    statRevenue: document.querySelector("[data-stat-revenue]"),
    resultClicks: document.querySelector("[data-result-clicks]"),
    resultBids: document.querySelector("[data-result-bids]"),
    dialog: document.querySelector("[data-bid-dialog]"),
    bidForm: document.querySelector("[data-bid-form]"),
    bidAmount: document.querySelector("#bid-amount"),
    bidAgree: document.querySelector("[data-bid-agree]"),
    dialogRank: document.querySelector("[data-dialog-rank]"),
    dialogPrice: document.querySelector("[data-dialog-price]"),
    dialogContext: document.querySelector("[data-dialog-context]"),
    dialogExplanation: document.querySelector("[data-dialog-explanation]"),
    toast: document.querySelector("[data-toast]"),
  };

  if (!elements.boardList) return;

  let boardSource = "local";
  let boardPage = 1;
  let remotePagination = null;
  let remoteLeader = null;
  let remoteRequestId = 0;
  let state = loadState();
  const sharedView = new URL(window.location.href);
  if (sharedView.searchParams.get("period") === "today") state.activeWindow = "today";
  if (sharedView.searchParams.get("period") === "all") state.activeWindow = "all";
  const sharedCategory = sharedView.searchParams.get("category");
  if (sharedCategory === DEFAULT_CATEGORY) state.category = DEFAULT_CATEGORY;
  else if (canonicalCategory(sharedCategory)) state.category = canonicalCategory(sharedCategory);
  let activeBid = null;
  let pendingChallenge = null;
  let lastTrigger = null;
  let toastTimer = null;
  let changedListingId = null;
  let pendingActivityAnimationId = "";
  let lastRemoteActivityContext = "";
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
      language: "en",
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
          category: canonicalCategory(listing.category) || categories[0],
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

      const savedActivity = Array.isArray(saved.activity) ? saved.activity : [];
      const restoredActivity = savedActivity.some((item) => item?.listingId || item?.listing_id)
        ? savedActivity.slice(0, 20)
        : [...seedActivity];

      return {
        activeWindow: saved.activeWindow === "today" ? "today" : "all",
        category: saved.category === DEFAULT_CATEGORY ? DEFAULT_CATEGORY : canonicalCategory(saved.category) || DEFAULT_CATEGORY,
        theme: saved.theme === "light" ? "light" : "dark",
        language: saved.language === "zh" ? "zh" : "en",
        listings: restored,
        activity: restoredActivity,
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
          language: state.language,
          listings: state.listings,
          activity: state.activity.slice(0, 20),
        }),
      );
    } catch {
      showToast("This browser could not save demo changes for later.", "error");
    }
  }

  function languageText(key) { return (translations[state.language] || translations.en)[key] || translations.en[key] || key; }

  function canonicalCategory(category) {
    return categoryAliases[String(category || "").toLowerCase()] || "";
  }

  function categoryName(category, language = state.language) {
    const market = canonicalCategory(category) || "Other";
    return language === "zh" ? categoryTranslations[market] : categoryLabels[market];
  }

  function renderLanguage() {
    document.documentElement.lang = state.language === "zh" ? "zh-CN" : "en";
    document.querySelectorAll("[data-i18n]").forEach((node) => { node.textContent = languageText(node.dataset.i18n); });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => { node.setAttribute("placeholder", languageText(node.dataset.i18nPlaceholder)); });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => { node.setAttribute("aria-label", languageText(node.dataset.i18nAriaLabel)); });
    if (elements.languageToggle) {
      elements.languageToggle.textContent = state.language === "zh" ? "CN" : "EN";
      elements.languageToggle.setAttribute("aria-pressed", String(state.language === "zh"));
      elements.languageToggle.setAttribute("aria-label", state.language === "zh" ? "Switch to English" : "切换中文");
    }
    updatePanelToggleLabels();
  }

  function updatePanelToggleLabels() {
    elements.panelToggles.forEach((button) => {
      const expanded = button.getAttribute("aria-expanded") !== "false";
      const label = expanded
        ? (state.language === "zh" ? "收起" : "Minimize")
        : (state.language === "zh" ? "展开" : "Expand");
      const labelNode = button.querySelector("[data-panel-toggle-label]");
      if (labelNode) labelNode.textContent = label;
      const title = state.language === "zh" ? button.dataset.panelTitleZh : button.dataset.panelTitle;
      button.setAttribute("aria-label", `${label} ${title || "panel"}`);
      const content = document.getElementById(button.getAttribute("aria-controls"));
      if (content) content.hidden = !expanded;
      const icon = button.querySelector(".panel-toggle-icon");
      if (icon) icon.textContent = expanded ? "−" : "+";
    });
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
      age: entry?.bid?.settled_at || previous?.age || "",
      clicks: period === "all" ? clicks : previous?.clicks || clicks,
      todayClicks: period === "today" ? clicks : previous?.todayClicks || 0,
      verified: true,
      bids,
    };
  }

  function updateBoardSourceLabels() {
    const production = boardSource === "production";
    const chinese = state.language === "zh";
    if (elements.boardState) {
      elements.boardState.lastChild.textContent = chinese
        ? (production ? " 实时榜单" : boardSource === "local" ? " 预览榜单" : " 已连接预览")
        : (production ? " Live board" : boardSource === "local" ? " Preview board" : " Connected preview");
    }
    if (elements.boardHeading) elements.boardHeading.textContent = chinese
      ? (production ? "实时赞助榜单" : "预览赞助榜单")
      : (production ? "Live sponsored leaderboard" : "Preview sponsored leaderboard");
    if (elements.activityNote) elements.activityNote.textContent = chinese
      ? (production ? "实时成交滚动播报 · 立即出价抢位" : "竞价预览 · 立即出价抢位")
      : (production ? "Live settlements · Bid before the next move" : "Market preview · Bid before the next move");
    if (elements.liveDot) elements.liveDot.hidden = !production;
    if (elements.measurementSummary) elements.measurementSummary.textContent = chinese
      ? (production ? "点击如何统计" : "预览点击说明")
      : (production ? "How clicks are measured" : "About preview clicks");
    if (elements.measurementCopy) elements.measurementCopy.textContent = chinese
      ? (production ? "已验证点击来自所选时间范围内的第一方跳转记录。" : "预览点击数仅作演示；开启实时追踪后才会显示已验证点击。")
      : (production ? "Verified clicks represent first-party redirect events for the selected timeframe." : "Preview click totals are illustrative. Verified click reporting begins only after live tracking is enabled.");
  }

  async function refreshBoardFromApi() {
    if (!/^https?:$/.test(window.location.protocol)) return false;
    const requestId = ++remoteRequestId;
    const endpoint = new URL(BOARD_API_ENDPOINT, window.location.href);
    endpoint.searchParams.set("board", "global");
    endpoint.searchParams.set("category", state.category);
    endpoint.searchParams.set("period", state.activeWindow);
    endpoint.searchParams.set("limit", String(PAGE_SIZE));
    endpoint.searchParams.set("page", String(boardPage));
    const activityContext = `${state.activeWindow}:${state.category}`;

    try {
      const response = await fetch(endpoint, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) return false;
      const payload = await response.json();
      if (requestId !== remoteRequestId || !Array.isArray(payload?.rankings)) return false;
      const period = state.activeWindow;
      const previousActivityId = String(state.activity[0]?.id || "");
      state.listings = payload.rankings.map((entry, index) => normalizeApiRanking(entry, index, period));
      remotePagination = payload.pagination && typeof payload.pagination === "object"
        ? {
            page: Math.max(1, Number(payload.pagination.page) || boardPage),
            pageSize: Math.max(1, Number(payload.pagination.page_size) || PAGE_SIZE),
            total: Math.max(0, Number(payload.pagination.total) || 0),
            totalPages: Math.max(1, Number(payload.pagination.total_pages) || 1),
          }
        : null;
      if (boardPage === 1 && state.listings[0]) remoteLeader = cloneListing(state.listings[0]);
      boardSource = payload.mode === "production" ? "production" : "api";
      if (boardSource === "production") {
        state.activity = Array.isArray(payload.activity)
          ? payload.activity.filter((item) => item && typeof item === "object").slice(0, 20)
          : [];
        const nextActivityId = String(state.activity[0]?.id || "");
        if (lastRemoteActivityContext === activityContext && previousActivityId && nextActivityId !== previousActivityId) {
          pendingActivityAnimationId = nextActivityId;
        }
        lastRemoteActivityContext = activityContext;
      }
      remoteNextBid = dollarsFromMinor(payload.next_bid_minor, null);
      remoteSnapshotId = payload.snapshot_id || null;
      remoteCurrency = String(payload.board?.currency || "USD").toUpperCase();
      render();
      if (boardSource === "production" && !boardViewSent) {
        boardViewSent = true;
        void recordBoardView();
      }
      return true;
    } catch {
      /* Static preview and offline use intentionally fall back to the local board. */
      return false;
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
    if (state.language === "zh") return state.activeWindow === "today" ? "近 24 小时" : "全部时间";
    return state.activeWindow === "today" ? "Past 24h" : "All-time";
  }

  function checkoutBoardLabel() {
    if (state.language === "zh") return state.activeWindow === "today" ? "今日榜单" : "全部时间榜单";
    return state.activeWindow === "today" ? "Today’s board" : "All-time board";
  }

  function claimLabel(amount) {
    return state.language === "zh"
      ? `出价 ${money(amount)} 争夺此排名`
      : `Claim this rank for ${money(amount)}`;
  }

  function createClaimControl(amount) {
    const control = createElement("button", "claim-rank-control");
    control.type = "button";
    control.dataset.prepareChallenge = String(amount);
    control.setAttribute("aria-label", claimLabel(amount));
    return control;
  }

  function createShareControl(listing, position) {
    const control = createElement("button", "rank-share-control");
    control.type = "button";
    control.dataset.share = "";
    control.dataset.listingId = listing.id;
    control.dataset.position = String(position);
    const label = state.language === "zh" ? "分享排名" : "Share rank";
    control.setAttribute("aria-label", state.language === "zh" ? `分享 ${listing.name} 的第 ${position} 名` : `Share ${listing.name}'s #${position} rank`);
    control.append(createElement("span", "rank-share-icon", "↗"), createElement("span", "rank-share-label", label));
    return control;
  }

  function visibleListings() {
    if (state.category === DEFAULT_CATEGORY) return [...state.listings];
    return state.listings.filter((listing) => canonicalCategory(listing.category) === state.category);
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
    link.href = listingDetailsHref(listing);
    link.setAttribute("aria-label", state.language === "zh" ? `查看 ${listing.name} 的榜单详情` : `View ${listing.name} ranking details`);
    return link;
  }

  function listingDetailsHref(listing) {
    const detail = new URL("./listing.html", window.location.href);
    detail.searchParams.set("id", listing.id);
    return detail.toString();
  }

  function listingAgeLabel(listing) {
    const raw = String(listing.age || "").trim();
    if (raw) {
      const timestamp = Date.parse(raw);
      if (Number.isFinite(timestamp)) {
        const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
        if (state.language === "zh") {
          if (minutes < 1) return "刚刚上榜";
          if (minutes < 60) return `${minutes} 分钟前上榜`;
          if (minutes < 1_440) return `${Math.floor(minutes / 60)} 小时前上榜`;
          const days = Math.floor(minutes / 1_440);
          return `${days} 天前上榜`;
        }
        if (minutes < 1) return "Claimed just now";
        if (minutes < 60) return `Claimed ${minutes}m ago`;
        if (minutes < 1_440) return `Claimed ${Math.floor(minutes / 60)}h ago`;
        const days = Math.floor(minutes / 1_440);
        return `Claimed ${days} day${days === 1 ? "" : "s"} ago`;
      }
      const shorthand = raw.match(/^(\d+)\s*([dhm])$/i);
      if (shorthand) {
        const amount = Number(shorthand[1]);
        const unit = shorthand[2].toLowerCase();
        if (unit === "d") return state.language === "zh" ? `${amount} 天前上榜` : `Claimed ${amount} day${amount === 1 ? "" : "s"} ago`;
        if (unit === "h") return amount >= 24
          ? (state.language === "zh" ? `${Math.floor(amount / 24)} 天前上榜` : `Claimed ${Math.floor(amount / 24)} day${amount >= 48 ? "s" : ""} ago`)
          : (state.language === "zh" ? `${amount} 小时前上榜` : `Claimed ${amount}h ago`);
        return state.language === "zh" ? `${amount} 分钟前上榜` : `Claimed ${amount}m ago`;
      }
    }
    return state.language === "zh" ? "最近上榜" : "Claimed recently";
  }

  function listingHostLabel(listing) {
    try {
      return new URL(listing.url).hostname.replace(/^www\./, "");
    } catch {
      return "rankoff.my";
    }
  }

  function productIdentity(listing, descriptionTag = "p", position = null) {
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
    const production = boardSource === "production";
    const chinese = state.language === "zh";
    const ageLabel = listingAgeLabel(listing);
    const clickLabel = production
      ? (listing.verified ? (chinese ? "已验证点击" : "Verified clicks") : (chinese ? "估算点击" : "Estimated clicks"))
      : (chinese ? "示例点击" : "Sample clicks");
    meta.append(
      createElement("span", "sponsored-chip", chinese ? "赞助" : "Sponsored"),
      createElement("span", "meta-item", categoryName(listing.category)),
      createElement("span", "meta-item", ageLabel),
      createElement("span", "meta-item", listingHostLabel(listing)),
      createElement("span", "meta-item listing-clicks", `${compact.format(getClicks(listing))} ${chinese ? "次点击" : "clicks"}`),
    );
    meta.append(createElement("span", production && listing.verified ? "verified-chip" : "estimated-chip", clickLabel));
    const details = createElement("a", "listing-details", chinese ? "查看详情" : "See details");
    details.href = listingDetailsHref(listing);
    details.setAttribute("aria-label", chinese ? `查看 ${listing.name} 的详细信息` : `See details for ${listing.name}`);
    if (listing.isDemo) meta.append(createElement("span", "local-chip", "Local"));
    if (Number.isSafeInteger(position) && position > 0) meta.append(createShareControl(listing, position));

    const description = createElement(descriptionTag, "listing-description", listing.description);
    const actions = createElement("div", "product-actions");
    actions.append(details);
    copy.append(listingLink(listing), description, meta, actions);
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
    elements.categoryScrollButtons.forEach((button) => {
      const previous = Number(button.dataset.categoryScroll) < 0;
      button.setAttribute("aria-label", state.language === "zh" ? (previous ? "向左滚动市场" : "向右滚动市场") : (previous ? "Scroll markets left" : "Scroll markets right"));
    });
    const shortLabels = state.language === "zh"
      ? { Agents: "AI", Marketing: "营销与 SEO", Developer: "开发工具", Business: "商业服务", Crypto: "金融与加密", Ecommerce: "电商与硬件", Design: "设计与媒体", Productivity: "效率与教育", Health: "健康", Games: "游戏", Travel: "旅行与房产", Domains: "网站与域名", Other: "其他" }
      : { Agents: "AI", Marketing: "Marketing & SEO", Developer: "Developer", Business: "Business", Crypto: "Finance & Crypto", Ecommerce: "Ecommerce & Hardware", Design: "Design & Media", Productivity: "Productivity & Education", Health: "Health", Games: "Games", Travel: "Travel & Property", Domains: "Web & Domains", Other: "Other" };
    const buttons = [{ label: state.language === "zh" ? "全部" : "All", value: DEFAULT_CATEGORY }, ...categories.map((category) => ({ label: shortLabels[category], value: category }))];
    elements.categoryRail.replaceChildren(
      ...buttons.map(({ label, value }) => {
        const button = createElement("button", "category-chip");
        button.type = "button";
        button.dataset.category = value;
        button.setAttribute("aria-pressed", String(state.category === value));
        const icon = createElement("span", "category-chip-icon", categoryIcons[value]);
        icon.setAttribute("aria-hidden", "true");
        button.append(icon, createElement("span", "category-chip-label", label));
        return button;
      }),
    );
    window.requestAnimationFrame(() => {
      const selected = elements.categoryRail.querySelector('[aria-pressed="true"]');
      if (selected instanceof HTMLElement) {
        const left = selected.offsetLeft - (elements.categoryRail.clientWidth - selected.offsetWidth) / 2;
        elements.categoryRail.scrollTo({ left: Math.max(0, left), behavior: "auto" });
      }
      updateCategoryScrollControls();
    });
  }

  function updateCategoryScrollControls() {
    if (!elements.categoryRail) return;
    const maxScroll = Math.max(0, elements.categoryRail.scrollWidth - elements.categoryRail.clientWidth);
    elements.categoryScrollButtons.forEach((button) => {
      const direction = Number(button.dataset.categoryScroll) || 1;
      button.disabled = direction < 0 ? elements.categoryRail.scrollLeft <= 1 : elements.categoryRail.scrollLeft >= maxScroll - 1;
    });
  }

  function rankMilestone(position) {
    const marker = createElement("div", "rank-milestone");
    marker.setAttribute("role", "separator");
    marker.setAttribute("aria-label", state.language === "zh" ? `前 ${position} 名` : `Top ${position}`);
    marker.append(
      createElement("span", "milestone-line"),
      createElement("span", "milestone-label", state.language === "zh" ? `前 ${position} 名` : `Top ${position}`),
      createElement("span", "milestone-line"),
    );
    return marker;
  }

  function boardRowsWithMilestones(listings, ranked, firstPosition = 4) {
    const nodes = [];
    listings.forEach((listing, index) => {
      const position = Number.isSafeInteger(listing.serverRank) ? listing.serverRank : firstPosition + index;
      nodes.push(featuredListingCard(listing, position, ranked, true));
      if ([10, 20, 50].includes(position) && position <= ranked.length) {
        nodes.push(rankMilestone(position));
      }
    });
    return nodes;
  }

  function renderPagination(total, visibleCount) {
    if (!elements.boardPagination) return;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (boardPage > totalPages) boardPage = totalPages;
    elements.boardPagination.hidden = total <= PAGE_SIZE;
    elements.boardPagination.setAttribute("aria-label", state.language === "zh" ? "榜单分页" : "Leaderboard pages");
    const start = total === 0 ? 0 : (boardPage - 1) * PAGE_SIZE + 1;
    const end = total === 0 ? 0 : Math.min(total, start + Math.max(0, visibleCount) - 1);
    if (elements.pageRange) elements.pageRange.textContent = `${start}–${end}`;
    if (elements.pageTotal) elements.pageTotal.textContent = state.language === "zh" ? `共 ${total} 项` : `of ${total}`;
    elements.boardPageButtons.forEach((button) => {
      const previous = button.dataset.boardPage === "previous";
      button.textContent = state.language === "zh" ? (previous ? "← 上一页" : "下一页 →") : (previous ? "← Previous" : "Next →");
      button.disabled = previous ? boardPage <= 1 : boardPage >= totalPages;
    });
  }

  function renderBoard() {
    const allListings = rankedListings();
    const remote = boardSource !== "local" && remotePagination;
    const total = remote ? remotePagination.total : allListings.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (boardPage > totalPages) boardPage = totalPages;
    const listings = remote
      ? allListings
      : allListings.slice((boardPage - 1) * PAGE_SIZE, boardPage * PAGE_SIZE);
    elements.boardList.setAttribute("role", "list");
    const pageStart = total === 0 ? 0 : (boardPage - 1) * PAGE_SIZE + 1;
    const pageEnd = total === 0 ? 0 : Math.min(total, pageStart + listings.length - 1);
    elements.boardList.setAttribute("aria-label", state.language === "zh" ? `赞助榜单第 ${pageStart} 至 ${pageEnd} 名` : `Sponsored listings ranked ${pageStart} through ${pageEnd}`);
    elements.boardList.hidden = false;

    if (elements.topThree) {
      elements.topThree.setAttribute("role", "list");
      const leaders = boardPage === 1
        ? listings.filter((listing, index) => (Number.isSafeInteger(listing.serverRank) ? listing.serverRank : index + 1) <= 3)
        : [];
      elements.topThree.replaceChildren(...leaders.map((listing, index) => featuredListingCard(listing, listing.serverRank || index + 1, allListings)));
      elements.topThree.hidden = leaders.length === 0;
    }

    if (!listings.length) {
      const empty = createElement("p", "empty-state", state.language === "zh" ? "此榜单暂时没有符合条件的赞助条目。" : "No sponsored listings match this board yet.");
      empty.setAttribute("role", "status");
      elements.boardList.replaceChildren(empty);
    } else {
      const remaining = listings.filter((listing, index) => (Number.isSafeInteger(listing.serverRank) ? listing.serverRank : (boardPage - 1) * PAGE_SIZE + index + 1) > 3);
      const firstPosition = boardPage === 1 ? 4 : (boardPage - 1) * PAGE_SIZE + 1;
      elements.boardList.replaceChildren(...boardRowsWithMilestones(remaining, allListings, firstPosition));
      elements.boardList.hidden = remaining.length === 0;
    }

    renderPagination(total, listings.length);

    if (elements.boardSummary) {
      elements.boardSummary.textContent = state.language === "zh"
        ? `${state.activeWindow === "today" ? "近 24 小时" : "全部时间"}榜单：${total} 个赞助产品。最高有效出价获得第 1 名。`
        : `${windowLabel()} board: ${total} sponsored listings. Highest valid bid takes #1.`;
    }
  }

  function featuredListingCard(listing, position, ranked, standard = false) {
    const card = createElement("article", `featured-listing${position <= 3 ? ` featured-${position}` : ""}${standard ? " standard-listing" : ""}`);
    card.dataset.rank = String(position);
    card.dataset.listingId = listing.id;
    card.setAttribute("role", "listitem");
    const minimum = boardSource !== "local" && remoteNextBid ? remoteNextBid : getBid((remoteLeader || ranked[0])) + 1;
    card.dataset.claimLabel = claimLabel(minimum);
    if (listing.id === changedListingId) card.classList.add("is-updated");

    const rank = createElement("div", "featured-rank", `#${position}`);
    const evidence = createElement("div", "featured-evidence");
    const bid = createElement("div", "featured-metric");
    bid.append(createElement("span", "", state.language === "zh" ? "出价" : "Bid"), createElement("strong", "", money(getBid(listing))));
    const bidStack = createElement("div", "featured-bid-stack");
    bidStack.append(bid, createShareControl(listing, position));
    const clicks = createElement("div", "featured-metric");
    const clickLabel = boardSource === "production"
      ? (listing.verified ? (state.language === "zh" ? "已验证点击" : "Verified clicks") : (state.language === "zh" ? "估算点击" : "Estimated clicks"))
      : (state.language === "zh" ? "示例点击" : "Sample clicks");
    clicks.append(createElement("span", "", clickLabel), createElement("strong", "", compact.format(getClicks(listing))));
    evidence.append(bidStack, clicks);

    card.id = `listing-${listing.id}`;
    card.append(rank, productIdentity(listing, "p"), evidence, createClaimControl(minimum));
    return card;
  }

  function renderLeader() {
    const leader = boardSource !== "local" && remoteLeader ? remoteLeader : rankedListings()[0];
    if (!leader) return;
    const leaderCategory = canonicalCategory(leader.category) || "Other";
    if (elements.categorySelect && categories.includes(leaderCategory)) {
      elements.categorySelect.value = leaderCategory;
    }
    const nextPrice = boardSource === "local" || !remoteNextBid ? getBid(leader) + 1 : remoteNextBid;

    if (elements.heroPrice) elements.heroPrice.textContent = money(nextPrice);
    if (elements.heroContext) {
      elements.heroContext.textContent = state.language === "zh"
        ? `${money(nextPrice)} 即可登上${state.category === DEFAULT_CATEGORY ? (state.activeWindow === "today" ? "近 24 小时" : "全部时间") : categoryName(state.category, "zh")}榜第 1 名。有人出价更高前，你的产品介绍会持续展示。`
        : `${money(nextPrice)} takes #1 on the ${state.category === DEFAULT_CATEGORY ? windowLabel().toLowerCase() : categoryName(state.category)} board. Your product story stays visible until someone pays more.`;
    }
    if (elements.leaderBid) elements.leaderBid.textContent = money(getBid(leader));
    if (elements.leaderClicks) elements.leaderClicks.textContent = compact.format(getClicks(leader));
    if (elements.leaderCategory) elements.leaderCategory.textContent = categoryName(leader.category);
    if (elements.currentLeader) elements.currentLeader.replaceChildren(productIdentity(leader));
    if (elements.inlineBid) {
      elements.inlineBid.min = String(nextPrice);
      elements.inlineBid.value = String(nextPrice);
    }
  }

  function activityTime(item) {
    if (state.language === "zh" && item.timeZh) return item.timeZh;
    if (state.language !== "zh" && item.timeEn) return item.timeEn;
    const timestamp = Date.parse(item.created_at || item.createdAt || "");
    if (Number.isFinite(timestamp)) {
      const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
      if (state.language === "zh") {
        if (minutes < 1) return "刚刚";
        if (minutes < 60) return `${minutes} 分钟前`;
        if (minutes < 1440) return `${Math.floor(minutes / 60)} 小时前`;
        return `${Math.floor(minutes / 1440)} 天前`;
      }
      if (minutes < 1) return "Just now";
      if (minutes < 60) return `${minutes}m ago`;
      if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
      return `${Math.floor(minutes / 1440)}d ago`;
    }
    if (state.language === "zh") return item.time === "just now" ? "刚刚" : item.time || "刚刚";
    return item.time || "Just now";
  }

  function activityListing(item) {
    const id = String(item.listingId || item.listing_id || "");
    const name = String(item.listingName || item.listing_name || "A listing");
    const existing = state.listings.find((listing) => listing.id === id || listing.name === name);
    if (existing) return existing;
    return {
      id,
      name,
      mark: name.split(/\s+/).map((part) => part[0]).join("").slice(0, 3).toUpperCase() || "RK",
      url: String(item.listingUrl || item.listing_url || ""),
      iconUrl: String(item.iconUrl || item.icon_url || ""),
    };
  }

  function activityMark(listing) {
    const mark = createElement("span", "activity-mark");
    mark.setAttribute("aria-hidden", "true");
    mark.append(createElement("span", "activity-initials", listing.mark));
    const sources = faviconCandidates(listing);
    if (!sources.length) return mark;
    const icon = document.createElement("img");
    icon.alt = "";
    icon.decoding = "async";
    icon.referrerPolicy = "no-referrer";
    let sourceIndex = 0;
    const tryNextSource = () => {
      if (sourceIndex >= sources.length) return icon.remove();
      icon.src = sources[sourceIndex++];
    };
    icon.addEventListener("load", () => mark.classList.add("has-icon"), { once: true });
    icon.addEventListener("error", tryNextSource);
    tryNextSource();
    mark.append(icon);
    return mark;
  }

  function activityPresentation(item) {
    const chinese = state.language === "zh";
    const displacedName = String(item.displacedName || item.displaced_name || "");
    const displacedBy = String(item.displacedBy || item.displaced_by || "");
    const amountValue = Number(item.amount ?? item.amount_minor / 100);
    const deltaValue = Number(item.delta ?? item.delta_minor / 100);
    const amount = Number.isFinite(amountValue) ? amountValue : 0;
    const delta = Number.isFinite(deltaValue) ? deltaValue : 0;
    const rank = Number(item.rank);
    const type = String(item.type || "joined").replace("topped_up", "topup");

    if (type === "topup" || type === "defended") {
      return { type: "topup", action: chinese ? "加价" : "Raised bid", context: chinese ? `最新总价 ${money(amount)}` : `Now at ${money(amount)}`, metric: delta > 0 ? `+${money(delta)}` : money(amount), metricLabel: chinese ? "增加金额" : "Added", rank };
    }
    if (type === "won" || type === "outbid" || type === "challenge") {
      const isDisplaced = type === "outbid" && displacedBy;
      return {
        type: isDisplaced ? "outbid" : "won",
        action: isDisplaced
          ? (chinese ? "排名下滑" : "Lost rank")
          : (chinese ? (rank === 1 ? "抢下第 1" : "升榜") : (rank === 1 ? "Took #1" : "Moved up")),
        context: isDisplaced ? (chinese ? `被 ${displacedBy} 超越` : `Passed by ${displacedBy}`) : displacedName ? (chinese ? `超越 ${displacedName}` : `Passed ${displacedName}`) : (chinese ? "排名上升" : "Moved up"),
        metric: isDisplaced ? displacedBy : delta > 0 ? `+${money(delta)}` : money(amount),
        metricLabel: isDisplaced ? (chinese ? "胜出者" : "Passed by") : (chinese ? "增加金额" : "Added"),
        rank,
      };
    }
    return { type: "joined", action: chinese ? "进场" : "Entered", context: chinese ? `以 ${money(amount)} 首次上榜` : `Opened at ${money(amount)}`, metric: money(amount), metricLabel: chinese ? "首次出价" : "Opening bid", rank };
  }

  function activityRow(item, index, duplicate = false) {
    const listing = activityListing(item);
    const presentation = activityPresentation(item);
    const shouldAnimate = !duplicate && index === 0 && String(item.id || "") === pendingActivityAnimationId;
    const row = createElement("li", `activity-event activity-${presentation.type}${shouldAnimate ? " is-latest" : ""}`);
    row.dataset.eventId = String(item.id || "");
    if (duplicate) {
      row.classList.add("is-duplicate");
      row.setAttribute("aria-hidden", "true");
    }
    const identity = createElement("div", "activity-identity");
    const name = listing.id ? createElement("a", "activity-name", listing.name) : createElement("strong", "activity-name", listing.name);
    if (name instanceof HTMLAnchorElement) {
      name.href = listingDetailsHref(listing);
      if (duplicate) name.tabIndex = -1;
    }
    identity.append(name, createElement("span", "activity-context", presentation.context));
    const action = createElement("span", `activity-action activity-action-${presentation.type}`, presentation.action);
    const metric = createElement("div", "activity-metric");
    metric.append(createElement("strong", "", presentation.metric), createElement("span", "", presentation.metricLabel));
    const rank = createElement("div", "activity-rank");
    rank.append(createElement("strong", "", Number.isFinite(presentation.rank) && presentation.rank > 0 ? `#${presentation.rank}` : "—"), createElement("span", "", state.language === "zh" ? "当前排名" : "New rank"));
    const time = createElement("time", "activity-time", activityTime(item));
    if (item.created_at || item.createdAt) time.dateTime = item.created_at || item.createdAt;
    const bidNow = createElement("a", "activity-bid-now", state.language === "zh" ? "立即出价 →" : "Bid now →");
    bidNow.href = "#claim";
    if (duplicate) bidNow.tabIndex = -1;
    row.append(activityMark(listing), identity, action, metric, rank, time, bidNow);
    return row;
  }

  function todayRankingRow(listing, position) {
    const item = createElement("li", "today-ranking-item");
    const rank = createElement("span", "today-ranking-position", `#${position}`);
    rank.setAttribute("aria-label", `Today rank ${position}`);
    const identity = productIdentity(listing);
    const bid = createElement("strong", "today-ranking-bid", money(getBid(listing, "today")));
    const clicks = createElement("span", "today-ranking-clicks", `${compact.format(getClicks(listing, "today"))} ${state.language === "zh" ? "次点击" : "clicks"}`);
    const proof = createElement("div", "today-ranking-proof");
    proof.append(bid, clicks);
    item.append(rank, identity, proof);
    return item;
  }

  function renderSidebar() {
    const todayListings = rankedListings(visibleListings(), "today").slice(0, 3);
    if (elements.todayRankingList) {
      if (!todayListings.length) {
        const empty = createElement("li", "today-ranking-empty", state.language === "zh" ? "暂无今日排名。" : "No activity has ranked today yet.");
        elements.todayRankingList.replaceChildren(empty);
      } else {
        elements.todayRankingList.replaceChildren(...todayListings.map((listing, index) => todayRankingRow(listing, index + 1)));
      }
    }

    if (elements.activityList) {
      const activity = state.activity.slice(0, 10);
      elements.activityList.classList.toggle("is-empty", activity.length === 0);
      if (!activity.length) {
        const empty = createElement("li", "activity-empty");
        empty.append(
          createElement("strong", "", state.language === "zh" ? "等待首个已验证挑战" : "Waiting for the first settled challenge"),
          createElement("span", "", state.language === "zh" ? "付款确认后的排名变化会显示在这里。" : "Settled rank changes will appear here."),
        );
        elements.activityList.replaceChildren(empty);
      } else {
        const primary = activity.map((item, index) => activityRow(item, index));
        const duplicate = activity.map((item, index) => activityRow(item, index, true));
        elements.activityList.style.setProperty("--ticker-duration", `${Math.max(26, activity.length * 6)}s`);
        elements.activityList.replaceChildren(...primary, ...duplicate);
      }
      pendingActivityAnimationId = "";
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
      const today = button.dataset.boardWindow === "today";
      button.textContent = state.language === "zh" ? (today ? "近 24 小时" : "全部时间") : (today ? "Past 24h" : "All-time");
    });
  }

  function updateCategorySelect() {
    if (!elements.categorySelect) return;
    const selected = elements.categorySelect.value;
    elements.categorySelect.replaceChildren(
      new Option(languageText("chooseMarket"), ""),
      ...categories.map((category) => new Option(categoryName(category), category)),
    );
    if (state.category === DEFAULT_CATEGORY) {
      elements.categorySelect.value = "";
      return;
    }
    elements.categorySelect.value = categories.includes(state.category) ? state.category : canonicalCategory(selected);
  }

  function renderTheme() {
    elements.root.dataset.theme = state.theme === "light" ? "light" : "dark";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", state.theme === "light" ? "#faf7f5" : "#090a0c");
    if (elements.themeToggle) {
      elements.themeToggle.textContent = state.theme === "dark" ? "Light" : "Dark";
      elements.themeToggle.setAttribute("aria-pressed", String(state.theme === "dark"));
      elements.themeToggle.setAttribute("aria-label", `Switch to ${state.theme === "dark" ? "light" : "dark"} theme`);
    }
  }

  function render() {
    renderLanguage();
    renderTheme();
    updateWindowButtons();
    updateCategorySelect();
    renderCategories();
    renderBoard();
    renderLeader();
    renderSidebar();
    renderTotals();
    updateBoardSourceLabels();
    window.dispatchEvent(new CustomEvent("rankoff:content-updated"));
  }

  function updateBidPreview() {
    if (!elements.bidAmount || !activeBid) return;
    const amount = Number(elements.bidAmount.value);
    const minimum = minimumForActiveBid();
    if (!Number.isSafeInteger(amount) || amount < minimum || amount > MAX_BID) return;
    const rank = projectedRank(amount);
    const listing = activeBid.type === "new"
      ? pendingChallenge
      : state.listings.find((item) => item.id === activeBid.listingId);
    const category = canonicalCategory(listing?.category) || state.category;
    if (elements.dialogRank) elements.dialogRank.textContent = `#${rank}`;
    if (elements.dialogPrice) elements.dialogPrice.textContent = money(amount);
    if (elements.dialogContext) elements.dialogContext.textContent = `${checkoutBoardLabel()} · ${categoryName(category)}`;
    if (elements.dialogExplanation) elements.dialogExplanation.textContent = state.language === "zh"
      ? `付款确认后，${listing?.name || "你的条目"}将在${checkoutBoardLabel()}获得第 ${rank} 名。其他人仍可出价取得更高排名。`
      : `After payment confirms, ${listing?.name || "your listing"} will take #${rank} on the ${checkoutBoardLabel().toLowerCase()}. Someone else can still claim a higher rank.`;
  }

  function openBidDialog(trigger, listingId = null) {
    if (!elements.dialog || !elements.bidForm || !elements.bidAmount) return;
    activeBid = listingId ? { type: "listing", listingId } : { type: "new" };
    lastTrigger = trigger;
    elements.bidForm.reset();

    const min = minimumForActiveBid();
    elements.bidAmount.value = String(Math.max(min, Number(elements.inlineBid?.value) || min));
    updateBidPreview();

    if (typeof elements.dialog.showModal === "function") {
      if (!elements.dialog.open) elements.dialog.showModal();
    } else {
      elements.dialog.setAttribute("open", "");
    }

    window.requestAnimationFrame(() => elements.bidAgree?.focus());
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
    const before = rankedListings();
    const previousLeader = before[0] || null;
    let previousListing = activeBid?.type === "listing"
      ? state.listings.find((item) => item.id === activeBid.listingId)
      : null;
    if (!previousListing && pendingChallenge) {
      previousListing = state.listings.find((item) => {
        try { return new URL(item.url).hostname === pendingChallenge.url.hostname; }
        catch { return false; }
      });
    }
    const previousRank = previousListing ? before.findIndex((item) => item.id === previousListing.id) + 1 : 0;
    const previousAmount = previousListing ? getBid(previousListing) : 0;
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
    const after = rankedListings();
    const rank = after.findIndex((item) => item.id === listing.id) + 1;
    const displaced = rank === 1 && previousLeader && previousLeader.id !== listing.id ? previousLeader : null;
    const eventTime = Date.now();
    const events = [{
      id: `local-${eventTime}`,
      type: previousRank === 0 ? "joined" : rank < previousRank ? "won" : "topup",
      timeEn: "Just now",
      timeZh: "刚刚",
      listingId: listing.id,
      listingName: listing.name,
      displacedName: displaced?.name || "",
      delta: Math.max(0, amount - previousAmount),
      amount,
      rank,
      board: state.activeWindow,
    }];
    if (displaced) {
      events.push({
        id: `local-${eventTime}-outbid`,
        type: "outbid",
        timeEn: "Just now",
        timeZh: "刚刚",
        listingId: displaced.id,
        listingName: displaced.name,
        displacedBy: listing.name,
        rank: after.findIndex((item) => item.id === displaced.id) + 1,
        board: state.activeWindow,
      });
    }
    state.activity.unshift(...events);
    state.activity = state.activity.slice(0, 20);
    pendingActivityAnimationId = events[0].id;
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
    if (rank < 1) return;
    const nextPrice = rankedListings().length ? getBid(rankedListings()[0]) + 1 : 1;
    const preview = boardSource === "production" ? "" : (state.language === "zh" ? "预览：" : "Preview: ");
    const text = state.language === "zh"
      ? `${preview}${listing.name} 以 ${money(getBid(listing))} 的赞助出价位居 RANKOFF ${windowLabel()}榜第 ${rank} 名。你能超越它吗？${money(nextPrice)} 起认领第 1 名。`
      : `${preview}${listing.name} holds #${rank} on RANKOFF's ${windowLabel().toLowerCase()} board with a ${money(getBid(listing))} sponsored bid. Think you can outrank it? Claim #1 from ${money(nextPrice)}.`;
    const url = new URL(window.location.href);
    url.searchParams.delete("checkout");
    url.searchParams.delete("reset");
    url.searchParams.set("period", state.activeWindow);
    if (state.category === DEFAULT_CATEGORY) url.searchParams.delete("category");
    else url.searchParams.set("category", state.category);
    url.hash = `listing-${listing.id}`;

    const shareData = { title: state.language === "zh" ? `${listing.name} 的 RANKOFF 排名` : `${listing.name} on RANKOFF`, text, url: url.toString() };
    if (window.RankoffShare?.open) {
      window.RankoffShare.open({ ...shareData, language: state.language, onStatus: showToast });
      return;
    }
    const canUseShareSheet = typeof navigator.share === "function"
      && (typeof navigator.canShare !== "function" || navigator.canShare(shareData));
    if (canUseShareSheet) {
      try {
        await navigator.share(shareData);
        showToast(state.language === "zh" ? "已打开分享菜单。" : "Share sheet opened.", "success");
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }

    try {
      const copied = await copyText(`${text} ${url.toString()}`);
      showToast(
        copied
          ? (state.language === "zh" ? "排名战报与链接已复制。" : "Rank result and link copied.")
          : (state.language === "zh" ? "无法复制链接。" : "Unable to copy the link."),
        copied ? "success" : "error",
      );
    } catch {
      showToast(state.language === "zh" ? "无法复制链接。" : "Unable to copy the link.", "error");
    }
  }

  elements.categoryRail?.addEventListener("click", (event) => {
    const trigger = event.target instanceof Element ? event.target.closest("[data-category]") : null;
    if (!(trigger instanceof HTMLElement)) return;
    const selected = trigger.dataset.category || DEFAULT_CATEGORY;
    state.category = selected === DEFAULT_CATEGORY ? DEFAULT_CATEGORY : canonicalCategory(selected) || DEFAULT_CATEGORY;
    boardPage = 1;
    remotePagination = null;
    remoteLeader = null;
    saveState();
    render();
    void refreshBoardFromApi();
  });

  elements.categoryRail?.addEventListener("scroll", updateCategoryScrollControls, { passive: true });

  elements.categoryScrollButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!elements.categoryRail) return;
      const direction = Number(button.dataset.categoryScroll) || 1;
      const distance = Math.max(240, elements.categoryRail.clientWidth * 0.72);
      elements.categoryRail.scrollBy({ left: direction * distance, behavior: "smooth" });
    });
  });

  window.addEventListener("resize", updateCategoryScrollControls, { passive: true });

  elements.categorySelect?.addEventListener("change", (event) => {
    const value = event.currentTarget instanceof HTMLSelectElement ? event.currentTarget.value : categories[0];
    state.category = value === "" ? DEFAULT_CATEGORY : canonicalCategory(value) || DEFAULT_CATEGORY;
    boardPage = 1;
    remotePagination = null;
    remoteLeader = null;
    saveState();
    render();
    void refreshBoardFromApi();
  });

  elements.windowButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextWindow = button.dataset.boardWindow;
      if (nextWindow !== "all" && nextWindow !== "today") return;
      state.activeWindow = nextWindow;
      boardPage = 1;
      remotePagination = null;
      remoteLeader = null;
      saveState();
      render();
      void refreshBoardFromApi();
    });
  });

  elements.boardPageButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const direction = button.dataset.boardPage === "previous" ? -1 : 1;
      const total = boardSource !== "local" && remotePagination ? remotePagination.total : rankedListings().length;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      const nextPage = Math.min(totalPages, Math.max(1, boardPage + direction));
      if (nextPage === boardPage) return;

      const previousPage = boardPage;
      boardPage = nextPage;
      elements.boardPagination?.setAttribute("aria-busy", "true");
      elements.boardPageButtons.forEach((pageButton) => { pageButton.disabled = true; });

      if (boardSource === "local") {
        render();
      } else {
        const refreshed = await refreshBoardFromApi();
        if (!refreshed) {
          boardPage = previousPage;
          renderPagination(total, state.listings.length);
          showToast(state.language === "zh" ? "暂时无法载入下一页。" : "The next page could not be loaded yet.", "error");
        }
      }

      elements.boardPagination?.removeAttribute("aria-busy");
      document.querySelector("#board")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  elements.themeToggle?.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    saveState();
    renderTheme();
  });

  elements.languageToggle?.addEventListener("click", () => {
    state.language = state.language === "zh" ? "en" : "zh";
    saveState();
    render();
  });

  elements.panelToggles.forEach((button) => {
    button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") !== "false";
      button.setAttribute("aria-expanded", String(!expanded));
      updatePanelToggleLabels();
    });
  });

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const featured = target.closest(".featured-listing");
    if (featured instanceof HTMLElement && !(target.closest("a, button, input, select"))) {
      featured.querySelector("[data-prepare-challenge]")?.click();
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

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target || target.closest("a, button, input, select, textarea")) return;
    const card = target.closest(".featured-listing");
    if (!(card instanceof HTMLElement)) return;
    event.preventDefault();
    card.click();
  });

  elements.inlineChallenge?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!elements.inlineChallenge.reportValidity()) return;

    const formData = new FormData(elements.inlineChallenge);
    let parsedUrl;
    try {
      parsedUrl = parseProductUrl(formData.get("productUrl"));
    } catch {
      showToast(languageText("invalidWebsite"), "error");
      return;
    }

    const outranked = rankedListings()[0];
    const requiredCategory = outranked && canonicalCategory(outranked.category)
      ? canonicalCategory(outranked.category)
      : state.category !== DEFAULT_CATEGORY && categories.includes(state.category) ? state.category : "";
    const category = String(formData.get("productCategory") || "");
    if (!requiredCategory || category !== requiredCategory) {
      if (elements.categorySelect && requiredCategory) elements.categorySelect.value = requiredCategory;
      showToast(
        state.language === "zh"
          ? `挑战分类必须与${outranked?.name || "目标条目"}相同。`
          : `Choose ${requiredCategory ? categoryName(requiredCategory) : "the target listing’s category"} to match the listing you’ll outrank.`,
        "error",
      );
      return;
    }
    pendingChallenge = {
      url: parsedUrl,
      name: nameFromUrl(parsedUrl.toString()),
      category: requiredCategory,
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
          submitButton.textContent = state.language === "zh" ? "继续付款" : "Continue to checkout";
        }
      }
      return;
    }

    const result = applyBid(amount);
    if (!result) return;
    pendingChallenge = null;
    closeBidDialog({ restoreFocus: false });
    showToast(`${result.listing.name} is now #${result.rank} in this preview.`, "success");
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
