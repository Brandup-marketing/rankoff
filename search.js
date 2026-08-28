(() => {
  "use strict";

  const toggle = document.querySelector("[data-search-toggle]");
  const search = document.querySelector("[data-site-search]");
  const input = document.querySelector("[data-site-search-input]");
  const results = document.querySelector("[data-search-results]");
  const close = document.querySelector("[data-search-close]");
  if (!toggle || !search || !input || !results) return;

  function result(kind, title, description, href) {
    const link = document.createElement("a");
    link.className = "search-result";
    link.href = href;
    link.setAttribute("role", "option");
    const badge = document.createElement("span");
    badge.className = "search-result-kind";
    badge.textContent = kind;
    const name = document.createElement("strong");
    name.textContent = title;
    const detail = document.createElement("span");
    detail.textContent = description;
    link.append(badge, name, detail);
    return link;
  }

  function renderResults() {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      results.hidden = true;
      results.replaceChildren();
      return;
    }

    const matches = [];
    const seenCategories = new Set();
    document.querySelectorAll("[data-category]").forEach((button) => {
      const category = button.dataset.category;
      const label = button.textContent.trim();
      if (!category || category === "all" || seenCategories.has(category) || !label.toLowerCase().includes(query)) return;
      seenCategories.add(category);
      matches.push(result("Category", label, "Open this market", `./index.html?category=${encodeURIComponent(category)}#board`));
    });
    document.querySelectorAll(".category-card").forEach((card) => {
      const link = card.querySelector(".category-card-head a");
      const heading = card.querySelector(".category-card-head h3");
      const category = card.dataset.categoryId;
      if (!link || !heading || !category || seenCategories.has(category) || !heading.textContent.toLowerCase().includes(query)) return;
      seenCategories.add(category);
      matches.push(result("Category", heading.textContent.trim(), "Open this market", link.href));
    });

    const seenListings = new Set();
    document.querySelectorAll("[data-listing-id]").forEach((row) => {
      const id = row.dataset.listingId;
      const name = row.querySelector(".product-name");
      if (!id || !name || seenListings.has(id)) return;
      const searchable = row.textContent.toLowerCase();
      if (!searchable.includes(query)) return;
      seenListings.add(id);
      matches.push(result("Product", name.textContent.trim(), row.querySelector(".listing-description")?.textContent.trim() || "Sponsored listing", name.href));
    });
    document.querySelectorAll(".category-rank-row").forEach((row) => {
      const href = row.href;
      const name = row.querySelector(".category-rank-copy strong");
      if (!href || !name || seenListings.has(href) || !row.textContent.toLowerCase().includes(query)) return;
      seenListings.add(href);
      matches.push(result("Product", name.textContent.trim(), row.querySelector(".category-rank-copy span")?.textContent.trim() || "Sponsored listing", href));
    });

    if (!matches.length) {
      const empty = document.createElement("p");
      empty.className = "search-empty";
      empty.textContent = "No products or categories found.";
      results.replaceChildren(empty);
    } else {
      results.replaceChildren(...matches.slice(0, 12));
    }
    results.hidden = false;
  }

  function openSearch() {
    search.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    window.requestAnimationFrame(() => input.focus());
    renderResults();
  }

  function closeSearch() {
    search.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    input.value = "";
    results.hidden = true;
    results.replaceChildren();
    toggle.focus();
  }

  toggle.addEventListener("click", () => search.hidden ? openSearch() : closeSearch());
  close?.addEventListener("click", closeSearch);
  search.addEventListener("submit", (event) => event.preventDefault());
  input.addEventListener("input", renderResults);
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !search.hidden) closeSearch(); });
  window.addEventListener("rankoff:content-updated", renderResults);
})();
