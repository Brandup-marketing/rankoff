(() => {
  "use strict";

  const STORE_KEY = "rankoff-mvp-demo-v3";
  const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
  const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const categoryConfig = [
    { id: "Agents", name: "AI Agents & Infrastructure", zh: "AI 智能体与基础设施", icon: "✦" },
    { id: "SEO", name: "SEO & AI Visibility", zh: "SEO 与 AI 曝光", icon: "⌕" },
    { id: "Marketing", name: "Marketing & Advertising", zh: "营销与广告", icon: "◒" },
    { id: "Crypto", name: "Crypto, Web3 & Investing", zh: "加密、Web3 与投资", icon: "₿" },
    { id: "Developer", name: "Developer Tools", zh: "开发者工具", icon: "⌘" },
    { id: "Business", name: "Business, Finance & Legal", zh: "商业、金融与法律", icon: "◌" },
    { id: "Security", name: "Security, Privacy & Compliance", zh: "安全、隐私与合规", icon: "◇" },
    { id: "Health", name: "Health, Fitness & Wellness", zh: "健康、健身与生活方式", icon: "♡" },
    { id: "Social", name: "Social Media & Creator Tools", zh: "社交媒体与创作者工具", icon: "⌯" },
    { id: "Attention", name: "Leaderboards & Attention Markets", zh: "排行榜与注意力市场", icon: "♜" },
    { id: "Careers", name: "Hiring, Jobs & Careers", zh: "招聘、工作与职业", icon: "▣" },
    { id: "Education", name: "Education & Learning", zh: "教育与学习", icon: "⌂" },
    { id: "Agencies", name: "Agencies, Studios & Services", zh: "代理机构、工作室与服务", icon: "◎" },
    { id: "Ecommerce", name: "Ecommerce & Retail", zh: "电商与零售", icon: "□" },
    { id: "Domains", name: "Domains & Web Assets", zh: "域名与网络资产", icon: "◉" },
    { id: "Games", name: "Games & Entertainment", zh: "游戏与娱乐", icon: "⌁" },
    { id: "People", name: "People & Profiles", zh: "人物与个人资料", icon: "♙" },
    { id: "Productivity", name: "Productivity & Personal Tools", zh: "效率与个人工具", icon: "＋" },
    { id: "Design", name: "Design & Creative", zh: "设计与创意", icon: "◇" },
    { id: "Writing", name: "Writing & Content", zh: "写作与内容", icon: "╱" },
    { id: "Discovery", name: "Directories, Launch & Discovery", zh: "目录、发布与探索", icon: "◈" },
    { id: "AIMedia", name: "AI Media Generation", zh: "AI 媒体生成", icon: "✧" },
    { id: "Audio", name: "Audio, Voice & Podcasting", zh: "音频、语音与播客", icon: "◖" },
    { id: "Sales", name: "Sales & Lead Generation", zh: "销售与潜客获取", icon: "◎" },
    { id: "Travel", name: "Travel, Local & Lifestyle", zh: "旅行、本地与生活方式", icon: "⌖" },
    { id: "RealEstate", name: "Real Estate & Property", zh: "房地产与物业", icon: "⌂" },
    { id: "News", name: "Media & News", zh: "媒体与新闻", icon: "▤" },
    { id: "Hardware", name: "Hardware & Devices", zh: "硬件与设备", icon: "▰" },
    { id: "Other", name: "Other", zh: "其他", icon: "•" },
  ];
  const fallbackListings = [
    { id: "model-harbor", title: "Model Harbor", description: "A release desk for production AI models, approvals, and customer notices.", url: "https://modelharbor.example", category: "Agents", bid: 2480, todayBid: 620, clicks: 2840, age: "18h" },
    { id: "trackline", title: "Trackline", description: "Campaign reporting for teams that need a clean answer to what moved.", url: "https://trackline.example", category: "Marketing", bid: 2160, todayBid: 810, clicks: 1910, age: "7h" },
    { id: "patchnote", title: "Patchnote", description: "Release notes that turn product changes into useful customer updates.", url: "https://patchnote.example", category: "Developer", bid: 1930, todayBid: 554, clicks: 2180, age: "1d" },
    { id: "canvas-relay", title: "Canvas Relay", description: "Creative hand-offs, feedback, and approved files in one focused space.", url: "https://canvasrelay.example", category: "Design", bid: 1180, todayBid: 296, clicks: 1490, age: "2d" },
    { id: "switchboard", title: "Switchboard", description: "A routing layer for the AI tools already inside an operator stack.", url: "https://switchboard.example", category: "Agents", bid: 940, todayBid: 735, clicks: 1210, age: "4h" },
    { id: "focus-coda", title: "Focus Coda", description: "A launch-day workspace for teams shipping more often than once a quarter.", url: "https://focuscoda.example", category: "Productivity", bid: 860, todayBid: 241, clicks: 1080, age: "12h" },
    { id: "sandbox-kit", title: "Sandbox Kit", description: "Disposable preview environments for showing work before it goes live.", url: "https://sandboxkit.example", category: "Developer", bid: 650, todayBid: 202, clicks: 920, age: "3d" },
    { id: "palette-runner", title: "Palette Runner", description: "Brand-safe creative variants for small teams that need fast campaigns.", url: "https://paletterunner.example", category: "Design", bid: 520, todayBid: 188, clicks: 730, age: "9h" },
  ];

  const elements = {
    root: document.documentElement,
    allRows: [],
    todayRows: [],
    activeWindow: "all",
    language: "en",
    mode: "preview",
    status: document.querySelector("[data-category-status]"),
    count: document.querySelector("[data-category-count]"),
    active: document.querySelector("[data-active-categories]"),
    grid: document.querySelector("[data-category-grid]"),
    windowButtons: Array.from(document.querySelectorAll("[data-category-window]")),
    languageToggle: document.querySelector("[data-language-toggle]"),
    themeToggle: document.querySelector("[data-theme-toggle]"),
  };

  const staticCopy = {
    en: { skipCategories: "Skip to categories", board: "Board", categories: "Categories", about: "About", rules: "Rules", privacy: "Privacy", seeBoard: "See board", browseMarkets: "Browse the markets", heroCopy: "Every category has its own ranking. Choose one to see its leaders.", activeHeading: "Most active categories", allHeading: "All categories", allCopy: "Choose a market to view its live board." },
    zh: { skipCategories: "跳至分类", board: "榜单", categories: "分类", about: "关于", rules: "规则", privacy: "隐私", seeBoard: "查看榜单", browseMarkets: "浏览市场", heroCopy: "每个类别都有自己的榜单。选择一个市场，看看谁在领先。", activeHeading: "最活跃的分类", allHeading: "全部分类", allCopy: "选择一个市场，查看其实时榜单。" },
  };

  function readPreferences() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORE_KEY));
      elements.language = saved?.language === "zh" ? "zh" : "en";
      elements.root.dataset.theme = saved?.theme === "light" ? "light" : "dark";
    } catch {
      elements.root.dataset.theme = "dark";
    }
  }

  function label(config) { return elements.language === "zh" ? config.zh : config.name; }
  function escapeText(value) { return String(value || ""); }
  function initials(title) { return escapeText(title).split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "RK"; }
  function ageLabel(age) {
    const value = escapeText(age);
    if (!value) return elements.language === "zh" ? "最近" : "Recently";
    if (value === "1d") return elements.language === "zh" ? "1 天前" : "1 day ago";
    const match = value.match(/^(\d+)([hm])$/i);
    if (match) {
      const amount = Number(match[1]);
      if (elements.language === "zh") return `${match[1]} ${match[2].toLowerCase() === "h" ? "小时前" : "分钟前"}`;
      const unit = match[2].toLowerCase() === "h" ? (amount === 1 ? "hour" : "hours") : (amount === 1 ? "minute" : "minutes");
      return `${match[1]} ${unit} ago`;
    }
    return elements.language === "zh" ? `${value} 前` : `${value} ago`;
  }

  function normalizeRows(payload, period) {
    return Array.isArray(payload?.rankings) ? payload.rankings.map((entry) => ({
      id: String(entry?.listing?.id || ""),
      title: String(entry?.listing?.title || entry?.listing?.hostname || "Listing"),
      description: String(entry?.listing?.description || "Sponsored listing on Rankoff."),
      url: String(entry?.listing?.url || "https://rankoff.my"),
      category: String(entry?.listing?.category || "Other"),
      bid: Math.max(1, Math.round(Number(entry?.bid?.amount_minor || 100) / 100)),
      clicks: Math.max(0, Math.round(Number(entry?.clicks || 0))),
      age: entry?.bid?.settled_at || "",
      period,
    })) : [];
  }

  function fallbackRows() {
    return fallbackListings.map((listing) => ({ ...listing, bid: listing.bid, period: "all" }));
  }

  function mergeRows(allRows, todayRows) {
    const todayById = new Map(todayRows.map((row) => [row.id, row]));
    return allRows.map((row) => ({ ...row, todayBid: todayById.get(row.id)?.bid || Math.max(1, Math.floor(row.bid / 4)), todayClicks: todayById.get(row.id)?.clicks || Math.floor(row.clicks / 5) }));
  }

  function selectedRows() {
    return elements.activeWindow === "today" ? elements.allRows.map((row) => ({ ...row, bid: row.todayBid || Math.max(1, Math.floor(row.bid / 4)), clicks: row.todayClicks || 0 })) : elements.allRows;
  }

  function categoryRows(id) {
    return selectedRows().filter((row) => row.category === id).sort((a, b) => b.bid - a.bid || a.title.localeCompare(b.title));
  }

  function hrefFor(id) { return `./index.html?category=${encodeURIComponent(id)}#board`; }

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
    const ranked = categoryConfig
      .map((config, index) => ({ config, rows: categoryRows(config.id), index }))
      .filter(({ rows }) => rows.length)
      .sort((a, b) => b.rows.length - a.rows.length || b.rows[0].bid - a.rows[0].bid || a.index - b.index)
      .slice(0, 3);

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
      const open = document.createElement("a");
      open.href = hrefFor(config.id);
      open.textContent = elements.language === "zh" ? "打开市场 →" : "Open market →";
      empty.append(strong, copy, open);
      rankings.append(empty);
    } else {
      rows.forEach((row, index) => {
        const link = document.createElement("a");
        link.className = "category-rank-row";
        link.href = `./listing.html?id=${encodeURIComponent(row.id)}`;
        const rank = document.createElement("span");
        rank.className = "category-rank";
        rank.textContent = `#${index + 1}`;
        const copy = document.createElement("span");
        copy.className = "category-rank-copy";
        const name = document.createElement("strong");
        name.textContent = row.title;
        const description = document.createElement("span");
        description.textContent = row.description;
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

  function render() {
    const rows = selectedRows();
    const labels = staticCopy[elements.language];
    document.querySelectorAll("[data-copy]").forEach((node) => { if (labels[node.dataset.copy]) node.textContent = labels[node.dataset.copy]; });
    elements.grid?.setAttribute("aria-label", elements.language === "zh" ? "全部市场分类" : "All market categories");
    if (elements.status) elements.status.textContent = elements.language === "zh"
      ? (elements.mode === "production" ? "实时榜单" : elements.mode === "api" ? "已连接预览" : "预览榜单")
      : (elements.mode === "production" ? "Live board" : elements.mode === "api" ? "Connected preview" : "Preview board");
    if (elements.count) elements.count.textContent = elements.language === "zh" ? `${rows.length} 个条目` : `${rows.length} ${rows.length === 1 ? "listing" : "listings"}`;
    elements.windowButtons.forEach((button) => {
      const active = button.dataset.categoryWindow === elements.activeWindow;
      button.setAttribute("aria-pressed", String(active));
      button.textContent = elements.language === "zh" ? (button.dataset.categoryWindow === "today" ? "今日" : "全部时间") : (button.dataset.categoryWindow === "today" ? "Today" : "All-time");
    });
    if (elements.languageToggle) {
      elements.languageToggle.textContent = elements.language === "zh" ? "CN" : "EN";
      elements.languageToggle.setAttribute("aria-label", elements.language === "zh" ? "Switch to English" : "切换中文");
      elements.languageToggle.setAttribute("aria-pressed", String(elements.language === "zh"));
    }
    if (elements.themeToggle) {
      const dark = elements.root.dataset.theme !== "light";
      elements.themeToggle.textContent = dark ? "Light" : "Dark";
      elements.themeToggle.setAttribute("aria-label", `Switch to ${dark ? "light" : "dark"} theme`);
      elements.themeToggle.setAttribute("aria-pressed", String(dark));
    }
    renderActive();
    elements.grid?.replaceChildren(...categoryConfig.map((config) => {
      const card = renderCard(config);
      card.dataset.categoryId = config.id;
      return card;
    }));
    window.dispatchEvent(new CustomEvent("rankoff:content-updated"));
  }

  function savePreferences() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORE_KEY)) || {};
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ ...saved, theme: elements.root.dataset.theme, language: elements.language }));
    } catch { /* preference is optional */ }
  }

  async function loadBoard() {
    elements.allRows = fallbackRows();
    elements.todayRows = fallbackRows().map((row) => ({ ...row, bid: row.todayBid, clicks: row.todayClicks || Math.floor(row.clicks / 5), period: "today" }));
    if (!/^https?:$/.test(window.location.protocol)) return;
    try {
      const [allResponse, todayResponse] = await Promise.all([
        fetch("./api/v1/board?board=global&period=all&limit=50", { headers: { Accept: "application/json" }, cache: "no-store" }),
        fetch("./api/v1/board?board=global&period=today&limit=50", { headers: { Accept: "application/json" }, cache: "no-store" }),
      ]);
      if (!allResponse.ok || !todayResponse.ok) return;
      const [allPayload, todayPayload] = await Promise.all([allResponse.json(), todayResponse.json()]);
      const allRows = normalizeRows(allPayload, "all");
      const todayRows = normalizeRows(todayPayload, "today");
      if (allRows.length) elements.allRows = mergeRows(allRows, todayRows);
      if (todayRows.length) elements.todayRows = todayRows;
      elements.mode = allPayload.mode === "production" ? "production" : "api";
      render();
    } catch { /* keep the local preview */ }
  }

  readPreferences();
  render();
  void loadBoard();
  elements.windowButtons.forEach((button) => button.addEventListener("click", () => {
    elements.activeWindow = button.dataset.categoryWindow === "today" ? "today" : "all";
    render();
  }));
  elements.languageToggle?.addEventListener("click", () => {
    elements.language = elements.language === "zh" ? "en" : "zh";
    savePreferences();
    render();
  });
  elements.themeToggle?.addEventListener("click", () => {
    elements.root.dataset.theme = elements.root.dataset.theme === "light" ? "dark" : "light";
    savePreferences();
    render();
  });
})();
