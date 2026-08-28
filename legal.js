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

  function syncTheme() {
    const dark = root.dataset.theme !== "light";
    if (!themeToggle) return;
    themeToggle.textContent = dark ? "Light" : "Dark";
    themeToggle.setAttribute("aria-pressed", String(dark));
  }

  const saved = readPreferences();
  root.dataset.theme = saved.theme === "light" ? "light" : "dark";
  themeToggle?.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ ...readPreferences(), theme: root.dataset.theme })); } catch { /* optional */ }
    syncTheme();
  });
  languageToggle?.addEventListener("click", () => { window.location.href = "./index.html"; });
  searchRedirect?.addEventListener("click", () => { window.location.href = "./index.html#search"; });
  syncTheme();
})();
