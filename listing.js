(() => {
  "use strict";

  const STORE_KEY = "rankoff-mvp-demo-v3";
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  const initialCanonical = canonicalLink?.href || "https://rankoff.my/listing";
  const initialTitle = document.title;
  const initialDescription = document.querySelector('meta[name="description"]')?.getAttribute("content") || "";
  const initialSocialDescription = document.querySelector('meta[property="og:description"]')?.getAttribute("content") || initialDescription;
  const categoryGroups = Object.freeze({ AI: ["AI", "Agents", "AIMedia"], Creators: ["Creators", "Attention", "People"], Property: ["Property", "RealEstate", "Travel"], Interior: ["Interior"], Beauty: ["Beauty"], Health: ["Health"], Sports: ["Sports"], Food: ["Food"], Marketing: ["Marketing", "SEO", "Social", "Sales", "Agencies"], Creative: ["Creative", "Design", "Writing", "Audio", "News"], Professional: ["Professional", "Business", "Careers", "Productivity"], Education: ["Education", "Training", "Academy"], Finance: ["Finance", "Insurance", "Banking", "Crypto"], Electronics: ["Electronics", "Repair"], Retail: ["Retail", "Ecommerce"], Construction: ["Construction", "Hardware"], Home: ["Home"], Automotive: ["Automotive", "Auto"], Other: ["Other", "Developer", "Security", "Games", "Domains", "Discovery"] });
  const categoryAliases = Object.freeze(Object.entries(categoryGroups).reduce((aliases, [market, members]) => {
    aliases[market.toLowerCase()] = market;
    members.forEach((member) => { aliases[member.toLowerCase()] = market; });
    return aliases;
  }, {}));
  const categoryLabels = { AI: "AI Tools & Agents", Creators: "Creators & Talent", Property: "Property & Agents", Interior: "Interior & Renovation", Beauty: "Beauty & Wellness", Health: "Health & Medical", Sports: "Sports & Fitness", Food: "Food & Beverage", Marketing: "Marketing & Advertising", Creative: "Creative & Production", Professional: "Professional Services", Education: "Education & Training", Finance: "Finance & Insurance", Electronics: "Electronics & Repair", Retail: "Retail & Ecommerce", Construction: "Hardware & Construction", Home: "Home Services", Automotive: "Automotive", Other: "Other" };
  const categoryTranslations = { AI: "AI 工具与智能体", Creators: "创作者与艺人", Property: "房产与经纪", Interior: "室内设计与装修", Beauty: "美容与养生", Health: "健康与医疗", Sports: "运动与健身", Food: "餐饮", Marketing: "营销与广告", Creative: "创意与制作", Professional: "专业服务", Education: "教育与培训", Finance: "金融与保险", Electronics: "电子与维修", Retail: "零售与电商", Construction: "五金与建筑", Home: "家居服务", Automotive: "汽车", Other: "其他" };
  const previewListings = [
    ["model-harbor", "Model Harbor", "A release desk for production AI models, approvals, and customer notices.", "用于管理生产环境 AI 模型、审批与客户通知的发布工作台。", "https://modelharbor.example/", "Agents", 2480, 2840],
    ["trackline", "Trackline", "Campaign reporting for teams that need a clean answer to what moved.", "为需要清楚判断成效来源的团队提供营销活动报告。", "https://trackline.example/", "Marketing", 2160, 1910],
    ["patchnote", "Patchnote", "Release notes that turn product changes into useful customer updates.", "把产品更新变成实用客户通知的版本说明工具。", "https://patchnote.example/", "Developer", 1930, 2180],
    ["canvas-relay", "Canvas Relay", "Creative hand-offs, feedback, and approved files in one focused space.", "在一个专注空间中完成创意交接、反馈与已批准文件管理。", "https://canvasrelay.example/", "Design", 1180, 1490],
    ["switchboard", "Switchboard", "A routing layer for the AI tools already inside an operator stack.", "为运营工具栈中已有的 AI 工具提供统一路由层。", "https://switchboard.example/", "Agents", 940, 1210],
  ].map(([id, title, description, descriptionZh, url, category, bid, clicks], index) => ({
    id, title, description, descriptionZh, url, category, bid, clicks, rank: index + 1, icon: "",
  }));

  const copy = {
    en: {
      board: "Board", categories: "Categories", about: "About", legal: "Legal", contact: "Contact", skipListing: "Skip to listing details", back: "← Back to leaderboard", loading: "Loading ranking details…",
      notFoundTitle: "Listing not found", notFoundCopy: "This listing may have moved or is no longer on the public board.", returnBoard: "Return to the board",
      sponsored: "Sponsored", visit: "Visit website", viewInstagram: "View Instagram", viewFacebook: "View Facebook Page", viewTiktok: "View TikTok", viewProfile: "View profile", share: "Share rank", evidence: "Public ranking record", rank: "Current rank", bid: "Bid", allTimeBid: "All-time total", past24Bid: "Past 24h total", duration: "Duration", past24: "Past 24h",
      rule: "Highest total takes #1", claimNumberOne: "Claim #1 for", startClaim: "Claim this rank",
      claimUrl: "Your website or public profile", claimUrlPlaceholder: "example.com or instagram.com/yourname", claimAmount: "Your bid",
      claimAgree: "I understand this is a paid sponsored placement for a public link. It gives me no rights over that account, and the listed party may request removal. I agree to the ", termsOfService: "Terms of Service", claimAgreeSuffix: ".",
      payClaim: "Pay & claim #1", claimOpening: "Opening checkout…", claimInvalidUrl: "Enter a valid website or public profile address.", claimHandle: "Paste the full profile address, not a bare @handle.",
      claimTooLow: "Bid at least {min} to take #1.", claimAgreeFirst: "Please accept the Terms of Service first.", claimListingFailed: "This website could not be listed. No payment was made.", claimUnavailable: "Checkout is unavailable right now. No payment was made.",
      footer: "Transparent sponsored ranking. Every position has a visible price.",
      previewListing: "Public listing", verifiedPlacement: "Verified placement", previewData: "Public data", verifiedData: "Live data",
      sampleClicks: "Referral clicks", verifiedClicks: "Verified clicks", estimatedClicks: "Referral clicks", past24Clicks: "Past 24h clicks",
      previewEvidence: "Rank, price, and referral clicks update from the public board.",
      verifiedEvidence: "Rank and bid come from settled placements. Clicks are first-party redirect events recorded by Rankoff.",
      claimCopy: "Put your product above this listing. Your full business description stays visible until someone pays more.",
      previewDisclosure: "Submissions pass automated checks instantly; listings may be removed after publication if they break the rules.", liveDisclosure: "Payment is confirmed only after secure hosted checkout settles.",
      unavailable: "Website temporarily unavailable", copied: "Rank link copied.", shareText: "is ranked", listingFallback: "Listing", sponsoredDescription: "Sponsored listing on Rankoff.",
      footerParent: "A Brandup Marketing product", rules: "Rules", terms: "Terms", privacy: "Privacy", payments: "Payments",
      firstListed: "First listed", settledBids: "Payments", lastUpdated: "Last updated",
    },
    zh: {
      board: "榜单", categories: "分类", about: "关于", legal: "法律条款", contact: "联系", skipListing: "跳至条目详情", back: "← 返回榜单", loading: "正在加载排名信息…",
      notFoundTitle: "找不到此条目", notFoundCopy: "此条目可能已移动，或已不在公开榜单中。", returnBoard: "返回榜单",
      sponsored: "赞助", visit: "访问网站", viewInstagram: "查看 Instagram", viewFacebook: "查看 Facebook 专页", viewTiktok: "查看 TikTok", viewProfile: "查看主页", share: "分享排名", evidence: "公开排名记录", rank: "当前排名", bid: "出价", allTimeBid: "全时段累计出价", past24Bid: "近 24 小时累计出价", duration: "有效期", past24: "近 24 小时",
      rule: "累计出价最高者获得第 1 名", claimNumberOne: "拿下第 1 名，只需", startClaim: "拿下此排名",
      claimUrl: "你的网站或公开主页", claimUrlPlaceholder: "example.com 或 instagram.com/yourname", claimAmount: "你的出价",
      claimAgree: "我了解这是针对公开链接的付费赞助展示，不赋予我对该账号的任何权利，被列出的一方可要求移除。我同意", termsOfService: "《服务条款》", claimAgreeSuffix: "。",
      payClaim: "付款并拿下第 1 名", claimOpening: "正在打开付款页面…", claimInvalidUrl: "请输入有效的网站或公开主页网址。", claimHandle: "请贴上完整主页链接，而不是单独的 @账号。",
      claimTooLow: "至少出价 {min} 才能拿下第 1 名。", claimAgreeFirst: "请先同意《服务条款》。", claimListingFailed: "此网址无法上榜，未产生任何费用。", claimUnavailable: "目前无法打开付款页面，未产生任何费用。",
      footer: "透明的赞助排名。每个位置都有公开价格。",
      previewListing: "公开条目", verifiedPlacement: "已验证展示", previewData: "公开数据", verifiedData: "实时数据",
      sampleClicks: "推荐点击", verifiedClicks: "已验证点击", estimatedClicks: "推荐点击", past24Clicks: "近 24 小时点击",
      previewEvidence: "排名、价格和推荐点击会随公开榜单更新。",
      verifiedEvidence: "排名与出价来自已结算展示；点击为 Rankoff 记录的第一方跳转事件。",
      claimCopy: "让你的产品排在这个条目之前。完整业务介绍会持续展示，直到有人出价更高。",
      previewDisclosure: "提交即通过自动筛查并发布；违反规则的条目可能在发布后被移除。", liveDisclosure: "付款会在安全的托管付款页面完成并确认。",
      unavailable: "网站暂时无法访问", copied: "排名链接已复制。", shareText: "目前排名", listingFallback: "条目", sponsoredDescription: "Rankoff 上的赞助条目。",
      footerParent: "Brandup Marketing 旗下产品", rules: "规则", terms: "条款", privacy: "隐私", payments: "付款",
      firstListed: "首次上榜", settledBids: "付款次数", lastUpdated: "最近更新",
    },
  };
  const pageMetadata = {
    en: {
      title: "Sponsored listing | RANKOFF",
      description: "View a sponsored product's current Rankoff position, bid, and measured clicks.",
      socialDescription: "See the bid, rank, and measured attention behind this sponsored listing.",
    },
    zh: {
      title: "赞助条目 | RANKOFF",
      description: "查看赞助产品当前在 Rankoff 的排名、出价和已统计点击。",
      socialDescription: "查看此赞助条目背后的出价、排名与已统计关注度。",
    },
  };
  const accessibilityCopy = {
    en: { home: "RANKOFF home", tagline: "RANKOFF — Bid your way to number one", navigation: "Main navigation", search: "Search products and categories", switchChinese: "Switch to Chinese", switchLight: "Switch to light theme", switchDark: "Switch to dark theme" },
    zh: { home: "RANKOFF 首页", tagline: "RANKOFF — 竞价登上第 1 名", navigation: "主导航", search: "搜索产品和分类", switchChinese: "切换为中文", switchLight: "切换至浅色主题", switchDark: "切换至深色主题" },
  };

  const elements = {
    root: document.documentElement,
    detail: document.querySelector("[data-content]"), loading: document.querySelector("[data-loading]"), error: document.querySelector("[data-error]"),
    language: document.querySelector("[data-language-toggle]"), theme: document.querySelector("[data-theme-toggle]"),
    mark: document.querySelector("[data-mark]"), initials: document.querySelector("[data-initials]"), title: document.querySelector("[data-title]"),
    category: document.querySelector("[data-category]"), placement: document.querySelector("[data-placement-label]"), host: document.querySelector("[data-host]"),
    description: document.querySelector("[data-description]"), visit: document.querySelector("[data-visit]"), share: document.querySelector("[data-share]"),
    mode: document.querySelector("[data-mode]"), evidenceNote: document.querySelector("[data-evidence-note]"), rank: document.querySelector("[data-rank]"),
    rankLabel: document.querySelector("[data-rank-label]"), rankNote: document.querySelector("[data-rank-note]"),
    bid: document.querySelector("[data-bid]"), clicks: document.querySelector("[data-clicks]"), clickLabels: document.querySelectorAll("[data-click-label]"), clickLabelToday: document.querySelector("[data-click-label-today]"),
    todayRank: document.querySelector("[data-today-rank]"), todayBid: document.querySelector("[data-today-bid]"), todayClicks: document.querySelector("[data-today-clicks]"),
    nextBid: document.querySelector("[data-next-bid]"), nextBidSticky: document.querySelector("[data-next-bid-sticky]"), claimSticky: document.querySelector("[data-claim-sticky]"), claimCopy: document.querySelector("[data-claim-copy]"), claim: document.querySelector("[data-claim]"),
    claimForm: document.querySelector("[data-claim-form]"), claimUrl: document.querySelector("[data-claim-url]"), claimAmount: document.querySelector("[data-claim-amount]"), claimAgree: document.querySelector("[data-claim-agree]"), claimSubmit: document.querySelector("[data-claim-submit]"), claimCurrency: document.querySelector("[data-claim-currency]"), claimPreview: document.querySelector("[data-claim-preview]"),
    disclosure: document.querySelector("[data-claim-disclosure]"), toast: document.querySelector("[data-toast]"),
  };
  document.querySelector("[data-search-redirect]")?.addEventListener("click", () => { window.location.href = urlWithLanguage("/#search").href; });

  function readServerModel() {
    const node = document.querySelector("#listing-hydration");
    if (!node) return null;
    try {
      const value = JSON.parse(node.textContent || "null");
      if (!value || String(value.id || "") !== String(document.body.dataset.listingId || "")) return null;
      return value;
    } catch {
      return null;
    }
  }

  let preferences = loadPreferences();
  let model = readServerModel();
  let toastTimer = null;
  const boardCurrencyFormat = (code) => new Intl.NumberFormat(code === "MYR" ? "en-MY" : "en-US", { style: "currency", currency: code || "USD", maximumFractionDigits: 0 });
  let money = boardCurrencyFormat(model?.currency || "USD");
  // The server-rendered page hands the currency down with the model and never
  // reaches the board fetch below, so the code has to start from the model too.
  let boardCurrency = String(model?.currency || "USD").toUpperCase();
  let claimAmountTouched = false;
  // The whole all-time board, for the claim preview: which position a total
  // would land at, in this listing's market and overall.
  let boardRankings = [];
  const TERMS_VERSION = "2026-09-02";
  const count = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

  function languageFromUrl() {
    try {
      const value = new URL(window.location.href).searchParams.get("lang");
      return value === "zh" || value === "en" ? value : "";
    } catch { return ""; }
  }

  function loadPreferences() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY));
      return { theme: saved?.theme === "light" ? "light" : "dark", language: languageFromUrl() || (saved?.language === "zh" ? "zh" : "en"), listings: Array.isArray(saved?.listings) ? saved.listings : [] };
    } catch {
      return { theme: "dark", language: languageFromUrl() || "en", listings: [] };
    }
  }

  function savePreferences() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY)) || {};
      localStorage.setItem(STORE_KEY, JSON.stringify({ ...saved, theme: preferences.theme, language: preferences.language }));
    } catch { /* Preference persistence is optional. */ }
  }

  function text(key) { return copy[preferences.language][key] || copy.en[key] || key; }
  function categoryName(category) {
    const market = categoryAliases[String(category || "").toLowerCase()] || "Other";
    return preferences.language === "zh" ? categoryTranslations[market] : categoryLabels[market];
  }

  function urlWithLanguage(href, nextLanguage = preferences.language) {
    const url = new URL(href, window.location.href);
    if (nextLanguage === "zh") url.searchParams.set("lang", "zh");
    else url.searchParams.delete("lang");
    return url;
  }

  function syncLanguageUrl() {
    const url = urlWithLanguage(window.location.href);
    if (url.href !== window.location.href && window.history?.replaceState) window.history.replaceState(window.history.state, "", url.href);
  }

  function syncInternalLinks() {
    document.querySelectorAll("a[href]").forEach((anchor) => {
      const raw = anchor.getAttribute("href");
      if (!raw || raw.startsWith("#") || anchor.matches("[data-visit]")) return;
      try {
        const url = new URL(raw, window.location.href);
        if (url.origin !== window.location.origin) return;
        anchor.href = /^\/(?:legal|answers\/)/.test(url.pathname) ? urlWithLanguage(url, "en").href : urlWithLanguage(url).href;
      } catch { /* leave malformed or non-web links untouched */ }
    });
  }

  function ensureAlternateLink(hreflang) {
    let link = document.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`);
    if (!link) {
      link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = hreflang;
      document.head.append(link);
    }
    return link;
  }

  function setMetaContent(selector, value) { document.querySelector(selector)?.setAttribute("content", value); }

  function localizedModelDescription() {
    if (preferences.language === "zh" && model?.descriptionZh) return model.descriptionZh;
    return model?.description || text("sponsoredDescription");
  }

  function updateMetadata(titleOverride = "", descriptionOverride = "") {
    const metadata = pageMetadata[preferences.language];
    const staticShell = initialTitle === pageMetadata.en.title || initialTitle === pageMetadata.zh.title;
    const staticDescription = initialDescription === pageMetadata.en.description || initialDescription === pageMetadata.zh.description;
    const staticSocialDescription = initialSocialDescription === pageMetadata.en.socialDescription || initialSocialDescription === pageMetadata.zh.socialDescription;
    const title = titleOverride || (staticShell ? metadata.title : initialTitle);
    const description = descriptionOverride || (staticDescription ? metadata.description : initialDescription);
    const socialDescription = descriptionOverride || (staticSocialDescription ? metadata.socialDescription : initialSocialDescription);
    const canonical = urlWithLanguage(initialCanonical);
    document.title = title;
    canonicalLink?.setAttribute("href", canonical.href);
    setMetaContent('meta[name="description"]', description);
    setMetaContent('meta[property="og:locale"]', preferences.language === "zh" ? "zh_MY" : "en_MY");
    setMetaContent('meta[property="og:title"]', title);
    setMetaContent('meta[property="og:description"]', socialDescription);
    setMetaContent('meta[property="og:url"]', canonical.href);
    setMetaContent('meta[name="twitter:title"]', title);
    setMetaContent('meta[name="twitter:description"]', socialDescription);
    ensureAlternateLink("en").href = urlWithLanguage(initialCanonical, "en").href;
    ensureAlternateLink("zh-Hans").href = urlWithLanguage(initialCanonical, "zh").href;
    ensureAlternateLink("x-default").href = urlWithLanguage(initialCanonical, "en").href;
  }

  function formatRecordDate(raw) {
    const date = new Date(raw);
    if (!Number.isFinite(date.getTime())) return "";
    return new Intl.DateTimeFormat(preferences.language === "zh" ? "zh-CN" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
  }

  function syncRecordCopy() {
    document.querySelectorAll("[data-record-key]").forEach((node) => {
      const key = node.dataset.recordKey;
      const label = node.matches("li") ? node.querySelector("span") : node;
      if (label && copy.en[key]) label.textContent = text(key);
      const date = node.querySelector?.("[data-record-date]") || (node.matches("[data-record-date]") ? node : null);
      const formatted = date?.dataset.recordDate ? formatRecordDate(date.dataset.recordDate) : "";
      if (date && formatted) date.textContent = formatted;
    });
  }

  function updateAccessibility() {
    const accessible = accessibilityCopy[preferences.language];
    document.querySelectorAll(".brand, .footer-brand").forEach((node) => node.setAttribute("aria-label", accessible.home));
    document.querySelector(".brand-final-logo")?.setAttribute("alt", accessible.tagline);
    document.querySelector(".site-nav")?.setAttribute("aria-label", accessible.navigation);
    document.querySelector(".search-toggle")?.setAttribute("aria-label", accessible.search);
  }

  function applyPreferences() {
    elements.root.dataset.theme = preferences.theme;
    elements.root.lang = preferences.language === "zh" ? "zh-Hans" : "en";
    syncLanguageUrl();
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", preferences.theme === "light" ? "#faf7f5" : "#090a0c");
    document.querySelectorAll("[data-copy]").forEach((node) => { node.textContent = text(node.dataset.copy); });
    document.querySelectorAll("[data-copy-placeholder]").forEach((node) => { node.placeholder = text(node.dataset.copyPlaceholder); });
    updateAccessibility();
    elements.language.textContent = preferences.language === "zh" ? "EN" : "中文";
    elements.language.setAttribute("aria-label", preferences.language === "zh" ? "切换为英文" : accessibilityCopy.en.switchChinese);
    elements.language.setAttribute("aria-pressed", String(preferences.language === "zh"));
    const dark = preferences.theme === "dark";
    const accessible = accessibilityCopy[preferences.language];
    elements.theme.textContent = preferences.language === "zh" ? (dark ? "浅色" : "深色") : (dark ? "Light" : "Dark");
    elements.theme.setAttribute("aria-pressed", String(preferences.theme === "dark"));
    elements.theme.setAttribute("aria-label", dark ? accessible.switchLight : accessible.switchDark);
    syncRecordCopy();
    updateMetadata();
    syncInternalLinks();
    if (model) renderModel();
  }

  function localListing(id) {
    const saved = preferences.listings.find((item) => String(item?.id) === id);
    if (saved) return {
      id, title: String(saved.name || "Listing"), description: String(saved.description || "Sponsored listing on Rankoff."), descriptionZh: String(saved.descriptionZh || ""),
      url: String(saved.url || ""), category: String(saved.category || "Other"), bid: Number(saved.bids?.all || 0), clicks: Number(saved.clicks || 0),
      rank: [...preferences.listings].sort((a, b) => Number(b?.bids?.all || 0) - Number(a?.bids?.all || 0)).findIndex((item) => String(item?.id) === id) + 1,
      icon: String(saved.iconUrl || ""), todayBid: Number(saved.bids?.today || 0), todayClicks: Number(saved.todayClicks || 0), isLocal: true,
    };
    return previewListings.find((item) => item.id === id) || null;
  }

  function fromRanking(entry) {
    return {
      id: String(entry.listing.id), identity: String(entry.listing.hostname || ""), title: String(entry.listing.title), description: String(entry.listing.description || "Sponsored listing on Rankoff."),
      url: String(entry.listing.url || ""), category: String(entry.listing.category || "Other"), icon: String(entry.listing.favicon_url || ""),
      rank: Number(entry.rank), bid: Math.ceil(Number(entry.bid?.amount_minor || 0) / 100), clicks: Number(entry.clicks || 0),
      snapshot: "", mode: "preview",
    };
  }

  async function loadListing() {
    // /product/<hostname> renders on the server and hands the id down on <body>.
    const id = new URL(location.href).searchParams.get("id") || document.body.dataset.listingId || "";
    if (!id) return showError();
    if (model && String(model.id) === id) {
      void loadBoardRankings();
      renderModel();
      elements.loading.hidden = true;
      elements.error.hidden = true;
      elements.detail.hidden = false;
      document.querySelector("#listing-detail")?.setAttribute("aria-busy", "false");
      return;
    }
    let fallback = localListing(id);
    let productionBoard = false;

    if (/^https?:$/.test(location.protocol)) {
      try {
        const allUrl = new URL("/api/v1/board?board=global&period=all&limit=100", location.origin);
        const todayUrl = new URL("/api/v1/board?board=global&period=today&limit=100", location.origin);
        const [allResponse, todayResponse] = await Promise.all([fetch(allUrl, { cache: "no-store" }), fetch(todayUrl, { cache: "no-store" })]);
        if (allResponse.ok && todayResponse.ok) {
          const [allPayload, todayPayload] = await Promise.all([allResponse.json(), todayResponse.json()]);
          productionBoard = allPayload.mode === "production";
          boardCurrency = String(allPayload.board?.currency || "USD").toUpperCase();
          boardRankings = rankingsForPreview(allPayload);
          money = boardCurrencyFormat(boardCurrency);
          const allEntry = allPayload.rankings?.find((entry) => String(entry.listing?.id) === id);
          const todayEntry = todayPayload.rankings?.find((entry) => String(entry.listing?.id) === id);
          if (allEntry) {
            model = fromRanking(allEntry);
            model.currency = boardCurrency;
            model.mode = allPayload.mode === "production" ? "production" : "preview";
            model.snapshot = allPayload.snapshot_id || "";
            model.nextBid = Math.ceil(Number(allPayload.next_bid_minor || 100) / 100);
            // The board is already loaded in full, so the listing's position
            // inside its own market costs nothing more to work out.
            const market = categoryAliases[String(allEntry.listing?.category || "").toLowerCase()] || "Other";
            const inMarket = (allPayload.rankings || []).filter(
              (entry) => (categoryAliases[String(entry.listing?.category || "").toLowerCase()] || "Other") === market,
            );
            const place = inMarket.findIndex((entry) => String(entry.listing?.id) === id);
            if (place >= 0) model.marketRank = place + 1;
            if (todayEntry) {
              model.todayRank = Number(todayEntry.rank);
              model.todayBid = Math.ceil(Number(todayEntry.bid?.amount_minor || 0) / 100);
              model.todayClicks = Number(todayEntry.clicks || 0);
            }
          }
        }
      } catch { /* The local preview below remains useful offline. */ }
    }

    if (!model && fallback && !productionBoard) model = { ...fallback, mode: "preview", nextBid: Math.max(...previewListings.map((item) => item.bid), fallback.bid) + 1 };
    if (!model) return showError();
    renderModel();
    elements.loading.hidden = true;
    elements.detail.hidden = false;
    document.querySelector("#listing-detail")?.setAttribute("aria-busy", "false");
  }

  const SOCIAL_PLATFORMS = ["instagram", "tiktok", "facebook", "x"];
  const ACTION_COPY = { instagram: "viewInstagram", tiktok: "viewTiktok", facebook: "viewFacebook", x: "viewProfile" };

  // Mirrors functions/_lib/platform.js: a profile is addressed by its handle.
  function modelPlatform() {
    const identity = String(model?.identity || "");
    const split = identity.indexOf(":");
    const platform = split > 0 ? identity.slice(0, split) : "";
    return SOCIAL_PLATFORMS.includes(platform) ? platform : "";
  }

  function initials(url, title) {
    try { return new URL(url).hostname.split(".")[0].split(/[-_]/).map((part) => part[0]).join("").slice(0, 3).toUpperCase(); }
    catch { return String(title).split(/\s+/).map((part) => part[0]).join("").slice(0, 3).toUpperCase(); }
  }

  function setIcon() {
    elements.mark.querySelector("img")?.remove();
    elements.mark.classList.remove("has-icon");
    elements.initials.textContent = modelPlatform()
      ? String(model.title || "").split(/\s+/).map((part) => part[0]).join("").slice(0, 3).toUpperCase()
      : initials(model.url, model.title);
    let host = "";
    try { host = new URL(model.url).hostname; } catch { return; }
    if (host.endsWith(".example") && !model.icon) return;
    // instagram.com/favicon.ico is Instagram's logo, the same on every profile.
    if (modelPlatform() && !model.icon) return;
    const origin = new URL(model.url).origin;
    const guessed = `${origin}/favicon.ico`;
    const sources = [...new Set([
      model.icon && model.icon !== guessed ? model.icon : "",
      `${origin}/apple-touch-icon.png`,
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`,
      model.icon,
      guessed,
      `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`,
    ].filter(Boolean))];
    if (!sources.length) return;
    const img = new Image();
    img.alt = "";
    img.referrerPolicy = "no-referrer";
    img.decoding = "async";
    let index = 0;
    const next = () => { if (index >= sources.length) return img.remove(); img.src = sources[index++]; };
    img.addEventListener("load", () => {
      const ratio = img.naturalWidth / Math.max(1, img.naturalHeight);
      if (ratio > 3.5 || ratio < 0.3) return img.remove();
      elements.mark.classList.add("has-icon");
    }, { once: true });
    img.addEventListener("error", next);
    elements.mark.append(img);
    next();
  }

  // #3 of the whole board says nothing; #1 of a market says something. Both are
  // true, and this has to read the same as the card the recipient's app renders.
  // The day the picture was taken, in the reader's own language.
  function cardStamp() {
    const now = new Date();
    return preferences.language === "zh"
      ? `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`
      : now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  function shareHeadline() {
    const zh = preferences.language === "zh";
    const useMarket = model.marketRank && model.marketRank < model.rank;
    const where = useMarket ? categoryName(model.category) : "RANKOFF";
    const place = useMarket ? model.marketRank : model.rank;
    const title = zh
      ? `${model.title} — ${where} 第 ${place} 名`
      : `${model.title} — #${place} ${useMarket ? "in" : "on"} ${where}`;
    return {
      title,
      text: zh ? `${model.title} 目前是 ${where} 第 ${place} 名。` : `${model.title} is #${place} ${useMarket ? "in" : "on"} ${where}.`,
      // The server names the board only once; a market headline needs it added,
      // a whole-board one already carries it.
      pageTitle: useMarket ? `${title} | RANKOFF` : title,
    };
  }

  // The page has to substantiate the claim its own title makes. A listing that
  // bought first place in a market leads with that, and still shows where the
  // same payment sits on the whole board rather than hiding it.
  function rankFrame() {
    const zh = preferences.language === "zh";
    if (!(model.marketRank && model.marketRank < model.rank)) {
      return { label: text("rank"), value: `#${model.rank}`, note: "" };
    }
    const market = categoryName(model.category);
    return {
      label: zh ? `${market} 排名` : `Rank in ${market}`,
      value: `#${model.marketRank}`,
      note: zh ? `全站第 ${model.rank} 名` : `#${model.rank} on the whole board`,
    };
  }

  function renderModel() {
    const verified = model.mode === "production";
    const clickLabel = verified ? text("verifiedClicks") : text("sampleClicks");
    elements.title.textContent = model.title;
    elements.category.textContent = categoryName(model.category);
    elements.description.textContent = localizedModelDescription();
    const frame = rankFrame();
    elements.rankLabel.textContent = frame.label;
    elements.rank.textContent = frame.value;
    elements.rankNote.textContent = frame.note;
    elements.rankNote.hidden = !frame.note;
    elements.bid.textContent = money.format(model.bid);
    elements.clicks.textContent = count.format(model.clicks);
    elements.todayRank.textContent = model.todayRank ? `#${model.todayRank}` : "—";
    elements.todayBid.textContent = model.todayBid ? money.format(model.todayBid) : "—";
    elements.todayClicks.textContent = Number.isFinite(model.todayClicks) ? count.format(model.todayClicks) : "—";
    elements.clickLabels.forEach((node) => { node.textContent = clickLabel; });
    // The 24h row carries its own scope, like the two rows above it. Sharing the
    // all-time label made the same metric read twice with two different values.
    if (elements.clickLabelToday) elements.clickLabelToday.textContent = text("past24Clicks");
    elements.placement.textContent = verified ? text("verifiedPlacement") : text("previewListing");
    elements.placement.className = verified ? "verified-chip" : "estimated-chip";
    elements.mode.textContent = verified ? text("verifiedData") : text("previewData");
    elements.mode.classList.toggle("is-verified", verified);
    elements.evidenceNote.textContent = verified ? text("verifiedEvidence") : text("previewEvidence");
    elements.nextBid.textContent = money.format(model.nextBid || model.bid + 1);
    if (elements.nextBidSticky) elements.nextBidSticky.textContent = elements.nextBid.textContent;
    if (elements.claimSticky) elements.claimSticky.hidden = false;
    elements.claimCopy.textContent = text("claimCopy");
    elements.disclosure.textContent = verified ? text("liveDisclosure") : text("previewDisclosure");
    elements.claim.href = urlWithLanguage("/#claim").href;
    // The inline form only exists where a payment can actually be taken; the
    // preview board keeps the link to the home form.
    if (elements.claimForm) {
      elements.claimForm.hidden = !verified;
      elements.claim.hidden = verified;
      const minimum = model.nextBid || model.bid + 1;
      elements.claimAmount.min = String(minimum);
      if (!claimAmountTouched || Number(elements.claimAmount.value) < minimum) elements.claimAmount.value = String(minimum);
      elements.claimCurrency.textContent = boardCurrency === "MYR" ? "RM" : boardCurrency;
      renderClaimPreview();
    }
    let host = model.url;
    try {
      const parsed = new URL(model.url);
      const bare = parsed.hostname.replace(/^(?:www|m)\./, "");
      host = modelPlatform() ? `${bare}${parsed.pathname.replace(/\/+$/, "")}` : bare;
    } catch { /* Keep raw URL. */ }
    elements.host.textContent = host;

    const unavailable = !model.url || (/\.example$/i.test(host) && !verified);
    if (unavailable) {
      elements.visit.removeAttribute("href");
      elements.visit.setAttribute("aria-disabled", "true");
      elements.visit.querySelector("span").textContent = text("unavailable");
    } else {
      const destination = verified ? new URL(`/go/${encodeURIComponent(model.id)}`, location.origin) : new URL(model.url);
      if (verified && model.snapshot) destination.searchParams.set("snapshot", model.snapshot);
      if (verified && model.rank) destination.searchParams.set("rank", String(model.rank));
      elements.visit.href = destination.toString();
      elements.visit.removeAttribute("aria-disabled");
      elements.visit.querySelector("span").textContent = text(ACTION_COPY[modelPlatform()] || "visit");
    }
    setIcon();
    // The server already wrote the better of the two true positions into the
    // title; hydration must not quietly demote it to the whole-board number.
    updateMetadata(shareHeadline().pageTitle, localizedModelDescription());
    syncInternalLinks();
  }

  elements.claimAmount?.addEventListener("input", () => { claimAmountTouched = true; });

  function rankingsForPreview(payload) {
    return (payload?.rankings || []).map((entry) => {
      let hostname = String(entry.listing?.hostname || "");
      try { hostname = hostname || new URL(entry.listing?.url).hostname; } catch { /* keep */ }
      return {
        id: String(entry.listing?.id || ""),
        hostname: hostname.toLowerCase().replace(/^(?:www|m)\./, ""),
        market: categoryAliases[String(entry.listing?.category || "").toLowerCase()] || "Other",
        bid: Math.ceil(Number(entry.bid?.amount_minor || 0) / 100),
      };
    });
  }

  async function loadBoardRankings() {
    if (boardRankings.length || !/^https?:$/.test(location.protocol)) return;
    try {
      const response = await fetch(new URL("/api/v1/board?board=global&period=all&limit=100", location.origin), { cache: "no-store" });
      if (!response.ok) return;
      boardRankings = rankingsForPreview(await response.json());
      renderClaimPreview();
    } catch { /* The preview simply stays quiet without the board. */ }
  }

  // "#1 in Hardware & Construction · #2 overall · Already paid RM 5 · Total
  // after RM 20": the position this payment buys and the total it is judged
  // on, before the buyer types a card number. Ties go to the earlier payment,
  // so an equal total ranks below it.
  function renderClaimPreview() {
    const node = elements.claimPreview;
    if (!node || !model || elements.claimForm?.hidden) return;
    if (!boardRankings.length) return void (node.hidden = true);
    const amount = Number(elements.claimAmount.value);
    if (!Number.isSafeInteger(amount) || amount <= 0) return void (node.hidden = true);
    let hostname = "";
    try { hostname = parseClaimUrl(elements.claimUrl.value).hostname.toLowerCase().replace(/^(?:www|m)\./, ""); } catch { /* not typed yet */ }
    const existing = hostname ? boardRankings.find((row) => row.hostname === hostname) : null;
    const previous = existing ? existing.bid : 0;
    const total = previous + amount;
    // A website already on the board keeps its own market: the payment lands
    // there, not on this listing's board, so the preview names that market.
    const market = existing ? existing.market : (categoryAliases[String(model.category || "").toLowerCase()] || "Other");
    const others = boardRankings.filter((row) => row.id !== existing?.id);
    const marketRank = others.filter((row) => row.market === market && row.bid >= total).length + 1;
    const overall = others.filter((row) => row.bid >= total).length + 1;
    const zh = preferences.language === "zh";
    const marketName = categoryName(market);
    const position = zh
      ? `${marketName}第 <strong>${marketRank}</strong> 名${overall !== marketRank ? ` · 全站第 ${overall} 名` : ""}`
      : `<strong>#${marketRank}</strong> in ${marketName}${overall !== marketRank ? ` · #${overall} overall` : ""}`;
    const paid = existing
      ? (zh ? `已付 ${money.format(previous)} · 付款后累计 <strong>${money.format(total)}</strong>` : `Already paid ${money.format(previous)} · Total after <strong>${money.format(total)}</strong>`)
      : (zh ? "新条目" : "New listing");
    node.innerHTML = `${zh ? "预计：" : "Expected: "}${position} · ${paid}`;
    node.hidden = false;
  }

  elements.claimUrl?.addEventListener("input", renderClaimPreview);
  elements.claimAmount?.addEventListener("input", renderClaimPreview);

  function claimFailure(message) {
    const failure = new Error(message);
    failure.isRankoffMessage = true;
    return failure;
  }

  function parseClaimUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) throw new TypeError("required");
    if (raw.startsWith("@")) throw claimFailure(text("claimHandle"));
    const parsed = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!/^https?:$/.test(parsed.protocol) || !parsed.hostname.includes(".")) throw new TypeError("invalid");
    return parsed;
  }

  // The API's error codes, in the reader's language. English keeps the server's
  // own message; Chinese maps the code, as the home page does.
  function claimErrorMessage(error, fallback) {
    if (preferences.language !== "zh") return error?.message || fallback;
    if (error?.code === "bid_too_low") {
      const minimumMinor = Number(error?.details?.minimum_amount_minor);
      return Number.isSafeInteger(minimumMinor) && minimumMinor > 0
        ? text("claimTooLow").replace("{min}", money.format(Math.ceil(minimumMinor / 100)))
        : "当前出价过低，请刷新页面后重试。";
    }
    const messages = {
      unknown_tld: "这不是一个网址。如果是 Instagram、Facebook 或 TikTok 账号，请贴上完整主页链接。",
      profile_required: "请贴上主页链接，而不是某一则贴文、Reel、限时动态或群组。",
      invalid_url: "请输入有效的 HTTPS 网站或公开主页网址。",
      listing_refused: "此网站不符合上榜条件，未产生任何费用。",
      listing_unavailable: "此网站目前无法上榜，未产生任何费用。",
      submission_limit: "目前提交数量过多，请稍后再试。",
      checkout_disabled: "实时付款暂未启用，未产生任何费用。",
      checkout_paused: "此榜单的付款目前暂停，未产生任何费用。",
      checkout_provider_error: "托管付款页面暂时无法建立，未产生任何费用。",
      terms_not_accepted: "请先同意《服务条款》，再继续付款。",
      listing_not_eligible: "此条目目前不符合出价条件，未产生任何费用。",
    };
    return messages[error?.code] || fallback;
  }

  // Same two calls the home form makes: create (or find) the listing for this
  // website, then open a bid on it and hand the buyer to hosted checkout.
  async function startClaimCheckout(parsedUrl, amount) {
    const created = await fetch("/api/v1/listings", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ url: parsedUrl.href, category: model.category }),
    });
    const createdPayload = await created.json().catch(() => ({}));
    if (!created.ok || !createdPayload?.listing?.id) {
      throw claimFailure(claimErrorMessage(createdPayload?.error, text("claimListingFailed")));
    }
    const response = await fetch("/api/v1/bids", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({
        listing_id: createdPayload.listing.id,
        amount_minor: amount * 100,
        currency: boardCurrency,
        snapshot_id: model.snapshot || null,
        agreed_terms: elements.claimAgree.checked === true,
        terms_version: TERMS_VERSION,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.checkout_url) {
      throw claimFailure(claimErrorMessage(payload?.error, text("claimUnavailable")));
    }
    window.location.assign(payload.checkout_url);
  }

  elements.claimForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!model || model.mode !== "production") {
      window.location.assign(urlWithLanguage("/#claim").href);
      return;
    }
    let parsedUrl;
    try {
      parsedUrl = parseClaimUrl(elements.claimUrl.value);
    } catch (error) {
      showToast(error?.isRankoffMessage ? error.message : text("claimInvalidUrl"));
      elements.claimUrl.focus();
      return;
    }
    const minimum = model.nextBid || model.bid + 1;
    const amount = Number(elements.claimAmount.value);
    if (!Number.isSafeInteger(amount) || amount < minimum) {
      showToast(text("claimTooLow").replace("{min}", money.format(minimum)));
      elements.claimAmount.focus();
      return;
    }
    if (!elements.claimAgree.checked) {
      showToast(text("claimAgreeFirst"));
      elements.claimAgree.focus();
      return;
    }
    const button = elements.claimSubmit;
    const label = button.innerHTML;
    button.disabled = true;
    button.textContent = text("claimOpening");
    try {
      await startClaimCheckout(parsedUrl, amount);
    } catch (error) {
      showToast(error?.isRankoffMessage ? error.message : text("claimUnavailable"));
      button.disabled = false;
      button.innerHTML = label;
    }
  });

  // The phone's bottom bar lands the buyer in the form, cursor in the website
  // field, rather than at the heading with the bar still covering the button.
  elements.claimSticky?.addEventListener("click", (event) => {
    if (!elements.claimForm || elements.claimForm.hidden) return;
    event.preventDefault();
    elements.claimForm.scrollIntoView({ behavior: "smooth", block: "center" });
    elements.claimUrl.focus({ preventScroll: true });
  });

  function showError() {
    elements.loading.hidden = true;
    elements.error.hidden = false;
    document.querySelector("#listing-detail")?.setAttribute("aria-busy", "false");
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    toastTimer = setTimeout(() => elements.toast.classList.remove("is-visible"), 3200);
  }

  elements.theme.addEventListener("click", () => { preferences.theme = preferences.theme === "dark" ? "light" : "dark"; savePreferences(); applyPreferences(); });
  elements.language.addEventListener("click", () => {
    preferences.language = preferences.language === "zh" ? "en" : "zh";
    savePreferences();
    if (/^\/(?:product|profile)\//.test(window.location.pathname)) {
      window.location.assign(urlWithLanguage(window.location.href).href);
      return;
    }
    applyPreferences();
  });
  elements.share.addEventListener("click", async () => {
    const share = {
      ...shareHeadline(),
      url: location.href,
      image: model.icon,
      description: localizedModelDescription(),
      card: { period: "all", capturedAt: cardStamp() },
    };
    if (window.RankoffShare?.open) {
      window.RankoffShare.open({ ...share, language: preferences.language, onStatus: showToast });
      return;
    }
    try {
      if (navigator.share) return await navigator.share(share);
      await navigator.clipboard.writeText(`${share.text} ${share.url}`);
      showToast(text("copied"));
    } catch (error) { if (error?.name !== "AbortError") showToast(text("copied")); }
  });

  applyPreferences();
  void loadListing();
})();
