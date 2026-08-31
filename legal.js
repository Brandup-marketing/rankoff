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
  // The legal text is authoritative in English only, so this button does not
  // switch locale — it jumps to the Chinese summary. It used to send visitors
  // back to the homepage, which silently threw away the page they were reading.
  languageToggle?.addEventListener("click", () => {
    const summary = document.getElementById("zh-summary");
    if (!summary) { window.location.href = "./index.html"; return; }
    // Native anchor navigation is the reliable path: it honours the section's
    // scroll-margin-top and still lands where smooth scrolling is unavailable.
    // scrollIntoView on its own silently no-ops in some engines.
    window.location.hash = "#zh-summary";
    summary.scrollIntoView({ block: "start" });
    summary.focus({ preventScroll: true });
  });
  searchRedirect?.addEventListener("click", () => { window.location.href = "./index.html#search"; });
  syncTheme();
})();
