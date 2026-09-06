(() => {
  "use strict";

  const STORE_KEY = "rankoff-mvp-demo-v3";
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  const initialCanonical = canonicalLink?.href || "https://rankoff.my/categories";
  const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
  const boardCurrencyFormat = (code) => new Intl.NumberFormat(code === "MYR" ? "en-MY" : "en-US", { style: "currency", currency: code || "USD", maximumFractionDigits: 0 });
  let currency = boardCurrencyFormat("USD");
  const categoryConfig = [
    { id: "AI", name: "AI Tools & Agents", zh: "AI 工具与智能体", icon: "✧", members: ["AI", "Agents", "AIMedia"] },
    { id: "Creators", name: "Creators & Talent", zh: "创作者与艺人", icon: "✦", members: ["Creators", "Attention", "People"] },
    { id: "Property", name: "Property & Agents", zh: "房产与经纪", icon: "⌂", members: ["Property", "RealEstate", "Travel"] },
    { id: "Interior", name: "Interior & Renovation", zh: "室内设计与装修", icon: "▤", members: ["Interior"] },
    { id: "Beauty", name: "Beauty & Wellness", zh: "美容与养生", icon: "✿", members: ["Beauty"] },
    { id: "Health", name: "Health & Medical", zh: "健康与医疗", icon: "✚", members: ["Health"] },
    { id: "Sports", name: "Sports & Fitness", zh: "运动与健身", icon: "◐", members: ["Sports"] },
    { id: "Food", name: "Food & Beverage", zh: "餐饮", icon: "◍", members: ["Food"] },
    { id: "Marketing", name: "Marketing & Advertising", zh: "营销与广告", icon: "↗", members: ["Marketing", "SEO", "Social", "Sales", "Agencies"] },
    { id: "Creative", name: "Creative & Production", zh: "创意与制作", icon: "✎", members: ["Creative", "Design", "Writing", "Audio", "News"] },
    { id: "Professional", name: "Professional Services", zh: "专业服务", icon: "◆", members: ["Professional", "Business", "Careers", "Productivity"] },
    { id: "Education", name: "Education & Training", zh: "教育与培训", icon: "✎+", members: ["Education", "Training", "Academy"] },
    { id: "Finance", name: "Finance & Insurance", zh: "金融与保险", icon: "◧", members: ["Finance", "Insurance", "Banking", "Crypto"] },
    { id: "Electronics", name: "Electronics & Repair", zh: "电子与维修", icon: "▣", members: ["Electronics", "Repair"] },
    { id: "Retail", name: "Retail & Ecommerce", zh: "零售与电商", icon: "◇", members: ["Retail", "Ecommerce"] },
    { id: "Construction", name: "Hardware & Construction", zh: "五金与建筑", icon: "▦+", members: ["Construction", "Hardware"] },
    { id: "Home", name: "Home Services", zh: "家居服务", icon: "⚙", members: ["Home"] },
    { id: "Automotive", name: "Automotive", zh: "汽车", icon: "◎", members: ["Automotive", "Auto"] },
    { id: "Other", name: "Other", zh: "其他", icon: "•••", members: ["Other", "Developer", "Security", "Games", "Domains", "Discovery"] },
  ];
  const categoryAliases = Object.freeze(categoryConfig.reduce((aliases, config) => {
    aliases[config.id.toLowerCase()] = config.id;
    config.members.forEach((member) => { aliases[member.toLowerCase()] = config.id; });
    return aliases;
  }, {}));
  const fallbackListings = [
    { id: "model-harbor", title: "Model Harbor", description: "A release desk for production AI models, approvals, and customer notices.", descriptionZh: "用于管理生产环境 AI 模型、审批与客户通知的发布工作台。", url: "https://modelharbor.example", category: "Agents", bid: 2480, todayBid: 620, clicks: 2840, age: "18h" },
    { id: "trackline", title: "Trackline", description: "Campaign reporting for teams that need a clean answer to what moved.", descriptionZh: "为需要清楚判断成效来源的团队提供营销活动报告。", url: "https://trackline.example", category: "Marketing", bid: 2160, todayBid: 810, clicks: 1910, age: "7h" },
    { id: "patchnote", title: "Patchnote", description: "Release notes that turn product changes into useful customer updates.", descriptionZh: "把产品更新变成实用客户通知的版本说明工具。", url: "https://patchnote.example", category: "Developer", bid: 1930, todayBid: 554, clicks: 2180, age: "1d" },
    { id: "canvas-relay", title: "Canvas Relay", description: "Creative hand-offs, feedback, and approved files in one focused space.", descriptionZh: "在一个专注空间中完成创意交接、反馈与已批准文件管理。", url: "https://canvasrelay.example", category: "Design", bid: 1180, todayBid: 296, clicks: 1490, age: "2d" },
    { id: "switchboard", title: "Switchboard", description: "A routing layer for the AI tools already inside an operator stack.", descriptionZh: "为运营工具栈中已有的 AI 工具提供统一路由层。", url: "https://switchboard.example", category: "Agents", bid: 940, todayBid: 735, clicks: 1210, age: "4h" },
    { id: "focus-coda", title: "Focus Coda", description: "A launch-day workspace for teams shipping more often than once a quarter.", descriptionZh: "为高频发布团队打造的上线日工作空间。", url: "https://focuscoda.example", category: "Productivity", bid: 860, todayBid: 241, clicks: 1080, age: "12h" },
    { id: "sandbox-kit", title: "Sandbox Kit", description: "Disposable preview environments for showing work before it goes live.", descriptionZh: "用于在正式上线前展示工作的临时预览环境。", url: "https://sandboxkit.example", category: "Developer", bid: 650, todayBid: 202, clicks: 920, age: "3d" },
    { id: "palette-runner", title: "Palette Runner", description: "Brand-safe creative variants for small teams that need fast campaigns.", descriptionZh: "为需要快速制作营销素材的小团队生成符合品牌规范的创意版本。", url: "https://paletterunner.example", category: "Design", bid: 520, todayBid: 188, clicks: 730, age: "9h" },
  ];

  const elements = {
    root: document.documentElement,
    allRows: [],
    todayRows: [],
    activeWindow: "all",
    language: "en",
    mode: /^https?:$/.test(window.location.protocol) ? "loading" : "preview",
    status: document.querySelector("[data-category-status]"),
    count: document.querySelector("[data-category-count]"),
    active: document.querySelector("[data-active-categories]"),
    grid: document.querySelector("[data-category-grid]"),
    windowButtons: Array.from(document.querySelectorAll("[data-category-window]")),
    languageToggle: document.querySelector("[data-language-toggle]"),
    themeToggle: document.querySelector("[data-theme-toggle]"),
  };

  const staticCopy = {
    en: { skipCategories: "Skip to categories", board: "Board", categories: "Categories", about: "About", footerParent: "A Brandup Marketing product", rules: "Rules", terms: "Terms", privacy: "Privacy", payments: "Payments", seeBoard: "See board", browseMarkets: "Browse the markets", heroCopy: "Every category has its own ranking. Choose one to see its leaders.", activeHeading: "Most active categories", allHeading: "All categories", allCopy: "Choose a market to view its live board." },
    zh: { skipCategories: "跳至分类", board: "榜单", categories: "分类", about: "关于", footerParent: "Brandup Marketing 旗下产品", rules: "规则", terms: "条款", privacy: "隐私", payments: "付款", seeBoard: "查看榜单", browseMarkets: "浏览市场", heroCopy: "每个类别都有自己的榜单。选择一个市场，看看谁在领先。", activeHeading: "最活跃的分类", allHeading: "全部分类", allCopy: "选择一个市场，查看其实时榜单。" },
  };
  const pageMetadata = {
    en: {
      title: "RANKOFF | Categories",
      description: "Explore Rankoff categories and see which products lead each sponsored market.",
      socialDescription: "Every category has its own public sponsored leaderboard.",
    },
    zh: {
      title: "RANKOFF｜分类",
      description: "浏览 Rankoff 分类，查看每个赞助市场中领先的产品。",
      socialDescription: "每个分类都有自己的公开赞助榜单。",
    },
  };
  const accessibilityCopy = {
    en: {
      home: "RANKOFF home", tagline: "RANKOFF — Bid your way to number one", navigation: "Main navigation", search: "Search products and categories",
      boardStatus: "Board status", timeframe: "Category timeframe", allMarkets: "All market categories", switchChinese: "Switch to Chinese", switchLight: "Switch to light theme", switchDark: "Switch to dark theme",
    },
    zh: {
      home: "RANKOFF 首页", tagline: "RANKOFF — 竞价登上第 1 名", navigation: "主导航", search: "搜索产品和分类",
      boardStatus: "榜单状态", timeframe: "分类时间范围", allMarkets: "全部市场分类", switchChinese: "切换为中文", switchLight: "切换至浅色主题", switchDark: "切换至深色主题",
    },
  };

  function languageFromUrl() {
    try {
      const value = new URL(window.location.href).searchParams.get("lang");
      return value === "zh" || value === "en" ? value : "";
    } catch { return ""; }
  }

  function readPreferences() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORE_KEY));
      elements.language = languageFromUrl() || (saved?.language === "zh" ? "zh" : "en");
      elements.root.dataset.theme = saved?.theme === "light" ? "light" : "dark";
    } catch {
      elements.language = languageFromUrl() || "en";
      elements.root.dataset.theme = "dark";
    }
  }

  function label(config) { return elements.language === "zh" ? config.zh : config.name; }
  function canonicalCategory(category) { return categoryAliases[String(category || "").toLowerCase()] || "Other"; }
  function escapeText(value) { return String(value || ""); }
  function initials(title) { return escapeText(title).split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "RK"; }
  function ageLabel(age) {
    const value = escapeText(age);
    if (!value) return elements.language === "zh" ? "最近上榜" : "Claimed recently";
    const timestamp = Date.parse(value);
    if (Number.isFinite(timestamp)) {
      const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
      if (elements.language === "zh") {
        if (minutes < 1) return "刚刚上榜";
        if (minutes < 60) return `${minutes} 分钟前上榜`;
        if (minutes < 1_440) return `${Math.floor(minutes / 60)} 小时前上榜`;
        return `${Math.floor(minutes / 1_440)} 天前上榜`;
      }
      if (minutes < 1) return "Claimed just now";
      if (minutes < 60) return `Claimed ${minutes}m ago`;
      if (minutes < 1_440) return `Claimed ${Math.floor(minutes / 60)}h ago`;
      const days = Math.floor(minutes / 1_440);
      return `Claimed ${days} day${days === 1 ? "" : "s"} ago`;
    }
    if (value === "1d") return elements.language === "zh" ? "1 天前上榜" : "Claimed 1 day ago";
    const match = value.match(/^(\d+)([hm])$/i);
    if (match) {
      const amount = Number(match[1]);
      if (elements.language === "zh") return `${match[1]} ${match[2].toLowerCase() === "h" ? "小时前上榜" : "分钟前上榜"}`;
      const unit = match[2].toLowerCase() === "h" ? (amount === 1 ? "hour" : "hours") : (amount === 1 ? "minute" : "minutes");
      return `Claimed ${match[1]} ${unit} ago`;
    }
    return elements.language === "zh" ? `${value} 前上榜` : `Claimed ${value} ago`;
  }

  function normalizeRows(payload, period) {
    return Array.isArray(payload?.rankings) ? payload.rankings.map((entry) => ({
      id: String(entry?.listing?.id || ""),
      identity: String(entry?.listing?.hostname || ""),
      title: String(entry?.listing?.title || entry?.listing?.hostname || "Listing"),
      description: String(entry?.listing?.description || ""),
      url: String(entry?.listing?.url || "https://rankoff.my"),
      category: String(entry?.listing?.category || "Other"),
      bid: Math.max(1, Math.round(Number(entry?.bid?.amount_minor || 100) / 100)),
      clicks: Math.max(0, Math.round(Number(entry?.clicks || 0))),
      age: entry?.bid?.settled_at || "",
      period,
    })) : [];
  }

  function fallbackRows() {
    // Demo listings are fictional companies with four-figure bids. They must
    // never stand in for the real board on a served origin — a failed fetch
    // used to leave them on screen as though they were paying merchants.
    // app.js:270 already takes this precaution for the board itself.
    if (/^https?:$/.test(window.location.protocol)) return [];
    return fallbackListings.map((listing) => ({ ...listing, bid: listing.bid, period: "all" }));
  }

  function mergeRows(allRows, todayRows) {
    const todayById = new Map(todayRows.map((row) => [row.id, row]));
    // A listing the 24h payload does not return took nothing in 24 hours.
    // The old fallbacks invented a quarter of its lifetime total and a fifth
    // of its lifetime clicks, and the board printed them as fact.
    return allRows.map((row) => ({ ...row, todayBid: todayById.get(row.id)?.bid ?? 0, todayClicks: todayById.get(row.id)?.clicks ?? 0 }));
  }

  function selectedRows() {
    if (elements.activeWindow !== "today") return elements.allRows;
    // No 24h bid means the listing is not on the 24h board at all, so the
    // market falls through to its own empty state instead of a made-up price.
    return elements.allRows
      .filter((row) => Number(row.todayBid) > 0)
      .map((row) => ({ ...row, bid: row.todayBid, clicks: row.todayClicks || 0 }));
  }

  function categoryRows(id) {
    return selectedRows().filter((row) => canonicalCategory(row.category) === id).sort((a, b) => b.bid - a.bid || a.title.localeCompare(b.title));
  }

  function descriptionFor(row) {
    if (elements.language === "zh" && row.descriptionZh) return row.descriptionZh;
    if (row.description) return row.description;
    return elements.language === "zh" ? "Rankoff 上的赞助条目。" : "Sponsored listing on Rankoff.";
  }

  function categoryListingHref(row) {
    const identity = String(row?.identity || "");
    const separator = identity.indexOf(":");
    if (separator > 0) {
      const platform = identity.slice(0, separator);
      const handle = identity.slice(separator + 1);
      if (/^(?:instagram|tiktok|facebook|x|linktree|youtube|linkedin|xiaohongshu)$/.test(platform)
        && /^[a-z0-9](?:[a-z0-9._-]{0,58}[a-z0-9])?$/.test(handle)) {
        return `/profile/${platform}/${handle}`;
      }
    } else if (/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(identity)) {
      return `/product/${identity}`;
    }
    return `/listing?id=${encodeURIComponent(row.id)}`;
  }

  function hrefFor(id) { return `/?category=${encodeURIComponent(id)}#board`; }

  function iconFor(config, className = "category-icon") {
    const icon = document.createElement("span");
    icon.className = className;
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = config.icon;
    return icon;
  }

  function logoFor(row) {
    const logo = document.createElement("span");
    logo.className = "category-logo";
    logo.textContent = initials(row.title);
    try {
      const url = new URL(row.url);
      if (!url.hostname.endsWith(".example")) {
        const image = document.createElement("img");
        image.alt = "";
        image.loading = "lazy";
        image.src = `${url.origin}/favicon.ico`;
        image.addEventListener("error", () => image.remove(), { once: true });
        logo.append(image);
      }
    } catch { /* keep initials */ }
    return logo;
  }

  function renderActive() {
    if (!elements.active) return;
    const section = elements.active.closest(".active-section");
    const ranked = categoryConfig
      .map((config, index) => ({ config, rows: categoryRows(config.id), index }))
      .filter(({ rows }) => rows.length)
      .sort((a, b) => b.rows.length - a.rows.length || b.rows[0].bid - a.rows[0].bid || a.index - b.index)
      .slice(0, 3);

    // With one listing per market every row reads "1 listing · highest bid RM x"
    // and names markets the grid below already shows. The block earns its place
    // once a market actually holds more than one listing.
    const worthShowing = ranked.some(({ rows }) => rows.length > 1);
    if (section) section.hidden = !worthShowing;
    if (!worthShowing) return void elements.active.replaceChildren();

    if (!ranked.length) {
      const empty = document.createElement("p");
      empty.className = "active-empty";
      empty.textContent = elements.language === "zh" ? "还没有活跃分类。" : "No active categories yet.";
      elements.active.replaceChildren(empty);
      return;
    }

    elements.active.replaceChildren(...ranked.map(({ config, rows }) => {
      const link = document.createElement("a");
      link.className = "active-category";
      link.href = hrefFor(config.id);
      link.append(iconFor(config));
      const copy = document.createElement("div");
      const heading = document.createElement("h3");
      heading.textContent = label(config);
      const detail = document.createElement("p");
      detail.textContent = elements.language === "zh" ? `${rows.length} 个上榜产品 · 最高出价 ${currency.format(rows[0].bid)}` : `${rows.length} ${rows.length === 1 ? "listing" : "listings"} · highest bid ${currency.format(rows[0].bid)}`;
      copy.append(heading, detail);
      const time = document.createElement("time");
      time.textContent = ageLabel(rows[0].age);
      link.append(copy, time);
      return link;
    }));
  }

  function renderCard(config) {
    const card = document.createElement("article");
    card.className = "category-card";
    const head = document.createElement("div");
    head.className = "category-card-head";
    head.append(iconFor(config));
    const title = document.createElement("h3");
    title.textContent = label(config);
    const view = document.createElement("a");
    view.href = hrefFor(config.id);
    view.textContent = elements.language === "zh" ? "查看榜单 →" : "View board →";
    head.append(title, view);
    const rankings = document.createElement("div");
    rankings.className = "category-rankings";
    const rows = categoryRows(config.id).slice(0, 3);
    if (!rows.length) {
      const empty = document.createElement("div");
      empty.className = "category-empty";
      const strong = document.createElement("strong");
      strong.textContent = elements.language === "zh" ? "等待首个条目" : "Waiting for the first listing";
      const copy = document.createElement("span");
      copy.textContent = elements.language === "zh" ? "这个市场将在首个有效出价后开始排名。" : "This market starts ranking after its first valid bid.";
      // "View board →" already sits in this card's header pointing at the same
      // URL. Two calls to action, one destination, fifteen cards.
      empty.append(strong, copy);
      rankings.append(empty);
    } else {
      rows.forEach((row, index) => {
        const link = document.createElement("a");
        link.className = "category-rank-row";
        link.href = categoryListingHref(row);
        const rank = document.createElement("span");
        rank.className = "category-rank";
        rank.textContent = `#${index + 1}`;
        const copy = document.createElement("span");
        copy.className = "category-rank-copy";
        const name = document.createElement("strong");
        name.textContent = row.title;
        const description = document.createElement("span");
        description.textContent = descriptionFor(row);
        copy.append(name, description);
        const bid = document.createElement("strong");
        bid.className = "category-rank-bid";
        bid.textContent = currency.format(row.bid);
        link.append(rank, logoFor(row), copy, bid);
        rankings.append(link);
      });
    }
    card.append(head, rankings);
    return card;
  }

  function urlWithLanguage(href, nextLanguage = elements.language) {
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
      if (!raw || raw.startsWith("#")) return;
      try {
        const url = new URL(raw, window.location.href);
        if (url.origin !== window.location.origin) return;
        anchor.href = /^\/(?:legal|answers\/)/.test(url.pathname) ? urlWithLanguage(url, "en").href : urlWithLanguage(url).href;
      } catch { /* leave malformed or non-web links untouched */ }
    });
  }

  function setMetaContent(selector, value) { document.querySelector(selector)?.setAttribute("content", value); }

  function updateMetadata() {
    const metadata = pageMetadata[elements.language];
    const canonical = urlWithLanguage(initialCanonical);
    document.title = metadata.title;
    canonicalLink?.setAttribute("href", canonical.href);
    setMetaContent('meta[name="description"]', metadata.description);
    setMetaContent('meta[property="og:locale"]', elements.language === "zh" ? "zh_MY" : "en_MY");
    setMetaContent('meta[property="og:title"]', metadata.title);
    setMetaContent('meta[property="og:description"]', metadata.socialDescription);
    setMetaContent('meta[property="og:url"]', canonical.href);
    setMetaContent('meta[name="twitter:title"]', metadata.title);
    setMetaContent('meta[name="twitter:description"]', metadata.socialDescription);
    document.querySelector('link[rel="alternate"][hreflang="en"]')?.setAttribute("href", urlWithLanguage(initialCanonical, "en").href);
    document.querySelector('link[rel="alternate"][hreflang="zh-Hans"]')?.setAttribute("href", urlWithLanguage(initialCanonical, "zh").href);
    document.querySelector('link[rel="alternate"][hreflang="x-default"]')?.setAttribute("href", urlWithLanguage(initialCanonical, "en").href);
  }

  function updateAccessibility() {
    const accessible = accessibilityCopy[elements.language];
    document.querySelectorAll(".brand, .footer-brand").forEach((node) => node.setAttribute("aria-label", accessible.home));
    document.querySelector(".brand-final-logo")?.setAttribute("alt", accessible.tagline);
    document.querySelector(".categories-nav")?.setAttribute("aria-label", accessible.navigation);
    document.querySelector(".search-toggle")?.setAttribute("aria-label", accessible.search);
    document.querySelector(".category-status")?.setAttribute("aria-label", accessible.boardStatus);
    document.querySelector(".time-tabs")?.setAttribute("aria-label", accessible.timeframe);
    elements.grid?.setAttribute("aria-label", accessible.allMarkets);
  }

  function render() {
    applyLanguageAttribute();
    const rows = selectedRows();
    const labels = staticCopy[elements.language];
    document.querySelectorAll("[data-copy]").forEach((node) => { if (labels[node.dataset.copy]) node.textContent = labels[node.dataset.copy]; });
    updateMetadata();
    updateAccessibility();
    if (elements.status) elements.status.textContent = elements.language === "zh"
      ? (elements.mode === "production" ? "实时榜单" : elements.mode === "api" ? "已连接预览" : elements.mode === "loading" ? "正在载入榜单" : elements.mode === "error" ? "榜单暂时无法读取" : "预览榜单")
      : (elements.mode === "production" ? "Live board" : elements.mode === "api" ? "Connected preview" : elements.mode === "loading" ? "Loading board" : elements.mode === "error" ? "Board unavailable" : "Preview board");
    if (elements.count) elements.count.textContent = elements.mode === "loading"
      ? "—"
      : elements.mode === "error"
        ? (elements.language === "zh" ? "请稍后重试" : "Try again shortly")
        : elements.language === "zh" ? `${rows.length} 个条目` : `${rows.length} ${rows.length === 1 ? "listing" : "listings"}`;
    elements.windowButtons.forEach((button) => {
      const active = button.dataset.categoryWindow === elements.activeWindow;
      button.setAttribute("aria-pressed", String(active));
      button.textContent = elements.language === "zh" ? (button.dataset.categoryWindow === "today" ? "今日" : "全部时间") : (button.dataset.categoryWindow === "today" ? "Today" : "All-time");
    });
    if (elements.languageToggle) {
      elements.languageToggle.textContent = elements.language === "zh" ? "EN" : "中文";
      elements.languageToggle.setAttribute("aria-label", elements.language === "zh" ? "切换为英文" : accessibilityCopy.en.switchChinese);
      elements.languageToggle.setAttribute("aria-pressed", String(elements.language === "zh"));
    }
    if (elements.themeToggle) {
      const dark = elements.root.dataset.theme !== "light";
      const accessible = accessibilityCopy[elements.language];
      elements.themeToggle.textContent = elements.language === "zh" ? (dark ? "浅色" : "深色") : (dark ? "Light" : "Dark");
      elements.themeToggle.setAttribute("aria-label", dark ? accessible.switchLight : accessible.switchDark);
      elements.themeToggle.setAttribute("aria-pressed", String(dark));
    }
    renderActive();
    renderGrid();
    window.dispatchEvent(new CustomEvent("rankoff:content-updated"));
    syncInternalLinks();
  }

  // Four listings across nineteen markets: a page that opens on a wall of
  // "Waiting for the first listing" cards buries the markets that actually
  // rank. Populated markets come first, most listings then highest bid; the
  // empty ones fold under one disclosure so they stay reachable for whoever
  // wants to take a first place. With nothing populated, the grid shows all.
  function renderGrid() {
    if (!elements.grid) return;
    const cards = (config) => {
      const card = renderCard(config);
      card.dataset.categoryId = config.id;
      return card;
    };
    const scored = categoryConfig.map((config, index) => ({ config, rows: categoryRows(config.id), index }));
    const populated = scored.filter(({ rows }) => rows.length)
      .sort((a, b) => b.rows.length - a.rows.length || b.rows[0].bid - a.rows[0].bid || a.index - b.index);
    const empty = scored.filter(({ rows }) => !rows.length);
    if (!populated.length || !empty.length) {
      elements.grid.replaceChildren(...categoryConfig.map(cards));
      elements.moreMarkets?.remove();
      elements.moreMarkets = null;
      return;
    }
    elements.grid.replaceChildren(...populated.map(({ config }) => cards(config)));
    const details = elements.moreMarkets || document.createElement("details");
    details.className = "category-more";
    const summary = document.createElement("summary");
    summary.textContent = elements.language === "zh"
      ? `查看另外 ${empty.length} 个尚未有条目的市场`
      : `Explore ${empty.length} more markets waiting for a first listing`;
    const grid = document.createElement("div");
    grid.className = "category-grid";
    grid.append(...empty.map(({ config }) => cards(config)));
    details.replaceChildren(summary, grid);
    if (!elements.moreMarkets) elements.grid.after(details);
    elements.moreMarkets = details;
  }

  function applyLanguageAttribute() {
    elements.root.lang = elements.language === "zh" ? "zh-Hans" : "en";
  }

  function savePreferences() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORE_KEY)) || {};
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ ...saved, theme: elements.root.dataset.theme, language: elements.language }));
    } catch { /* preference is optional */ }
  }

  async function loadBoard() {
    elements.allRows = fallbackRows();
    elements.todayRows = fallbackRows().map((row) => ({ ...row, bid: row.todayBid, clicks: row.todayClicks || 0, period: "today" }));
    if (!/^https?:$/.test(window.location.protocol)) return;
    try {
      const [allResult, todayResult] = await Promise.allSettled([
        fetch("./api/v1/board?board=global&period=all&limit=50", { headers: { Accept: "application/json" }, cache: "no-store" }).then((response) => {
          if (!response.ok) throw new Error(`all board ${response.status}`);
          return response.json();
        }),
        fetch("./api/v1/board?board=global&period=today&limit=50", { headers: { Accept: "application/json" }, cache: "no-store" }).then((response) => {
          if (!response.ok) throw new Error(`today board ${response.status}`);
          return response.json();
        }),
      ]);
      if (allResult.status !== "fulfilled") {
        elements.mode = "error";
        render();
        return;
      }
      const allPayload = allResult.value;
      const todayPayload = todayResult.status === "fulfilled" ? todayResult.value : { rankings: [] };
      currency = boardCurrencyFormat(String(allPayload.board?.currency || "USD").toUpperCase());
      const allRows = normalizeRows(allPayload, "all");
      const todayRows = normalizeRows(todayPayload, "today");
      const productionBoard = allPayload.mode === "production";
      elements.allRows = mergeRows(allRows, todayRows);
      elements.todayRows = todayRows;
      elements.mode = productionBoard ? "production" : "api";
      render();
    } catch {
      elements.mode = "error";
      render();
    }
  }

  readPreferences();
  savePreferences();
  syncLanguageUrl();
  render();
  void loadBoard();
  elements.windowButtons.forEach((button) => button.addEventListener("click", () => {
    elements.activeWindow = button.dataset.categoryWindow === "today" ? "today" : "all";
    render();
  }));
  elements.languageToggle?.addEventListener("click", () => {
    elements.language = elements.language === "zh" ? "en" : "zh";
    savePreferences();
    syncLanguageUrl();
    render();
  });
  elements.themeToggle?.addEventListener("click", () => {
    elements.root.dataset.theme = elements.root.dataset.theme === "light" ? "dark" : "light";
    savePreferences();
    render();
  });
})();
