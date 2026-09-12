(() => {
  "use strict";

  const STORE_KEY = "rankoff-mvp-demo-v3";
  const root = document.documentElement;
  const languageToggle = document.querySelector("[data-language-toggle]");
  const themeToggle = document.querySelector("[data-theme-toggle]");
  const searchRedirect = document.querySelector("[data-search-redirect]");
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  const initialCanonical = canonicalLink?.href || "https://rankoff.my/about";
  const pageMetadata = {
    en: {
      title: "About RANKOFF",
      description: "How Rankoff works: Malaysian businesses pay to hold a spot on a public board, and every total and click stays visible.",
      socialDescription: "How Rankoff works: Malaysian businesses pay to hold a spot on a public board, and every total and click stays visible.",
    },
    zh: {
      title: "关于 RANKOFF",
      description: "Rankoff 怎么运作：马来西亚商家付费占据公开榜单的位置，每一笔付款和点击都公开可见。",
      socialDescription: "Rankoff 怎么运作：马来西亚商家付费占据公开榜单的位置，每一笔付款和点击都公开可见。",
    },
  };
  const accessibilityCopy = {
    en: {
      home: "RANKOFF home", tagline: "RANKOFF — public sponsored leaderboard", navigation: "Main navigation",
      search: "Search businesses and markets", switchChinese: "Switch to Chinese", switchLight: "Switch to light theme", switchDark: "Switch to dark theme",
      origin: "Rankoff origin", principles: "Rankoff principles",
    },
    zh: {
      home: "RANKOFF 首页", tagline: "RANKOFF — 竞价登上第 1 名", navigation: "主导航",
      search: "搜索商家和市场", switchChinese: "切换为中文", switchLight: "切换至浅色主题", switchDark: "切换至深色主题",
      origin: "Rankoff 起源", principles: "Rankoff 原则",
    },
  };
  const translations = new Map([
    ["Board", "榜单"], ["Categories", "分类"], ["About", "关于"],
    ["The story behind the board", "榜单背后的故事"], ["Attention has a price.", "注意力，明码标价。"], ["Make it visible.", "让它公开可见。"],
    ["RANKOFF is the public leaderboard for Malaysian businesses. Pay to hold a spot, show customers what you do, and keep it until someone pays more. One board, one rule: the highest total paid takes #1.", "RANKOFF 是马来西亚商家的公开榜单。付费占一个位置，把你的生意展示给顾客，直到有人付得更多。一个榜单，一条规则：累计付款最高者，就是第 1 名。"],
    ["Why it exists", "为什么有 Rankoff"], ["Rankoff started with one question.", "Rankoff 始于一个问题。"],
    ["What if a business could buy the top spot in the open, not in a hidden ad auction? What if everyone could see who is on top, what it cost, and who is getting the clicks?", "如果商家可以光明正大买下最显眼的位置，而不是在看不见的广告竞价里？如果每个人都能看到谁在榜首、花了多少钱、谁拿到了点击？"],
    ["Rankoff is the answer: a public board where the price, the position and the clicks are all on show, and every listing is labelled as sponsored.", "Rankoff 就是答案：一个公开榜单，价格、排名、点击全部公开，每个条目都标明是赞助。"],
    ["Visible", "可见"], ["Public by default", "默认公开"], ["Every listing shows its rank, its total paid, and what the business does.", "每个条目都显示排名、累计付款，以及这家生意是做什么的。"],
    ["Simple", "简明"], ["One clear rule", "一条规则"], ["Pay more than the listing above you and you move up. That is the whole rule.", "付得比上面那家多，你就往上走。规则就这么简单。"],
    ["Measured", "可衡量"], ["Evidence over promises", "数据胜于承诺"], ["Clicks are tracked redirects, counted by Rankoff and shown in public. No promises, just the number.", "点击是 Rankoff 记录的跳转次数，公开显示。不承诺效果，只给你数字。"],
    ["The board today", "榜单现况"], ["The board, right now.", "此刻的榜单。"],
    ["live listings", "上榜条目"], ["tracked clicks", "追踪点击"], ["top total paid", "最高累计付款"],
    ["How it works", "运作方式"], ["The board keeps moving.", "榜单一直在动。"],
    ["List your business", "让生意上榜"], ["Compete in public", "公开竞争"], ["See what it earns", "看看回报"],
    ["Skip to content", "跳至正文"], ["Now", "现在"], ["Enter your website, choose a market, and pay from US$1.", "输入网站、选择市场，US$1 起付款。"],
    ["Then", "随后"], ["Once payment settles, your business, your total and your position are on the board for everyone to see.", "付款确认后，你的生意、累计付款和排名就公开在榜单上，人人可见。"],
    ["Next", "接下来"], ["Tracked clicks count redirects from Rankoff to listed websites. Repeat and automated clicks may be included.", "追踪点击统计从 Rankoff 跳转到商家网站的次数，可能包含重复与自动化点击。"],
    ["Real numbers from the board, updated live.", "榜单真实数据，实时更新。"],
    ["Claim your spot →", "拿下你的位置 →"],
    ["Live values are unavailable right now.", "实时数值暂时无法读取。"],
    ["A Brandup Marketing product", "Brandup Marketing 旗下产品"], ["Rules", "规则"], ["Terms", "条款"], ["Privacy", "隐私"], ["Payments", "付款"],
  ]);
  const englishByChinese = new Map(Array.from(translations, ([english, chinese]) => [chinese, english]));
  const originalText = new WeakMap();
  function readPreferences() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY));
      return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
    } catch { return {}; }
  }
  function languageFromUrl() {
    try {
      const value = new URL(window.location.href).searchParams.get("lang");
      return value === "zh" || value === "en" ? value : "";
    } catch { return ""; }
  }
  const savedPreferences = readPreferences();
  let language = languageFromUrl() || (savedPreferences.language === "zh" ? "zh" : "en");
  let theme = savedPreferences.theme === "light" ? "light" : "dark";
  let liveCurrencyCode = "";
  let liveFloor = "";
  const translate = (english) => (language === "zh" ? (translations.get(english) || english) : english);
  function updateCurrencyCopy() {
    if (!liveFloor) return;
    const glyph = document.querySelector(".timeline li:first-child .rules-glyph");
    const copy = document.querySelector(".timeline li:first-child > span:last-child");
    if (glyph) glyph.textContent = liveCurrencyCode === "MYR" ? "RM" : "US$";
    if (copy) copy.textContent = language === "zh"
      ? `输入网站、选择市场，${liveFloor} 起付款。`
      : `Enter your website, choose a market, and pay from ${liveFloor}.`;
  }
  // Text written by script has to register itself as its own English source,
  // or the next language switch restores whatever the markup shipped with.
  function setCopy(node, english) { if (!node) return; originalText.set(node, english); node.textContent = translate(english); }
  function urlWithLanguage(href, nextLanguage = language) {
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
    const metadata = pageMetadata[language];
    const canonical = urlWithLanguage(initialCanonical);
    document.title = metadata.title;
    canonicalLink?.setAttribute("href", canonical.href);
    setMetaContent('meta[name="description"]', metadata.description);
    setMetaContent('meta[property="og:locale"]', language === "zh" ? "zh_MY" : "en_MY");
    setMetaContent('meta[property="og:title"]', metadata.title);
    setMetaContent('meta[property="og:description"]', metadata.socialDescription);
    setMetaContent('meta[property="og:url"]', canonical.href);
    setMetaContent('meta[name="twitter:title"]', metadata.title);
    setMetaContent('meta[name="twitter:description"]', metadata.socialDescription);
    document.querySelector('link[rel="alternate"][hreflang="en"]')?.setAttribute("href", urlWithLanguage(initialCanonical, "en").href);
    document.querySelector('link[rel="alternate"][hreflang="zh-Hans"]')?.setAttribute("href", urlWithLanguage(initialCanonical, "zh").href);
    document.querySelector('link[rel="alternate"][hreflang="x-default"]')?.setAttribute("href", urlWithLanguage(initialCanonical, "en").href);
  }
  function applyPreferences() {
    root.dataset.theme = theme;
    root.lang = language === "zh" ? "zh-Hans" : "en";
    document.querySelectorAll("a, h1, h2, h3, p, span, strong").forEach((node) => {
      if (node.children.length) return;
      // Board figures are data, not copy. Translating them restored the
      // markup's placeholder and put invented numbers back on the page.
      if (node.dataset.noTranslate !== undefined) return;
      if (!originalText.has(node)) originalText.set(node, language === "zh" ? (englishByChinese.get(node.textContent.trim()) || node.textContent) : node.textContent);
      const english = originalText.get(node);
      node.textContent = language === "zh" ? (translations.get(english.trim()) || english) : english;
    });
    const accessible = accessibilityCopy[language];
    document.querySelectorAll(".brand, .footer-brand").forEach((node) => node.setAttribute("aria-label", accessible.home));
    document.querySelector(".brand-final-logo")?.setAttribute("alt", accessible.tagline);
    document.querySelector(".site-nav")?.setAttribute("aria-label", accessible.navigation);
    searchRedirect?.setAttribute("aria-label", accessible.search);
    document.querySelector(".origin-grid")?.setAttribute("aria-label", accessible.origin);
    document.querySelector(".principles")?.setAttribute("aria-label", accessible.principles);
    if (languageToggle) {
      languageToggle.textContent = language === "zh" ? "EN" : "中文";
      languageToggle.setAttribute("aria-label", language === "zh" ? "切换为英文" : accessible.switchChinese);
      languageToggle.setAttribute("aria-pressed", String(language === "zh"));
    }
    if (themeToggle) {
      const dark = theme !== "light";
      themeToggle.textContent = language === "zh" ? (dark ? "浅色" : "深色") : (dark ? "Light" : "Dark");
      themeToggle.setAttribute("aria-label", dark ? accessible.switchLight : accessible.switchDark);
      themeToggle.setAttribute("aria-pressed", String(dark));
    }
    updateMetadata();
    syncInternalLinks();
    updateCurrencyCopy();
  }
  function savePreferences() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ ...readPreferences(), language, theme })); } catch { /* preference persistence is optional */ }
  }
  languageToggle?.addEventListener("click", () => {
    language = language === "zh" ? "en" : "zh";
    savePreferences();
    syncLanguageUrl();
    applyPreferences();
  });
  themeToggle?.addEventListener("click", () => {
    theme = theme === "light" ? "dark" : "light";
    savePreferences();
    applyPreferences();
  });
  searchRedirect?.addEventListener("click", () => { window.location.href = urlWithLanguage("/#search").href; });
  savePreferences();
  syncLanguageUrl();
  applyPreferences();

  if (!/^https?:$/.test(window.location.protocol)) return;
  const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
  const boardCurrencyFormat = (code = "USD") => {
    const formatter = new Intl.NumberFormat(code === "MYR" ? "en-MY" : "en-US", { style: "currency", currency: code, minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return { format: (amount) => formatter.format(amount).replace(/^\$/, "US$") };
  };
  let currency = boardCurrencyFormat("USD");
  // Never leave a number on screen that did not come from the board.
  function showUnavailable() {
    ["[data-about-listings]", "[data-about-clicks]", "[data-about-bid]"].forEach((sel) => {
      const node = document.querySelector(sel);
      if (node) node.textContent = "—";
    });
    setCopy(document.querySelector(".about-disclosure"), "Live values are unavailable right now.");
  }

  Promise.all([
    fetch("./api/v1/board?board=global&period=all&limit=100", { headers: { Accept: "application/json" }, cache: "no-store" }),
    fetch("./api/v1/stats?board=global", { headers: { Accept: "application/json" }, cache: "no-store" }),
  ]).then(async ([boardResponse, statsResponse]) => {
    if (!boardResponse.ok || !statsResponse.ok) { showUnavailable(); return; }
    const [board, stats] = await Promise.all([boardResponse.json(), statsResponse.json()]);
    liveCurrencyCode = String(board.board?.currency || "USD").toUpperCase();
    currency = boardCurrencyFormat(liveCurrencyCode);
    liveFloor = currency.format(Number(board.board?.min_increment_minor || 100) / 100);
    const listingCount = document.querySelector("[data-about-listings]");
    const clickCount = document.querySelector("[data-about-clicks]");
    const topBid = document.querySelector("[data-about-bid]");
    const disclosure = document.querySelector(".about-disclosure");
    if (listingCount) listingCount.textContent = compact.format(board.rankings?.length || 0);
    if (clickCount) clickCount.textContent = compact.format(Number(stats.total_clicks || 0));
    if (topBid) topBid.textContent = currency.format(Number(board.rankings?.[0]?.bid?.amount_minor || 0) / 100);
    setCopy(disclosure, "Real numbers from the board, updated live.");
    updateCurrencyCopy();
  }).catch(showUnavailable);
})();
