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
      description: "Learn how Rankoff turns sponsored attention into a public bidding board where products compete for visible rank.",
      socialDescription: "How Rankoff works: products compete for sponsored rank while settled totals and verified clicks remain public.",
    },
    zh: {
      title: "关于 RANKOFF",
      description: "了解 Rankoff 如何把赞助注意力变成公开竞价榜单，让产品为清晰可见的排名展开竞争。",
      socialDescription: "了解 Rankoff 的运作方式：产品竞逐赞助排名，已结算累计金额和经验证点击公开可见。",
    },
  };
  const accessibilityCopy = {
    en: {
      home: "RANKOFF home", tagline: "RANKOFF — Bid your way to number one", navigation: "Main navigation",
      search: "Search products and categories", switchChinese: "Switch to Chinese", switchLight: "Switch to light theme", switchDark: "Switch to dark theme",
      origin: "Rankoff origin", principles: "Rankoff principles",
    },
    zh: {
      home: "RANKOFF 首页", tagline: "RANKOFF — 竞价登上第 1 名", navigation: "主导航",
      search: "搜索产品和分类", switchChinese: "切换为中文", switchLight: "切换至浅色主题", switchDark: "切换至深色主题",
      origin: "Rankoff 起源", principles: "Rankoff 原则",
    },
  };
  const translations = new Map([
    ["Board", "榜单"], ["Categories", "分类"], ["About", "关于"],
    ["The story behind the board", "榜单背后的故事"], ["Attention has a price.", "注意力有价格。"], ["Make it visible.", "让价值被看见。"],
    ["RANKOFF is the public market for visible attention. Products bid for sponsored rank, show what they do, and stay in position until someone pays more. One board, one clear rule: the highest settled total takes #1.", "RANKOFF 是公开的注意力市场。产品通过竞价获得赞助排名，展示自身价值，并保持位置，直到有人出价更高。一个榜单，一条清晰规则：已结算累计金额最高者登上第 1 名。"],
    ["Why it exists", "为什么创立 Rankoff"], ["Rankoff started with one question.", "Rankoff 始于一个问题。"],
    ["What if a product launch had a visible market instead of a hidden ad slot? What if anyone could see who was winning, what #1 costs, and which products are earning attention?", "如果产品发布面对的是一个透明市场，而不是隐藏的广告位，会怎样？如果任何人都能看见谁在领先、第 1 名值多少钱，以及哪些产品正在赢得关注，会怎样？"],
    ["Rankoff turns that question into a public place to compete. Listings are clear, settled totals are visible, and sponsored placement is labelled as sponsored.", "Rankoff 把这个问题变成一个公开竞争的平台。条目信息清晰、已结算累计金额公开，赞助展示也会明确标注。"],
    ["Visible", "可见"], ["Public by default", "默认公开"], ["Every listing shows its current rank, settled total, and product description.", "每个条目都会显示当前排名、已结算累计金额和产品介绍。"],
    ["Simple", "简明"], ["One clear rule", "一条明确规则"], ["A higher settled total moves a listing higher on the board.", "已结算累计金额越高，条目在榜单上的位置就越靠前。"],
    ["Measured", "可衡量"], ["Evidence over promises", "数据胜于承诺"], ["Referral clicks are labelled by how they were measured.", "推荐点击会注明统计方式。"],
    ["The board today", "今日榜单"], ["A live market, in public.", "公开、实时的注意力市场。"],
    ["live listings", "实时条目"], ["measured clicks", "已统计点击"], ["current top bid", "当前最高价"],
    ["What happens next", "接下来会发生什么"], ["The board keeps moving.", "榜单持续变化。"],
    ["Submit a listing", "提交条目"], ["Compete in public", "公开竞争"], ["Measure the outcome", "衡量结果"],
    ["Now", "现在"], ["Enter a URL, choose a market, and set the bid that feels worth the position.", "输入网址、选择市场，并为你认为值得的位置设定出价。"],
    ["Then", "随后"], ["Your public identity, description, settled total, and position appear on the board after payment settles.", "付款结算后，你的公开身份、介绍、已结算累计金额和位置会显示在榜单上。"],
    ["Next", "接下来"], ["Verified referral clicks and public activity make the market legible over time.", "经验证的推荐点击和公开活动，让市场表现随时间清晰可见。"],
    ["Live board values, updated continuously.", "榜单实时数值，持续更新。"],
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
  const translate = (english) => (language === "zh" ? (translations.get(english) || english) : english);
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
  const boardCurrencyFormat = (code) => new Intl.NumberFormat(code === "MYR" ? "en-MY" : "en-US", { style: "currency", currency: code || "USD", maximumFractionDigits: 0 });
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
    currency = boardCurrencyFormat(String(board.board?.currency || "USD").toUpperCase());
    const listingCount = document.querySelector("[data-about-listings]");
    const clickCount = document.querySelector("[data-about-clicks]");
    const topBid = document.querySelector("[data-about-bid]");
    const disclosure = document.querySelector(".about-disclosure");
    if (listingCount) listingCount.textContent = compact.format(board.rankings?.length || 0);
    if (clickCount) clickCount.textContent = compact.format(Number(stats.total_clicks || 0));
    if (topBid) topBid.textContent = currency.format(Number(board.rankings?.[0]?.bid?.amount_minor || 0) / 100);
    setCopy(disclosure, "Live board values, updated continuously.");
  }).catch(showUnavailable);
})();
