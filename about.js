(() => {
  "use strict";

  const STORE_KEY = "rankoff-mvp-demo-v3";
  const root = document.documentElement;
  const languageToggle = document.querySelector("[data-language-toggle]");
  const themeToggle = document.querySelector("[data-theme-toggle]");
  const searchRedirect = document.querySelector("[data-search-redirect]");
  const translations = new Map([
    ["Board", "榜单"], ["Categories", "分类"], ["About", "关于"],
    ["The story behind the board", "榜单背后的故事"], ["Attention has a price.", "注意力有价格。"], ["Make it visible.", "让价值被看见。"],
    ["Why it exists", "为什么创立 Rankoff"], ["Rankoff started with one question.", "Rankoff 始于一个问题。"],
    ["The board today", "今日榜单"], ["A live market, in public.", "公开、实时的注意力市场。"],
    ["live listings", "实时条目"], ["measured clicks", "已统计点击"], ["current top bid", "当前最高价"],
    ["What happens next", "接下来会发生什么"], ["The board keeps moving.", "榜单持续变化。"],
    ["Submit a listing", "提交条目"], ["Compete in public", "公开竞争"], ["Measure the outcome", "衡量结果"],
    ["Live board values, updated continuously.", "榜单实时数值，持续更新。"],
    ["Live values are unavailable right now.", "实时数值暂时无法读取。"],
    ["A Brandup Marketing product", "Brandup Marketing 旗下产品"], ["Rules", "规则"], ["Terms", "条款"], ["Privacy", "隐私"], ["Payments", "付款"],
  ]);
  const originalText = new WeakMap();
  const readPreferences = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; } };
  const translate = (english) => (readPreferences().language === "zh" ? (translations.get(english) || english) : english);
  // Text written by script has to register itself as its own English source,
  // or the next language switch restores whatever the markup shipped with.
  function setCopy(node, english) { if (!node) return; originalText.set(node, english); node.textContent = translate(english); }
  function applyPreferences() {
    const saved = readPreferences();
    const language = saved.language === "zh" ? "zh" : "en";
    root.dataset.theme = saved.theme === "light" ? "light" : "dark";
    root.lang = language === "zh" ? "zh-Hans" : "en";
    document.querySelectorAll("a, h1, h2, h3, p, span, strong").forEach((node) => {
      if (node.children.length) return;
      // Board figures are data, not copy. Translating them restored the
      // markup's placeholder and put invented numbers back on the page.
      if (node.dataset.noTranslate !== undefined) return;
      if (!originalText.has(node)) originalText.set(node, node.textContent);
      const english = originalText.get(node);
      node.textContent = language === "zh" ? (translations.get(english.trim()) || english) : english;
    });
    if (languageToggle) { languageToggle.textContent = language === "zh" ? "EN" : "中文"; languageToggle.setAttribute("aria-pressed", String(language === "zh")); }
    if (themeToggle) { const dark = root.dataset.theme !== "light"; themeToggle.textContent = dark ? "Light" : "Dark"; themeToggle.setAttribute("aria-pressed", String(dark)); }
  }
  function savePreference(change) { try { localStorage.setItem(STORE_KEY, JSON.stringify({ ...readPreferences(), ...change })); } catch { /* optional */ } applyPreferences(); }
  languageToggle?.addEventListener("click", () => savePreference({ language: readPreferences().language === "zh" ? "en" : "zh" }));
  themeToggle?.addEventListener("click", () => savePreference({ theme: root.dataset.theme === "light" ? "dark" : "light" }));
  searchRedirect?.addEventListener("click", () => { window.location.href = "./index.html#search"; });
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
