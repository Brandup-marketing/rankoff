(() => {
  "use strict";

  const STORE_KEY = "rankoff-mvp-demo-v3";
  const categoryGroups = Object.freeze({ Agents: ["Agents", "AIMedia"], Marketing: ["Marketing", "SEO", "Social", "Sales", "Attention", "People"], Developer: ["Developer", "Security"], Business: ["Business", "Agencies", "Careers"], Crypto: ["Crypto"], Ecommerce: ["Ecommerce", "Hardware"], Design: ["Design", "Writing", "Audio", "News"], Productivity: ["Productivity", "Education"], Health: ["Health"], Games: ["Games"], Travel: ["Travel", "RealEstate"], Domains: ["Domains", "Discovery"], Other: ["Other"] });
  const categoryAliases = Object.freeze(Object.entries(categoryGroups).reduce((aliases, [market, members]) => {
    aliases[market.toLowerCase()] = market;
    members.forEach((member) => { aliases[member.toLowerCase()] = market; });
    return aliases;
  }, {}));
  const categoryLabels = { Agents: "AI & Automation", Marketing: "Marketing, SEO & Social", Developer: "Developer Tools & Security", Business: "Business & Professional Services", Crypto: "Finance, Crypto & Investing", Ecommerce: "Ecommerce, Retail & Hardware", Design: "Design, Content & Media", Productivity: "Productivity & Education", Health: "Health & Wellness", Games: "Games & Entertainment", Travel: "Travel, Local & Property", Domains: "Web, Domains & Discovery", Other: "Other" };
  const categoryTranslations = { Agents: "AI 与自动化", Marketing: "营销、SEO 与社交媒体", Developer: "开发工具与安全", Business: "商业与专业服务", Crypto: "金融、加密与投资", Ecommerce: "电商、零售与硬件", Design: "设计、内容与媒体", Productivity: "效率工具与教育", Health: "健康与生活方式", Games: "游戏与娱乐", Travel: "旅行、本地与房地产", Domains: "网站、域名与发现", Other: "其他" };
  const previewListings = [
    ["model-harbor", "Model Harbor", "A release desk for production AI models, approvals, and customer notices.", "https://modelharbor.example/", "Agents", 2480, 2840],
    ["trackline", "Trackline", "Campaign reporting for teams that need a clean answer to what moved.", "https://trackline.example/", "Marketing", 2160, 1910],
    ["patchnote", "Patchnote", "Release notes that turn product changes into useful customer updates.", "https://patchnote.example/", "Developer", 1930, 2180],
    ["canvas-relay", "Canvas Relay", "Creative hand-offs, feedback, and approved files in one focused space.", "https://canvasrelay.example/", "Design", 1180, 1490],
    ["switchboard", "Switchboard", "A routing layer for the AI tools already inside an operator stack.", "https://switchboard.example/", "Agents", 940, 1210],
  ].map(([id, title, description, url, category, bid, clicks], index) => ({
    id, title, description, url, category, bid, clicks, rank: index + 1, icon: "",
  }));

  const copy = {
    en: {
      board: "Board", about: "About", legal: "Legal", contact: "Contact", back: "← Back to leaderboard", loading: "Loading ranking details…",
      notFoundTitle: "Listing not found", notFoundCopy: "This listing may have moved or is no longer on the public board.", returnBoard: "Return to the board",
      sponsored: "Sponsored", visit: "Visit website", share: "Share rank", evidence: "Public ranking record", rank: "Current rank", bid: "Bid", allTimeBid: "All-time total", past24Bid: "Past 24h total", duration: "Duration", past24: "Past 24h",
      rule: "Highest total takes #1", claimNumberOne: "Claim #1 for", startClaim: "Challenge this rank",
      footer: "Transparent sponsored ranking. Every position has a visible price.",
      previewListing: "Public listing", verifiedPlacement: "Verified placement", previewData: "Public data", verifiedData: "Live data",
      sampleClicks: "Referral clicks", verifiedClicks: "Verified clicks", estimatedClicks: "Referral clicks",
      previewEvidence: "Rank, price, and referral clicks update from the public board.",
      verifiedEvidence: "Rank and bid come from settled placements. Clicks are first-party redirect events recorded by Rankoff.",
      claimCopy: "Put your product above this listing. Your full business description stays visible until someone pays more.",
      previewDisclosure: "Submissions pass automated checks instantly; listings may be removed after publication if they break the rules.", liveDisclosure: "Payment is confirmed only after secure hosted checkout settles.",
      unavailable: "Website temporarily unavailable", copied: "Rank link copied.", shareText: "is ranked",
    },
    zh: {
      board: "榜单", about: "关于", legal: "法律条款", contact: "联系", back: "← 返回榜单", loading: "正在加载排名信息…",
      notFoundTitle: "找不到此条目", notFoundCopy: "此条目可能已移动，或已不在公开榜单中。", returnBoard: "返回榜单",
      sponsored: "赞助", visit: "访问网站", share: "分享排名", evidence: "公开排名记录", rank: "当前排名", bid: "出价", allTimeBid: "全时段累计出价", past24Bid: "近 24 小时累计出价", duration: "有效期", past24: "近 24 小时",
      rule: "累计出价最高者获得第 1 名", claimNumberOne: "以此价格争夺第 1 名", startClaim: "挑战此排名",
      footer: "透明的赞助排名。每个位置都有公开价格。",
      previewListing: "公开条目", verifiedPlacement: "已验证展示", previewData: "公开数据", verifiedData: "实时数据",
      sampleClicks: "推荐点击", verifiedClicks: "已验证点击", estimatedClicks: "推荐点击",
      previewEvidence: "排名、价格和推荐点击会随公开榜单更新。",
      verifiedEvidence: "排名与出价来自已结算展示；点击为 Rankoff 记录的第一方跳转事件。",
      claimCopy: "让你的产品排在这个条目之前。完整业务介绍会持续展示，直到有人出价更高。",
      previewDisclosure: "提交即通过自动筛查并发布；违反规则的条目可能在发布后被移除。", liveDisclosure: "付款会在安全的托管付款页面完成并确认。",
      unavailable: "网站暂时无法访问", copied: "排名链接已复制。", shareText: "目前排名",
    },
  };

  const elements = {
    root: document.documentElement,
    detail: document.querySelector("[data-content]"), loading: document.querySelector("[data-loading]"), error: document.querySelector("[data-error]"),
    language: document.querySelector("[data-language-toggle]"), theme: document.querySelector("[data-theme-toggle]"),
    mark: document.querySelector("[data-mark]"), initials: document.querySelector("[data-initials]"), title: document.querySelector("[data-title]"),
    category: document.querySelector("[data-category]"), placement: document.querySelector("[data-placement-label]"), host: document.querySelector("[data-host]"),
    description: document.querySelector("[data-description]"), visit: document.querySelector("[data-visit]"), share: document.querySelector("[data-share]"),
    mode: document.querySelector("[data-mode]"), evidenceNote: document.querySelector("[data-evidence-note]"), rank: document.querySelector("[data-rank]"),
    bid: document.querySelector("[data-bid]"), clicks: document.querySelector("[data-clicks]"), clickLabels: document.querySelectorAll("[data-click-label], [data-click-label-today]"),
    todayRank: document.querySelector("[data-today-rank]"), todayBid: document.querySelector("[data-today-bid]"), todayClicks: document.querySelector("[data-today-clicks]"),
    nextBid: document.querySelector("[data-next-bid]"), claimCopy: document.querySelector("[data-claim-copy]"), claim: document.querySelector("[data-claim]"),
    disclosure: document.querySelector("[data-claim-disclosure]"), toast: document.querySelector("[data-toast]"),
  };
  document.querySelector("[data-search-redirect]")?.addEventListener("click", () => { window.location.href = "./index.html#search"; });

  let preferences = loadPreferences();
  let model = null;
  let toastTimer = null;
  const boardCurrencyFormat = (code) => new Intl.NumberFormat(code === "MYR" ? "en-MY" : "en-US", { style: "currency", currency: code || "USD", maximumFractionDigits: 0 });
  let money = boardCurrencyFormat("USD");
  const count = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

  function loadPreferences() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY));
      return { theme: saved?.theme === "light" ? "light" : "dark", language: saved?.language === "zh" ? "zh" : "en", listings: saved?.listings || [] };
    } catch {
      return { theme: "dark", language: "en", listings: [] };
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

  function applyPreferences() {
    elements.root.dataset.theme = preferences.theme;
    elements.root.lang = preferences.language === "zh" ? "zh-CN" : "en";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", preferences.theme === "light" ? "#faf7f5" : "#090a0c");
    document.querySelectorAll("[data-copy]").forEach((node) => { node.textContent = text(node.dataset.copy); });
    elements.language.textContent = preferences.language === "zh" ? "CN" : "EN";
    elements.language.setAttribute("aria-pressed", String(preferences.language === "zh"));
    elements.theme.textContent = preferences.theme === "dark" ? "Light" : "Dark";
    elements.theme.setAttribute("aria-pressed", String(preferences.theme === "dark"));
    elements.theme.setAttribute("aria-label", `Switch to ${preferences.theme === "dark" ? "light" : "dark"} theme`);
    if (model) renderModel();
  }

  function localListing(id) {
    const saved = preferences.listings.find((item) => String(item?.id) === id);
    if (saved) return {
      id, title: String(saved.name || "Listing"), description: String(saved.description || "Sponsored listing on Rankoff."),
      url: String(saved.url || ""), category: String(saved.category || "Other"), bid: Number(saved.bids?.all || 0), clicks: Number(saved.clicks || 0),
      rank: [...preferences.listings].sort((a, b) => Number(b?.bids?.all || 0) - Number(a?.bids?.all || 0)).findIndex((item) => String(item?.id) === id) + 1,
      icon: String(saved.iconUrl || ""), todayBid: Number(saved.bids?.today || 0), todayClicks: Number(saved.todayClicks || 0), isLocal: true,
    };
    return previewListings.find((item) => item.id === id) || null;
  }

  function fromRanking(entry) {
    return {
      id: String(entry.listing.id), title: String(entry.listing.title), description: String(entry.listing.description || "Sponsored listing on Rankoff."),
      url: String(entry.listing.url || ""), category: String(entry.listing.category || "Other"), icon: String(entry.listing.favicon_url || ""),
      rank: Number(entry.rank), bid: Math.ceil(Number(entry.bid?.amount_minor || 0) / 100), clicks: Number(entry.clicks || 0),
      snapshot: "", mode: "preview",
    };
  }

  async function loadListing() {
    const id = new URL(location.href).searchParams.get("id") || "";
    if (!id) return showError();
    let fallback = localListing(id);
    let productionBoard = false;

    if (/^https?:$/.test(location.protocol)) {
      try {
        const allUrl = new URL("./api/v1/board?board=global&period=all&limit=100", location.href);
        const todayUrl = new URL("./api/v1/board?board=global&period=today&limit=100", location.href);
        const [allResponse, todayResponse] = await Promise.all([fetch(allUrl, { cache: "no-store" }), fetch(todayUrl, { cache: "no-store" })]);
        if (allResponse.ok && todayResponse.ok) {
          const [allPayload, todayPayload] = await Promise.all([allResponse.json(), todayResponse.json()]);
          productionBoard = allPayload.mode === "production";
          money = boardCurrencyFormat(String(allPayload.board?.currency || "USD").toUpperCase());
          const allEntry = allPayload.rankings?.find((entry) => String(entry.listing?.id) === id);
          const todayEntry = todayPayload.rankings?.find((entry) => String(entry.listing?.id) === id);
          if (allEntry) {
            model = fromRanking(allEntry);
            model.mode = allPayload.mode === "production" ? "production" : "preview";
            model.snapshot = allPayload.snapshot_id || "";
            model.nextBid = Math.ceil(Number(allPayload.next_bid_minor || 100) / 100);
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

  function initials(url, title) {
    try { return new URL(url).hostname.split(".")[0].split(/[-_]/).map((part) => part[0]).join("").slice(0, 3).toUpperCase(); }
    catch { return String(title).split(/\s+/).map((part) => part[0]).join("").slice(0, 3).toUpperCase(); }
  }

  function setIcon() {
    elements.mark.querySelector("img")?.remove();
    elements.mark.classList.remove("has-icon");
    elements.initials.textContent = initials(model.url, model.title);
    let host = "";
    try { host = new URL(model.url).hostname; } catch { return; }
    if (host.endsWith(".example") && !model.icon) return;
    const sources = [...new Set([model.icon, `${new URL(model.url).origin}/favicon.ico`, `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`].filter(Boolean))];
    if (!sources.length) return;
    const img = new Image();
    img.alt = "";
    img.referrerPolicy = "no-referrer";
    img.decoding = "async";
    let index = 0;
    const next = () => { if (index >= sources.length) return img.remove(); img.src = sources[index++]; };
    img.addEventListener("load", () => elements.mark.classList.add("has-icon"), { once: true });
    img.addEventListener("error", next);
    elements.mark.append(img);
    next();
  }

  function renderModel() {
    const verified = model.mode === "production";
    const clickLabel = verified ? text("verifiedClicks") : text("sampleClicks");
    elements.title.textContent = model.title;
    elements.category.textContent = categoryName(model.category);
    elements.description.textContent = model.description;
    elements.rank.textContent = `#${model.rank}`;
    elements.bid.textContent = money.format(model.bid);
    elements.clicks.textContent = count.format(model.clicks);
    elements.todayRank.textContent = model.todayRank ? `#${model.todayRank}` : "—";
    elements.todayBid.textContent = model.todayBid ? money.format(model.todayBid) : "—";
    elements.todayClicks.textContent = Number.isFinite(model.todayClicks) ? count.format(model.todayClicks) : "—";
    elements.clickLabels.forEach((node) => { node.textContent = clickLabel; });
    elements.placement.textContent = verified ? text("verifiedPlacement") : text("previewListing");
    elements.placement.className = verified ? "verified-chip" : "estimated-chip";
    elements.mode.textContent = verified ? text("verifiedData") : text("previewData");
    elements.mode.classList.toggle("is-verified", verified);
    elements.evidenceNote.textContent = verified ? text("verifiedEvidence") : text("previewEvidence");
    elements.nextBid.textContent = money.format(model.nextBid || model.bid + 1);
    elements.claimCopy.textContent = text("claimCopy");
    elements.disclosure.textContent = verified ? text("liveDisclosure") : text("previewDisclosure");
    elements.claim.href = `./index.html#claim`;
    let host = model.url;
    try { host = new URL(model.url).hostname.replace(/^www\./, ""); } catch { /* Keep raw URL. */ }
    elements.host.textContent = host;

    const unavailable = !model.url || (/\.example$/i.test(host) && !verified);
    if (unavailable) {
      elements.visit.removeAttribute("href");
      elements.visit.setAttribute("aria-disabled", "true");
      elements.visit.querySelector("span").textContent = text("unavailable");
    } else {
      const destination = verified ? new URL(`./go/${encodeURIComponent(model.id)}`, location.href) : new URL(model.url);
      if (verified && model.snapshot) destination.searchParams.set("snapshot", model.snapshot);
      if (verified && model.rank) destination.searchParams.set("rank", String(model.rank));
      elements.visit.href = destination.toString();
      elements.visit.removeAttribute("aria-disabled");
      elements.visit.querySelector("span").textContent = text("visit");
    }
    setIcon();
    document.title = `${model.title} — #${model.rank} on RANKOFF`;
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", document.title);
    document.querySelector('meta[name="description"]')?.setAttribute("content", model.description);
  }

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
  elements.language.addEventListener("click", () => { preferences.language = preferences.language === "zh" ? "en" : "zh"; savePreferences(); applyPreferences(); });
  elements.share.addEventListener("click", async () => {
    const share = { title: `${model.title} — RANKOFF`, text: `${model.title} ${text("shareText")} #${model.rank} on RANKOFF.`, url: location.href };
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
