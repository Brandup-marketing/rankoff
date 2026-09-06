(() => {
  "use strict";

  const STORE_KEY = "rankoff-mvp-demo-v3";
  const root = document.documentElement;
  const themeToggle = document.querySelector("[data-legal-theme]");
  const languageToggle = document.querySelector("[data-legal-language]");
  const searchRedirect = document.querySelector("[data-search-redirect]");

  function readPreferences() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
  }

  // The terms are binding in English only, so the document stays English.
  // The chrome around it — nav, toggles, footer links — follows the visitor's
  // language like every other page, so /legal?lang=zh does not read as a
  // different site from the one that linked to it.
  const chinese = new URL(window.location.href).searchParams.get("lang") === "zh"
    || (!new URL(window.location.href).searchParams.has("lang") && readPreferences().language === "zh");

  function syncTheme() {
    const dark = root.dataset.theme !== "light";
    if (!themeToggle) return;
    themeToggle.textContent = chinese ? (dark ? "浅色" : "深色") : (dark ? "Light" : "Dark");
    themeToggle.setAttribute("aria-label", chinese ? (dark ? "切换至浅色主题" : "切换至深色主题") : (dark ? "Switch to light theme" : "Switch to dark theme"));
    themeToggle.setAttribute("aria-pressed", String(dark));
  }

  function localizeChrome() {
    if (!chinese) return;
    const labels = { "/categories": "分类", "/about": "关于", "/": "榜单" };
    document.querySelectorAll(".site-nav a").forEach((link) => {
      const path = new URL(link.getAttribute("href"), window.location.origin).pathname;
      if (labels[path]) link.textContent = labels[path];
      const target = new URL(link.getAttribute("href"), window.location.origin);
      target.searchParams.set("lang", "zh");
      link.setAttribute("href", `${target.pathname}${target.search}`);
    });
    document.querySelectorAll('.brand, .footer-brand').forEach((link) => {
      link.setAttribute("href", "/?lang=zh");
      link.setAttribute("aria-label", "RANKOFF 首页");
    });
    document.querySelector(".site-nav")?.setAttribute("aria-label", "主导航");
    document.querySelector(".legal-nav")?.setAttribute("aria-label", "法律页面");
    searchRedirect?.setAttribute("aria-label", "搜索产品和分类");
    const footer = { "#rules": "规则", "#terms": "条款", "#privacy": "隐私", "#payments": "付款" };
    document.querySelectorAll(".footer-links a").forEach((link) => {
      const hash = new URL(link.getAttribute("href"), window.location.origin).hash;
      if (footer[hash]) link.textContent = footer[hash];
    });
    const parent = document.querySelector(".footer-parent");
    if (parent) parent.textContent = "Brandup Marketing 旗下产品";
  }

  const saved = readPreferences();
  root.dataset.theme = saved.theme === "light" ? "light" : "dark";
  themeToggle?.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ ...readPreferences(), theme: root.dataset.theme })); } catch { /* optional */ }
    syncTheme();
  });
  // The legal text is authoritative in English only, so this button does not
  // switch locale — it jumps to the Chinese summary. It used to send visitors
  // back to the homepage, which silently threw away the page they were reading.
  languageToggle?.addEventListener("click", () => {
    const summary = document.getElementById("zh-summary");
    if (!summary) { window.location.href = "/"; return; }
    // Native anchor navigation is the reliable path: it honours the section's
    // scroll-margin-top and still lands where smooth scrolling is unavailable.
    // scrollIntoView on its own silently no-ops in some engines.
    window.location.hash = "#zh-summary";
    summary.scrollIntoView({ block: "start" });
    summary.focus({ preventScroll: true });
  });
  searchRedirect?.addEventListener("click", () => {
    const target = new URL("/", window.location.origin);
    if (new URL(window.location.href).searchParams.get("lang") === "zh") target.searchParams.set("lang", "zh");
    target.hash = "search";
    window.location.href = `${target.pathname}${target.search}${target.hash}`;
  });
  localizeChrome();
  syncTheme();
})();
