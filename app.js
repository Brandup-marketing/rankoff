(() => {
  "use strict";

  const STORE_KEY = "rankoff-mvp-demo-v3";
  const MAX_BID = 1_000_000;
  const PAGE_SIZE = 50;
  const DEFAULT_CATEGORY = "all";
  const BOARD_API_ENDPOINT = "./api/v1/board";
  // Keep in step with TERMS_VERSION in functions/_lib/config.js and the date printed on /legal.
  const TERMS_VERSION = "2026-08-30";
  // The demo board exists for opening index.html straight off disk. On a served
  // origin it must never render: for the moment before the API answers it put a
  // fake USD price on a page that sells in ringgit, and it overwrote the real
  // board the server had already written into the HTML.
  const servedFromWeb = /^https?:$/.test(window.location.protocol);

  const SOCIAL_PLATFORMS = ["instagram", "tiktok", "facebook", "x", "linktree", "youtube", "linkedin", "xiaohongshu"];
  // Which markets actually hold a listing, learned from the unfiltered board.
  let marketsWithListings = new Set();
  // The board the merchant is actually joining, which is their chosen market and
  // not whatever the visitor happens to be browsing. Rank and price both come
  // from here, so a market with nobody in it costs the floor and leads at #1.
  let chosenMarket = null;
  const categoryGroups = Object.freeze({ Creators: ["Creators", "Attention", "People", "AIMedia"], Property: ["Property", "RealEstate", "Travel"], Interior: ["Interior"], Beauty: ["Beauty"], Health: ["Health"], Sports: ["Sports"], Food: ["Food"], Marketing: ["Marketing", "SEO", "Social", "Sales", "Agencies"], Creative: ["Creative", "Design", "Writing", "Audio", "News"], Professional: ["Professional", "Business", "Careers", "Productivity"], Education: ["Education", "Training", "Academy"], Finance: ["Finance", "Insurance", "Banking", "Crypto"], Electronics: ["Electronics", "Repair"], Retail: ["Retail", "Ecommerce"], Construction: ["Construction", "Hardware"], Home: ["Home"], Automotive: ["Automotive", "Auto"], Other: ["Other", "Agents", "Developer", "Security", "Crypto", "Games", "Domains", "Discovery"] });
  const categories = Object.freeze(Object.keys(categoryGroups));
  const categoryAliases = Object.freeze(Object.entries(categoryGroups).reduce((aliases, [market, members]) => {
    aliases[market.toLowerCase()] = market;
    members.forEach((member) => { aliases[member.toLowerCase()] = market; });
    return aliases;
  }, {}));
  const categoryIcons = Object.freeze({ all: "▦", Creators: "✦", Property: "⌂", Interior: "▤", Beauty: "✿", Health: "✚", Sports: "◐", Food: "◍", Marketing: "↗", Creative: "✎", Professional: "◆", Education: "✎+", Finance: "◧", Electronics: "▣", Retail: "◇", Construction: "▦+", Home: "⚙", Automotive: "◎", Other: "•••" });
  const translations = {
    en: { navBoard: "Board", navCategories: "Categories", navAbout: "About", heroCopy: "Put your product in the spot people see first. Your listing stays at the top until someone pays more.", totalBid: "Your total bid", productUrl: "Website or public social profile", productUrlPlaceholder: "example.com or instagram.com/yourname", invalidWebsite: "Enter a website or a public profile address, such as example.com or instagram.com/yourname.", chooseMarket: "Choose a market", challengeCategory: "Challenge category", categoryRule: "Must match the listing you’ll outrank.", reviewBid: "Review your bid", markets: "Markets", liveLeaderboard: "Live leaderboard", boardSummary: "Highest total takes #1. Top up any time to move up.", todayRanking: "Today’s leaders", latestActivity: "Latest activity", liveUpdates: "Latest updates", howItWorks: "How ranking works", searchPlaceholder: "Search products and categories…", close: "Close", seeAll: "See all", past24: "Past 24h", livePulse: "Live bids", refresh: "Refresh", rank: "Rank", listing: "Listing", bid: "Bid", clicks: "Clicks", sponsored: "Sponsored", rules: "Every listing is paid advertising. The highest settled total ranks first \u2014 no prizes, no draws, and no element of chance.", position: "Position", positionCopy: "Held until another listing's settled total passes it.", charge: "Charge", chargeCopy: "One payment after review.", reporting: "Reporting", reportingCopy: "Clicks shown for the selected timeframe.", readRules: "Read all rules →", rulesLink: "Rules", terms: "Terms", termsOfService: "Terms of Service", privacyLink: "Privacy", payments: "Payments", footerCredit: "A Brandup Marketing product", confirmRank: "Confirm this rank", confirmRankIntro: "Check the rank and price, then agree to the Terms of Service to continue.", chanceDisclaimer: "This is a one-time fee for advertising placement \u2014 not a wager, deposit, or contest entry. There are no prizes and no element of chance.", rankLabel: "Rank", priceLabel: "Price", dueNow: "Due now", confirmationCopy: "Your listing goes live at this rank after payment confirms. Someone else can still claim a higher rank. This is a one-time fee for advertising placement \u2014 not a wager, deposit, or contest entry. There are no prizes and no element of chance.", agreeTermsPrefix: "I understand this is a paid sponsored placement for a public link. It gives me no ownership or editing rights over that account, and the listed party may request removal. I agree to the ", agreeTermsSuffix: ".", cancel: "Cancel", continueCheckout: "Continue to checkout" },
    zh: { navBoard: "榜单", navCategories: "分类", navAbout: "关于", heroCopy: "把产品放到最显眼的位置。只要没有更高的有效出价，你的介绍就会留在榜首。", totalBid: "你的总出价", productUrl: "网站或公开社交账号", productUrlPlaceholder: "example.com 或 instagram.com/yourname", invalidWebsite: "请输入网站或公开主页网址，例如 example.com 或 instagram.com/yourname。", chooseMarket: "选择市场", challengeCategory: "挑战类别", categoryRule: "必须与您要超越的条目类别相同。", reviewBid: "确认出价", markets: "市场", liveLeaderboard: "实时榜单", boardSummary: "累计出价最高者获得第 1 名。随时追加出价即可上升。", todayRanking: "今日领先", latestActivity: "最新动态", liveUpdates: "最新动态", howItWorks: "排名规则", searchPlaceholder: "搜索产品和分类…", close: "关闭", seeAll: "查看全部", past24: "近 24 小时", livePulse: "实时竞价", refresh: "刷新", rank: "排名", listing: "条目", bid: "出价", clicks: "点击", sponsored: "广告", rules: "每个条目都是付费广告。累计已结算付款最高者排名第一 —— 没有奖品、没有抽奖，也不涉及任何运气成分。", position: "排名位置", positionCopy: "保持到其他条目的累计出价超过为止。", charge: "费用", chargeCopy: "审核后一次性付款。", reporting: "数据", reportingCopy: "显示所选时间范围内的点击。", readRules: "查看完整规则 →", rulesLink: "规则", terms: "条款", termsOfService: "服务条款", privacyLink: "隐私", payments: "付款", footerCredit: "Brandup Marketing 出品", confirmRank: "确认此排名", confirmRankIntro: "核对排名与价格，同意《服务条款》后继续。", chanceDisclaimer: "此次收费是一次性的广告位置费用 —— 不是投注、押金或参赛费。没有奖品，也不涉及任何运气成分。", rankLabel: "排名", priceLabel: "价格", dueNow: "现在支付", confirmationCopy: "付款确认后，你的条目会以此排名上线。其他人仍可出价取得更高排名。此次收费是一次性的广告位置费用 —— 不是投注、押金或参赛费。没有奖品，也不涉及任何运气成分。", agreeTermsPrefix: "我了解这是为一个公开链接购买的赞助展示，付款不会获得该账号的所有权或编辑权，被展示方可要求下架。我同意《", agreeTermsSuffix: "》。", cancel: "取消", continueCheckout: "继续付款" },
  };
  const categoryLabels = { Creators: "Creators & Talent", Property: "Property & Agents", Interior: "Interior & Renovation", Beauty: "Beauty & Aesthetics", Health: "Health & Clinics", Sports: "Sports & Fitness", Food: "Food & Beverage", Marketing: "Marketing & Advertising", Creative: "Creative & Production", Professional: "Professional Services", Education: "Education & Training", Finance: "Finance & Insurance", Electronics: "Electronics & Repair", Retail: "Retail & Ecommerce", Construction: "Hardware & Construction", Home: "Home Services", Automotive: "Automotive", Other: "Other" };
  const categoryTranslations = { Creators: "创作者与艺人", Property: "房产与经纪", Interior: "室内设计与装修", Beauty: "美容与医美", Health: "健康与诊所", Sports: "运动与健身", Food: "餐饮", Marketing: "营销与广告", Creative: "创意与制作", Professional: "专业服务", Education: "教育与培训", Finance: "金融与保险", Electronics: "电子与维修", Retail: "零售与电商", Construction: "五金与建筑", Home: "家居服务", Automotive: "汽车", Other: "其他" };

  const boardCurrencyFormat = (code) => new Intl.NumberFormat(code === "MYR" ? "en-MY" : "en-US", { style: "currency", currency: code || "USD", maximumFractionDigits: 0 });
  let currency = boardCurrencyFormat("USD");
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
    pageLinks: document.querySelector("[data-page-links]"),
    boardRefresh: document.querySelector("[data-board-refresh]"),
    pageRange: document.querySelector("[data-page-range]"),
    pageTotal: document.querySelector("[data-page-total]"),
    boardSummary: document.querySelector("[data-board-summary]"),
    boardHeading: document.querySelector("[data-board-heading]"),
    measurementSummary: document.querySelector("[data-measurement-summary]"),
    measurementCopy: document.querySelector("[data-measurement-copy]"),
    categoryRail: document.querySelector("[data-category-rail]"),
    categoryScrollButtons: Array.from(document.querySelectorAll("[data-category-scroll]")),
    categorySelect: document.querySelector("[data-category-select]"),
    dialogTarget: document.querySelector("[data-dialog-target]"),
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
  // The board floor (RM1), kept separate from the price of #1. Ranking is
  // cumulative, so these are two different numbers and must never be conflated.
  let remoteMinIncrement = 1;
  // Once the buyer edits the amount we stop prefilling it, so a board refresh
  // can never silently replace the number they chose.
  let inlineBidTouched = false;
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
      listings: servedFromWeb ? [] : seedListings.map(cloneListing),
      activity: servedFromWeb ? [] : [...seedActivity],
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
      // A previous visit's demo listings are still demo listings.
      if (servedFromWeb) return { ...fallback, activeWindow: saved.activeWindow === "today" ? "today" : "all", theme: saved.theme === "light" ? "light" : "dark", language: saved.language === "zh" ? "zh" : "en" };
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
      mark: initialsFor(String(listing.hostname || ""), url, String(listing.title || "")),
      url,
      iconUrl: typeof listing.favicon_url === "string" ? listing.favicon_url : "",
      description: String(listing.description || "Sponsored listing on Rankoff.").slice(0, 240),
      category: String(listing.category || "Other"),
      identity: String(listing.hostname || ""),
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
      elements.boardState.lastChild.textContent = chinese ? " 实时榜单" : " Live board";
    }
    if (elements.boardHeading) elements.boardHeading.textContent = chinese ? "实时广告榜单" : "Live sponsored leaderboard";
    if (elements.liveDot) elements.liveDot.hidden = !production;
    if (elements.measurementSummary) {
      elements.measurementSummary.textContent = chinese ? "点击如何统计" : "How clicks are measured";
      elements.measurementSummary.parentElement.hidden = !production;
    }
    if (elements.measurementCopy) elements.measurementCopy.textContent = chinese
      ? "已验证点击来自所选时间范围内的第一方跳转记录。"
      : "Verified clicks represent first-party redirect events for the selected timeframe.";
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
      if (state.category === DEFAULT_CATEGORY && boardPage === 1) {
        marketsWithListings = new Set(state.listings.map((listing) => canonicalCategory(listing.category)).filter(Boolean));
      }
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
      remoteMinIncrement = dollarsFromMinor(payload.board?.min_increment_minor, 1);
      currency = boardCurrencyFormat(remoteCurrency);
      const symbolNode = document.querySelector("[data-currency-symbol]");
      if (symbolNode) symbolNode.textContent = remoteCurrency === "MYR" ? "RM" : "$";
      render();
      if (boardSource === "production" && !boardViewSent) {
        boardViewSent = true;
        void recordBoardView();
      }
      void mergeCounterpartClicks();
      return true;
    } catch {
      /* Static preview and offline use intentionally fall back to the local board. */
      return false;
    }
  }

  async function mergeCounterpartClicks() {
    if (!/^https?:$/.test(window.location.protocol)) return;
    if (boardSource !== "production") return;
    const counterpart = state.activeWindow === "today" ? "all" : "today";
    const requestId = remoteRequestId;
    const endpoint = new URL(BOARD_API_ENDPOINT, window.location.href);
    endpoint.searchParams.set("board", "global");
    endpoint.searchParams.set("category", state.category);
    endpoint.searchParams.set("period", counterpart);
    endpoint.searchParams.set("limit", String(PAGE_SIZE));
    endpoint.searchParams.set("page", String(boardPage));

    try {
      const response = await fetch(endpoint, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      if (requestId !== remoteRequestId || !Array.isArray(payload?.rankings)) return;
      const counts = new Map(payload.rankings.map((entry) => [String(entry?.listing?.id || ""), normalizedClickCount(entry?.clicks)]));
      const field = counterpart === "today" ? "todayClicks" : "clicks";
      let changed = false;
      for (const listing of state.listings) {
        const count = counts.get(listing.id);
        if (count === undefined || listing[field] === count) continue;
        listing[field] = count;
        changed = true;
      }
      if (changed) render();
    } catch {
      /* The visible period already rendered; the counterpart figure stays as it was. */
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
    // A real, always-visible pill: the ONLY bid entry point on the card.
    const control = createElement("button", "claim-rank-pill", claimLabel(amount));
    control.type = "button";
    control.dataset.prepareChallenge = String(amount);
    return control;
  }

  function createVisitOverlay(listing, position) {
    // The rest of the card is the ad: anywhere you click goes to the buyer's
    // site through the tracked redirect. Inner links sit above this layer.
    const overlay = createElement("a", "card-visit-overlay");
    overlay.href = listingVisitHref(listing, position);
    overlay.target = "_blank";
    overlay.rel = "noopener nofollow sponsored";
    overlay.setAttribute("aria-label", state.language === "zh" ? `访问 ${listing.name} 的网站` : `Visit ${listing.name}'s website`);
    return overlay;
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

  // "instagram.com" would stamp the same letter on every profile, so an account
  // takes its initials from its name instead.
  function initialsFor(identity, url, title) {
    const split = identity.indexOf(":");
    const platform = split > 0 ? identity.slice(0, split) : "";
    if (SOCIAL_PLATFORMS.includes(platform)) {
      const fromTitle = String(title).trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 3).toUpperCase();
      if (fromTitle) return fromTitle;
      return identity.slice(split + 1).slice(0, 3).toUpperCase() || "YOU";
    }
    return initialsFromUrl(url);
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

  // The two mistakes a real merchant makes: typing a handle on its own, and
  // pasting a post instead of the profile. Both deserve an answer in their language.
  function submissionError(error) {
    const chinese = state.language === "zh";
    if (error?.code === "unknown_tld") {
      return chinese
        ? "这不是一个网址。如果是 Instagram、Facebook 或 TikTok 账号，请贴上完整主页链接，例如 instagram.com/yourname。"
        : error.message;
    }
    if (error?.code === "profile_required") {
      return chinese
        ? "请贴上主页链接，而不是某一则贴文、Reel、限时动态或群组。"
        : error.message;
    }
    return error?.message || (chinese ? "此网址无法上榜，未产生任何费用。" : "This website could not be listed. No payment was made.");
  }

  const CHAT_HOSTS = ["wa.me", "api.whatsapp.com", "chat.whatsapp.com", "whatsapp.com", "t.me", "telegram.me", "telegram.dog"];
  const one = (s) => (s.length === 1 ? s[0] : "");
  const prefixed = (allowed) => (s) => (s.length === 2 && allowed.includes(s[0]) ? `${s[0]}-${s[1]}` : "");

  // Mirrors functions/_lib/platform.js so a post, a chat link or a video is
  // refused while the merchant is typing, not after the button that costs money.
  const SOCIAL_HOSTS = {
    "instagram.com": { label: "Instagram", extract: one, reject: ["p", "reel", "reels", "stories", "tv", "explore"] },
    "instagr.am": { label: "Instagram", extract: one, reject: ["p", "reel", "reels", "stories", "tv", "explore"] },
    "tiktok.com": { label: "TikTok", extract: one, reject: ["video", "tag", "music", "discover", "live"] },
    "facebook.com": { label: "Facebook Page", extract: one, reject: ["profile.php", "groups", "posts", "reel", "reels", "stories", "watch", "photo", "events"] },
    "fb.com": { label: "Facebook Page", extract: one, reject: ["profile.php", "groups", "posts", "reel", "reels", "stories", "watch", "photo", "events"] },
    "x.com": { label: "X", extract: one, reject: ["status", "i", "search"] },
    "twitter.com": { label: "X", extract: one, reject: ["status", "i", "search"] },
    "linktr.ee": { label: "Linktree", extract: one, reject: ["s", "admin", "login", "register", "discover"] },
    "youtube.com": { label: "YouTube", extract: (s) => (s.length === 1 ? s[0] : prefixed(["c", "user", "channel"])(s)), reject: ["watch", "shorts", "playlist", "results", "feed", "live"] },
    "linkedin.com": { label: "LinkedIn", extract: prefixed(["in", "company", "school", "showcase"]), reject: ["feed", "posts", "pulse", "jobs"] },
    "xiaohongshu.com": { label: "小红书", extract: (s) => (s.length === 3 && s[0] === "user" && s[1] === "profile" ? s[2] : ""), reject: ["explore", "discovery"] },
  };

  function socialTarget(url) {
    const host = url.hostname.toLowerCase().replace(/^(?:www|m|mobile|web)\./, "");
    if (CHAT_HOSTS.includes(host)) return { chat: true, label: "WhatsApp / Telegram", handle: "" };
    const platform = SOCIAL_HOSTS[host];
    if (!platform) return null;
    const segments = url.pathname.split("/").filter(Boolean)
      .map((segment) => decodeURIComponent(segment).replace(/^@/, "").toLowerCase());
    const first = segments[0] || "";
    const handle = platform.reject.includes(first) ? "" : platform.extract(segments);
    const usable = handle && /^[a-z0-9](?:[a-z0-9._-]{0,58}[a-z0-9])?$/.test(handle);
    return { ...platform, handle: usable ? handle : "" };
  }

  function parseProductUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) throw new TypeError("A product URL is required.");
    // A bare @handle does not say which platform, and guessing one lists the
    // wrong account. Ask for the address the merchant can copy from the app.
    if (raw.startsWith("@")) throw new TypeError("A full profile address is required.");
    const parsed = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!/^https?:$/.test(parsed.protocol) || !parsed.hostname) throw new TypeError("Only web URLs are supported.");
    return parsed;
  }

  function faviconCandidates(listing) {
    // instagram.com/favicon.ico is Instagram's logo, identical on every profile.
    if (listingPlatform(listing)) return listing.iconUrl ? [listing.iconUrl] : [];
    try {
      const url = new URL(listing.url);
      if (url.hostname.endsWith(".example") && !listing.iconUrl) return [];
      // favicon.ico is 16-32px and turns to mush at card size. The touch icon and
      // Google's service both serve ~128-180px, so the mark stays sharp.
      const sharp = [
        `${url.origin}/apple-touch-icon.png`,
        `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url.hostname)}&sz=128`,
      ];
      const direct = `${url.origin}/favicon.ico`;
      const fallback = `https://icons.duckduckgo.com/ip3/${encodeURIComponent(url.hostname)}.ico`;
      return [...new Set([...sharp, listing.iconUrl, direct, fallback].filter(Boolean))];
    } catch {
      return listing.iconUrl ? [listing.iconUrl] : [];
    }
  }

  function listingVisitHref(listing, position = null) {
    if (boardSource !== "production") return listing.url;
    const go = new URL(`./go/${listing.id}`, window.location.href);
    if (Number.isSafeInteger(position) && position > 0) go.searchParams.set("rank", String(position));
    if (remoteSnapshotId) go.searchParams.set("snapshot", remoteSnapshotId);
    return go.toString();
  }

  function listingLink(listing, position = null) {
    // The name is the row's biggest click target, and the buyer paid for
    // traffic: it goes straight to their site through the tracked redirect.
    // Ranking evidence stays one click away behind "See details".
    const link = createElement("a", "product-name", listing.name);
    link.href = listingVisitHref(listing, position);
    link.target = "_blank";
    link.rel = "noopener nofollow sponsored";
    link.setAttribute("aria-label", state.language === "zh" ? `访问 ${listing.name} 的网站` : `Visit ${listing.name}'s website`);
    return link;
  }

  function listingDetailsHref(listing) {
    // Permanent, shareable address for a live listing; the id form still redirects here.
    const path = listingDetailPath(listing);
    if (path) return new URL(path, window.location.origin).toString();
    const detail = new URL("./listing.html", window.location.href);
    detail.searchParams.set("id", listing.id);
    return detail.toString();
  }

  // Mirrors functions/_lib/platform.js: a social account is addressed by its
  // platform and handle, a website by its hostname.
  function listingDetailPath(listing) {
    if (listing?.isDemo) return "";
    const identity = String(listing?.identity || "");
    const split = identity.indexOf(":");
    if (split > 0) {
      const platform = identity.slice(0, split);
      const handle = identity.slice(split + 1);
      if (SOCIAL_PLATFORMS.includes(platform) && /^[a-z0-9](?:[a-z0-9._-]{0,58}[a-z0-9])?$/.test(handle)) {
        return `/profile/${platform}/${handle}`;
      }
      return "";
    }
    return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(identity) ? `/product/${identity}` : "";
  }

  function listingPlatform(listing) {
    const identity = String(listing?.identity || "");
    const split = identity.indexOf(":");
    const platform = split > 0 ? identity.slice(0, split) : "";
    return SOCIAL_PLATFORMS.includes(platform) ? platform : "";
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
    // "instagram.com" reads the same on every profile; the handle is the address.
    try {
      const url = new URL(listing.url);
      const host = url.hostname.replace(/^(?:www|m)\./, "");
      if (listingPlatform(listing)) return `${host}${url.pathname.replace(/\/+$/, "")}`;
      return host;
    } catch {
      return "rankoff.my";
    }
  }

  function productIdentity(listing, descriptionTag = "p", position = null) {
    const wrapper = createElement("div", "product-cell");
    const markLink = createElement("a", "product-mark-link");
    markLink.href = listingVisitHref(listing, position);
    markLink.target = "_blank";
    markLink.rel = "noopener nofollow sponsored";
    markLink.setAttribute("aria-label", state.language === "zh" ? `访问 ${listing.name} 的网站` : `Visit ${listing.name}'s website`);
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
    const clickLabel = listing.verified ? (chinese ? "已验证点击" : "Verified clicks") : (chinese ? "推荐点击" : "Referral clicks");
    meta.append(
      createElement("span", "sponsored-chip", chinese ? "广告" : "Sponsored"),
      createElement("span", "meta-item category-meta", categoryName(listing.category)),
      createElement("span", "meta-item", ageLabel),
      createElement("span", "meta-item", listingHostLabel(listing)),
    );
    if (production) {
      meta.append(createElement("span", "meta-item listing-clicks", `${compact.format(getClicks(listing))} ${chinese ? "次点击" : "clicks"}`));
      meta.append(createElement("span", listing.verified ? "verified-chip" : "estimated-chip", clickLabel));
    }
    // One-click visit, outbid-style — but through the tracked /go redirect so
    // the click still lands in the listing's verified-clicks count.
    const visit = createElement("a", "listing-visit", chinese ? "访问网站 ↗" : "Visit ↗");
    visit.href = listingVisitHref(listing, position);
    visit.target = "_blank";
    visit.rel = "noopener nofollow sponsored";
    visit.setAttribute("aria-label", chinese ? `访问 ${listing.name} 的网站` : `Visit ${listing.name}'s website`);
    meta.append(visit);
    const details = createElement("a", "listing-details", chinese ? "查看详情" : "See details");
    details.href = listingDetailsHref(listing);
    details.setAttribute("aria-label", chinese ? `查看 ${listing.name} 的详细信息` : `See details for ${listing.name}`);
    meta.append(details);
    if (listing.isDemo) meta.append(createElement("span", "local-chip", "Local"));

    const description = createElement(descriptionTag, "listing-description", listing.description);
    copy.append(listingLink(listing, position), description, meta);
    markLink.append(mark);
    wrapper.append(markLink, copy);
    return wrapper;
  }

  function getMinimumForPosition(position, ranked = rankedListings()) {
    if (!ranked.length) return 1;
    const index = Math.max(0, position - 1);
    if (index <= 0) return getBid(ranked[0]) + 1;
    return getBid(ranked[index - 1]) + 1;
  }

  document.addEventListener("input", (event) => {
    if (event.target === elements.inlineBid) inlineBidTouched = true;
  });

  /**
   * A returning customer tops up through the same hero form, so a submission
   * whose URL already sits on the board is a top-up, not a new listing.
   * startLiveCheckout matches on hostname the same way, so the rank we preview
   * has to add to that listing's settled total instead of standing alone.
   */
  function existingListingForPending() {
    if (!pendingChallenge?.url) return null;
    return state.listings.find((item) => {
      try {
        return new URL(item.url).hostname === pendingChallenge.url.hostname;
      } catch {
        return false;
      }
    }) || null;
  }

  /**
   * The lowest payment the board accepts. Any amount at or above this is a
   * valid top-up — it simply lands at a lower rank. The server agrees
   * (loadMinimumBid returns the board increment), so this must NOT be the
   * price of #1.
   */
  function boardMinimum() {
    return boardSource === "local" ? 1 : Math.max(1, remoteMinIncrement);
  }

  /** Suggested amount to take the next rank up. A default, never a gate. */
  function suggestedBidForNextRank() {
    const ranked = rankedListings();
    if (!ranked.length) return boardMinimum();
    if (activeBid?.type === "new") {
      const existing = existingListingForPending();
      const leader = ranked[0];
      if (existing && leader && existing.id !== leader.id) {
        return Math.max(boardMinimum(), getBid(leader) - getBid(existing) + boardMinimum());
      }
      if (existing && leader && existing.id === leader.id) return boardMinimum();
      return getBid(leader) + boardMinimum();
    }

    const listing = state.listings.find((item) => item.id === activeBid?.listingId);
    if (!listing) return getBid(ranked[0]) + 1;
    const index = ranked.findIndex((item) => item.id === listing.id);
    // A top-up ADDS to this listing's existing total, so the suggestion is the
    // gap to close — not the rival's total. Suggesting the rival's total
    // overcharged every returning customer by everything they had already paid.
    if (index <= 0) return boardMinimum();
    const gap = getBid(ranked[index - 1]) - getBid(listing) + boardMinimum();
    return Math.max(boardMinimum(), gap);
  }

  async function loadChosenMarket(category) {
    chosenMarket = null;
    if (!categories.includes(category) || !/^https?:$/.test(window.location.protocol)) return;
    const endpoint = new URL(BOARD_API_ENDPOINT, window.location.href);
    endpoint.searchParams.set("board", "global");
    endpoint.searchParams.set("category", category);
    endpoint.searchParams.set("period", state.activeWindow);
    endpoint.searchParams.set("limit", String(PAGE_SIZE));
    try {
      const response = await fetch(endpoint, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      if (payload?.mode !== "production" || !Array.isArray(payload.rankings)) return;
      chosenMarket = {
        category,
        totals: payload.rankings.map((entry) => Math.ceil(Number(entry.bid?.amount_minor || 0) / 100)),
        nextBid: dollarsFromMinor(payload.next_bid_minor, null),
      };
    } catch {
      /* Falling back to the visible board is still a truthful projection. */
    }
    render();
  }

  function projectedRank(amount) {
    const ranked = rankedListings();
    if (activeBid?.type === "new") {
      const existing = existingListingForPending();
      const total = existing ? getBid(existing) + amount : amount;
      if (chosenMarket && chosenMarket.category === pendingChallenge?.category && !existing) {
        return chosenMarket.totals.filter((value) => value > total).length + 1;
      }
      return ranked.filter((listing) => listing.id !== existing?.id && getBid(listing) > total).length + 1;
    }

    const listing = state.listings.find((item) => item.id === activeBid?.listingId);
    if (!listing) return null;
    // Cumulative: this payment adds to whatever the listing has already
    // settled. Replacing the total instead of adding to it projected the wrong
    // rank for every repeat customer.
    const projectedTotal = getBid(listing) + amount;
    const projected = ranked.map((item) =>
      item.id === listing.id
        ? { ...item, bids: { ...item.bids, [state.activeWindow]: projectedTotal } }
        : item,
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
      ? { Creators: "创作者", Property: "房产", Interior: "室内装修", Beauty: "美容", Health: "健康诊所", Sports: "运动健身", Food: "餐饮", Marketing: "营销", Creative: "创意制作", Professional: "专业服务", Education: "教育与培训", Finance: "金融与保险", Electronics: "电子与维修", Retail: "零售电商", Construction: "五金建筑", Home: "家居服务", Automotive: "汽车", Other: "其他" }
      : { Creators: "Creators", Property: "Property", Interior: "Interior", Beauty: "Beauty", Health: "Health", Sports: "Sports", Food: "Food", Marketing: "Marketing", Creative: "Creative", Professional: "Professional", Education: "Education", Finance: "Finance", Electronics: "Electronics", Retail: "Retail", Construction: "Hardware", Home: "Home", Automotive: "Automotive", Other: "Other" };
    // Markets holding a listing come first: a visitor should meet a board with
    // something on it, while an empty market stays one scroll away for whoever
    // wants to take its first place.
    const ordered = [...categories].sort((left, right) => Number(marketsWithListings.has(right)) - Number(marketsWithListings.has(left)));
    const buttons = [{ label: state.language === "zh" ? "全部" : "All", value: DEFAULT_CATEGORY }, ...ordered.map((category) => ({ label: shortLabels[category], value: category }))];
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
    if (elements.pageLinks) {
      const pages = [];
      const addPage = (page) => pages.push({ type: "page", page });
      const addEllipsis = () => pages.push({ type: "ellipsis" });
      if (totalPages <= 5) {
        for (let page = 1; page <= totalPages; page += 1) addPage(page);
      } else if (boardPage <= 3) {
        addPage(1); addPage(2); addPage(3); addEllipsis(); addPage(totalPages);
      } else if (boardPage >= totalPages - 2) {
        addPage(1); addEllipsis(); addPage(totalPages - 2); addPage(totalPages - 1); addPage(totalPages);
      } else {
        addPage(1); addEllipsis(); addPage(boardPage); addEllipsis(); addPage(totalPages);
      }
      elements.pageLinks.replaceChildren(...pages.map((item) => {
        if (item.type === "ellipsis") return createElement("span", "pagination-ellipsis", "…");
        const button = createElement("button", `pagination-page${item.page === boardPage ? " is-current" : ""}`, String(item.page));
        button.type = "button";
        button.dataset.boardPageNumber = String(item.page);
        button.setAttribute("aria-label", state.language === "zh" ? `第 ${item.page} 页` : `Page ${item.page}`);
        button.setAttribute("aria-current", String(item.page === boardPage));
        return button;
      }));
    }
    elements.boardPageButtons.forEach((button) => {
      const previous = button.dataset.boardPage === "previous";
      button.textContent = state.language === "zh" ? (previous ? "← 上一页" : "下一页 →") : (previous ? "← Previous" : "Next →");
      button.disabled = previous ? boardPage <= 1 : boardPage >= totalPages;
    });
  }

  function renderBoard() {
    // Until the API answers, the rows the server wrote into the HTML are the best
    // thing on the page. Clearing them for an empty state would only flash.
    if (servedFromWeb && boardSource === "local" && !state.listings.length) return;

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
        ? `${total} 个条目 · 实时更新`
        : `${total} listings · Updated live`;
    }
  }

  function featuredListingCard(listing, position, ranked, standard = false) {
    const card = createElement("article", `featured-listing${position <= 3 ? ` featured-${position}` : ""}${standard ? " standard-listing" : ""}`);
    card.dataset.rank = String(position);
    card.dataset.listingId = listing.id;
    card.setAttribute("role", "listitem");
    const minimum = boardSource !== "local" && remoteNextBid ? remoteNextBid : getBid((remoteLeader || ranked[0])) + 1;

    if (listing.id === changedListingId) card.classList.add("is-updated");

    const rank = createElement("div", "featured-rank", `#${position}`);
    const evidence = createElement("div", "featured-evidence");
    const bid = createElement("div", "featured-metric featured-price");
    bid.append(createElement("strong", "", money(getBid(listing))));
    const bidStack = createElement("div", "featured-bid-stack");
    bidStack.append(bid, createShareControl(listing, position));
    evidence.append(bidStack);

    card.id = `listing-${listing.id}`;
    card.append(rank, productIdentity(listing, "p", position), evidence, createVisitOverlay(listing, position), createClaimControl(minimum));
    return card;
  }

  function renderLeader() {
    const leader = boardSource !== "local" && remoteLeader ? remoteLeader : rankedListings()[0];
    if (!leader) {
      if (boardSource === "production") {
        const openingPrice = remoteNextBid || 1;
        if (elements.heroPrice) elements.heroPrice.textContent = money(openingPrice);
        if (elements.heroContext) {
          elements.heroContext.textContent = state.language === "zh"
            ? `${money(openingPrice)} 即可登上榜单第 1 名。成为板上第一个产品。`
            : `${money(openingPrice)} takes #1. Be the first product on the board.`;
        }
        if (elements.inlineBid) {
          elements.inlineBid.min = String(boardMinimum());
          if (!inlineBidTouched) elements.inlineBid.value = String(openingPrice);
        }
      }
      return;
    }
    // The market is the merchant's own answer, never inherited from whoever leads
    // the board: a hardware shop pre-filled with the leader's Marketing can reach
    // checkout without anyone noticing it was filed in the wrong trade.
    const leaderCategory = canonicalCategory(leader.category) || "Other";
    const marketPrice = chosenMarket && chosenMarket.category === elements.categorySelect?.value ? chosenMarket.nextBid : null;
    const nextPrice = marketPrice || (boardSource === "local" || !remoteNextBid ? getBid(leader) + 1 : remoteNextBid);

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
      // min is the board floor, value is only a suggestion. Setting min to the
      // price of #1 made native validation reject every smaller entry, which
      // shut out exactly the cheap listings cumulative ranking exists to allow.
      elements.inlineBid.min = String(boardMinimum());
      if (!inlineBidTouched) elements.inlineBid.value = String(nextPrice);
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
      description: String(item.description || item.listingDescription || item.listing_description || ""),
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
    const amount = Number.isFinite(amountValue) ? amountValue : 0;
    const amountLabel = amount > 0 ? money(amount) : "—";
    const rank = Number(item.rank);
    const type = String(item.type || "joined").replace("topped_up", "topup");

    if (type === "topup" || type === "defended") {
      return { type: "topup", action: chinese ? "加价" : "Raised", context: chinese ? `总价 ${amountLabel}` : `Total ${amountLabel}`, metric: amountLabel, metricLabel: "", rank };
    }
    if (type === "won" || type === "outbid" || type === "challenge") {
      const isDisplaced = type === "outbid" && displacedBy;
      return {
        type: isDisplaced ? "outbid" : "won",
        action: isDisplaced
          ? (chinese ? "排名下滑" : "Lost rank")
          : (chinese ? (rank === 1 ? "抢下第 1" : "升榜") : (rank === 1 ? "Took #1" : "Moved up")),
        context: isDisplaced ? (chinese ? `被 ${displacedBy} 超越` : `Passed by ${displacedBy}`) : displacedName ? (chinese ? `超越 ${displacedName}` : `Passed ${displacedName}`) : (chinese ? "排名上升" : "Moved up"),
        metric: amountLabel,
        metricLabel: "",
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
    identity.append(name);
    if (listing.description) {
      const description = listing.description.length > 48 ? `${listing.description.slice(0, 45).trimEnd()}…` : listing.description;
      identity.append(createElement("span", "activity-description", description));
    }
    const action = createElement("span", `activity-action activity-action-${presentation.type}`, presentation.action);
    const metric = createElement("div", "activity-metric");
    metric.append(createElement("strong", "", presentation.metric));
    const rank = createElement("div", "activity-rank");
    rank.append(createElement("strong", "", Number.isFinite(presentation.rank) && presentation.rank > 0 ? `#${presentation.rank}` : "—"));
    const time = createElement("time", "activity-time", activityTime(item));
    if (item.created_at || item.createdAt) time.dateTime = item.created_at || item.createdAt;
    const details = createElement("div", "activity-details");
    details.append(action, metric, rank, time);
    identity.append(details);
    row.append(activityMark(listing), identity);
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
    if (!Number.isSafeInteger(amount) || amount < boardMinimum() || amount > MAX_BID) return;
    const rank = projectedRank(amount);
    const listing = activeBid.type === "new"
      ? pendingChallenge
      : state.listings.find((item) => item.id === activeBid.listingId);
    const category = canonicalCategory(listing?.category) || state.category;
    if (elements.dialogRank) elements.dialogRank.textContent = `#${rank}`;
    if (elements.dialogPrice) elements.dialogPrice.textContent = money(amount);
    if (elements.dialogContext) elements.dialogContext.textContent = `${checkoutBoardLabel()} · ${categoryName(category)}`;
    if (elements.dialogTarget) {
      // The merchant confirms which account they pasted before any money moves.
      const listing = state.listings.find((item) => item.id === activeBid?.listingId);
      const url = activeBid?.type === "new" ? pendingChallenge?.url : (() => { try { return new URL(listing?.url || ""); } catch { return null; } })();
      const social = url ? socialTarget(url) : null;
      const name = social?.handle
        ? `@${social.handle}`
        : (url ? `${url.hostname.replace(/^(?:www|m)\./, "")}${social ? url.pathname.replace(/\/+$/, "") : ""}` : listing?.name || "");
      elements.dialogTarget.textContent = social
        ? `${name} · ${social.label} · ${categoryName(category)}`
        : `${name} · ${categoryName(category)}`;
      elements.dialogTarget.hidden = !name;
    }
    if (elements.dialogExplanation) {
      // This runs on every dialog open and every amount change, so it must
      // re-append the advertising disclaimer. Without it the static
      // confirmationCopy is overwritten and the disclosure never reaches the
      // buyer at the moment of payment.
      const projection = state.language === "zh"
        ? `付款确认后，${listing?.name || "你的条目"}将在${checkoutBoardLabel()}获得第 ${rank} 名。其他人仍可出价取得更高排名。`
        : `After payment confirms, ${listing?.name || "your listing"} will take #${rank} on the ${checkoutBoardLabel().toLowerCase()}. Someone else can still claim a higher rank.`;
      elements.dialogExplanation.textContent = `${projection} ${languageText("chanceDisclaimer")}`;
    }
  }

  function openBidDialog(trigger, listingId = null) {
    if (!elements.dialog || !elements.bidForm || !elements.bidAmount) return;
    activeBid = listingId ? { type: "listing", listingId } : { type: "new" };
    lastTrigger = trigger;
    elements.bidForm.reset();

    // Respect what the buyer typed. This used to be Math.max(min, entered),
    // which silently replaced a RM1 entry with the price of #1 — the confirm
    // dialog then asked for hundreds of times what they had asked for.
    const entered = Number(elements.inlineBid?.value);
    elements.bidAmount.value = String(
      Number.isSafeInteger(entered) && entered >= boardMinimum() && entered <= MAX_BID
        ? entered
        : suggestedBidForNextRank(),
    );
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
    let listingId = candidate?.id;
    if (!listingId) {
      // A website the board has never seen: create its listing on the spot.
      // The server screens the submission and returns the existing entry when
      // the hostname is already on the board, so payments always accumulate
      // onto one listing per website.
      if (!pendingChallenge?.url) throw new Error("Enter your website first.");
      const created = await fetch("./api/v1/listings", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          url: pendingChallenge.url.href,
          category: pendingChallenge.category || state.category,
        }),
      });
      const createdPayload = await created.json().catch(() => ({}));
      if (!created.ok || !createdPayload?.listing?.id) {
        throw new Error(submissionError(createdPayload?.error));
      }
      listingId = createdPayload.listing.id;
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
        listing_id: listingId,
        amount_minor: amount * 100,
        currency: remoteCurrency,
        snapshot_id: remoteSnapshotId,
        agreed_terms: elements.bidAgree?.checked === true,
        terms_version: TERMS_VERSION,
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
    const text = state.language === "zh"
      ? `${listing.name} 以 ${money(getBid(listing))} 的赞助出价位居 RANKOFF ${windowLabel()}榜第 ${rank} 名。你能超越它吗？${money(nextPrice)} 起认领第 1 名。`
      : `${listing.name} holds #${rank} on RANKOFF's ${windowLabel().toLowerCase()} board with a ${money(getBid(listing))} sponsored bid. Think you can outrank it? Claim #1 from ${money(nextPrice)}.`;
    const url = new URL(window.location.href);
    if (["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname)) {
      url.protocol = "https:";
      url.host = "rankoff.my";
      url.pathname = "/";
    }
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

  async function navigateToBoardPage(nextPage) {
    const total = boardSource !== "local" && remotePagination ? remotePagination.total : rankedListings().length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const targetPage = Math.min(totalPages, Math.max(1, nextPage));
    if (targetPage === boardPage) return;

    const previousPage = boardPage;
    boardPage = targetPage;
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
  }

  elements.boardPageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const direction = button.dataset.boardPage === "previous" ? -1 : 1;
      void navigateToBoardPage(boardPage + direction);
    });
  });

  elements.pageLinks?.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("[data-board-page-number]") : null;
    if (!(target instanceof HTMLElement)) return;
    void navigateToBoardPage(Number(target.dataset.boardPageNumber));
  });

  elements.boardRefresh?.addEventListener("click", async () => {
    elements.boardRefresh.disabled = true;
    const refreshed = await refreshBoardFromApi();
    elements.boardRefresh.disabled = false;
    if (!refreshed) showToast(state.language === "zh" ? "暂时无法刷新榜单。" : "The board could not be refreshed yet.", "error");
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
      const min = boardMinimum();
      inlineBidTouched = true;
      elements.inlineBid.value = String(Math.min(MAX_BID, Math.max(min, amount + adjustment)));
      elements.inlineBid.focus();
      return;
    }

    const challengeTrigger = target.closest("[data-prepare-challenge]");
    if (challengeTrigger instanceof HTMLElement && elements.inlineBid) {
      const suggestion = Number(challengeTrigger.dataset.prepareChallenge) || suggestedBidForNextRank();
      elements.inlineBid.value = String(suggestion);
      elements.inlineBid.min = String(boardMinimum());
      inlineBidTouched = false;
      elements.inlineChallenge?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => elements.inlineUrl?.focus(), 220);
      showToast(`Challenge prepared at ${money(minimum)}. Add your product to continue.`);
      return;
    }

    const adjustButton = target.closest("[data-bid-adjust]");
    if (adjustButton instanceof HTMLButtonElement && elements.bidAmount && activeBid) {
      const amount = Number(elements.bidAmount.value) || suggestedBidForNextRank();
      const adjustment = Number(adjustButton.dataset.bidAdjust) || 0;
      const min = boardMinimum();
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

  elements.categorySelect?.addEventListener("change", (event) => {
    void loadChosenMarket(String(event.target.value || ""));
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

    const target = socialTarget(parsedUrl);
    if (target?.chat) {
      showToast(
        state.language === "zh"
          ? "聊天链接不是公开主页，而且电话号码不适合公开发布。请改用网站或公开主页。"
          : "A chat link is not a public page. Use the website or public profile instead.",
        "error",
      );
      return;
    }
    if (target && !target.handle) {
      showToast(
        state.language === "zh"
          ? `请贴上 ${target.label} 的主页链接，不是某一则贴文、Reel 或影片。`
          : `Use the ${target.label} profile address, not a post, reel or video.`,
        "error",
      );
      return;
    }

    // A merchant's trade is their own: a hardware shop is Retail whatever the
    // board's current leader happens to sell. Each market keeps its own
    // leaderboard, so listing outside the leader's trade is the normal case.
    const category = String(formData.get("productCategory") || "");
    if (!categories.includes(category)) {
      showToast(state.language === "zh" ? "请先选择你的行业类别。" : "Choose the market this business belongs to.", "error");
      return;
    }
    pendingChallenge = {
      // "Instagram will take #1" names the platform, not the business standing on it.
      name: target?.handle ? `@${target.handle}` : nameFromUrl(parsedUrl.toString()),
      url: parsedUrl,
      category,
    };

    // Any amount at or above the board floor is valid — it simply lands at a
    // lower rank. This used to demand the price of #1 and overwrite what the
    // buyer had typed, which made a small first listing impossible.
    const min = boardMinimum();
    const amount = Number(formData.get("challengeAmount"));
    if (!Number.isSafeInteger(amount) || amount < min) {
      showToast(
        state.language === "zh"
          ? `最低 ${money(min)} 起。`
          : `Listings start at ${money(min)}.`,
        "error",
      );
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
    if (amount < boardMinimum()) {
      showToast(`Bid at least ${money(boardMinimum())}.`, "error");
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
    showToast(`${result.listing.name} is now #${result.rank}.`, "success");
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
