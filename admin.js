(() => {
  "use strict";

  // The owner view. It reads real customer contact detail, so three rules hold
  // for the whole file: the admin token lives in a variable and nowhere else,
  // nothing here is written to storage or to a query string, and no buyer value
  // is ever logged. Every cell is built with textContent — a merchant-supplied
  // listing title is never treated as markup.
  const PREFERENCE_KEY = "rankoff-mvp-demo-v3";
  const PAGE_SIZE = 50;
  const COPY_RESET_MS = 2000;

  const root = document.documentElement;
  const elements = {
    form: document.querySelector("[data-owner-form]"),
    token: document.querySelector("[data-owner-token]"),
    clear: document.querySelector("[data-owner-clear]"),
    cards: document.querySelector("[data-owner-cards]"),
    load: document.querySelector("[data-owner-load]"),
    status: document.querySelector("[data-owner-status]"),
    summary: document.querySelector("[data-owner-summary]"),
    count: document.querySelector("[data-owner-count]"),
    total: document.querySelector("[data-owner-total]"),
    results: document.querySelector("[data-owner-results]"),
    rows: document.querySelector("[data-owner-rows]"),
    pager: document.querySelector("[data-owner-page]"),
    previous: document.querySelector("[data-owner-previous]"),
    next: document.querySelector("[data-owner-next]"),
    languageToggle: document.querySelector("[data-language-toggle]"),
    themeToggle: document.querySelector("[data-theme-toggle]"),
  };

  const translations = {
    en: {
      pageKicker: "Owner view",
      pageTitle: "Settled payments",
      pageLede: "Who paid, what they paid for, and how to reach them. Live records only — no payment record and no token is stored in this browser.",
      tokenLabel: "Admin token",
      tokenPlaceholder: "Paste the admin token",
      tokenNote: "The token is held in this tab's memory only. It is never saved to storage, never put in the address bar, and never sent anywhere but this site.",
      loadPayments: "Load payments",
      buildCards: "Generate share cards", cardsNeedToken: "Paste the admin token first.", cardsUnavailable: "The card renderer did not load.", cardsWorking: "Painting {n} share cards\u2026", cardsDone: "{done} share cards stored, {failed} failed.", cardsFailed: "Share cards could not be generated.", 
      clearToken: "Clear token",
      settledPayments: "settled payments",
      settledTotal: "settled total",
      tableTitle: "Settled payment records",
      colSettled: "Settled",
      colListing: "Listing",
      colAmount: "Amount",
      colBuyer: "Buyer",
      colActions: "Reach them",
      previousPage: "Previous",
      nextPage: "Next",
      backToBoard: "Back to the board",
      loading: "Loading settled payments…",
      tokenRequired: "Paste the admin token first.",
      rejected: "That token was rejected. Check it and try again.",
      forbiddenMode: "The owner view answers on the live board only.",
      unavailable: "The board could not be read right now. Try again in a moment.",
      networkError: "The request did not complete. Check the connection and try again.",
      noPayments: "No settled payments yet.",
      loadedOne: "1 settled payment loaded.",
      loadedMany: "{count} settled payments loaded.",
      cleared: "Token cleared. The table is empty again.",
      copyEmail: "Copy email",
      copied: "Copied",
      copyFailed: "This browser would not copy the email.",
      copiedEmail: "Email copied.",
      whatsapp: "WhatsApp",
      invoice: "Invoice",
      noEmail: "No email recorded",
      noPhone: "No phone recorded",
      noInvoice: "No invoice link",
      notRecorded: "Not recorded",
      pageOf: "Page {page} of {pages}",
      settledUnknown: "Settlement time not recorded",
    },
    zh: {
      pageKicker: "站主视图",
      pageTitle: "已结算付款",
      pageLede: "谁付了款、买了什么、如何联系。仅显示实时记录 —— 本页不会在此浏览器保存任何付款记录或令牌。",
      tokenLabel: "管理员令牌",
      tokenPlaceholder: "粘贴管理员令牌",
      tokenNote: "令牌只保存在本标签页的内存中：不写入本地存储，不出现在网址里，也只会发送到本站。",
      loadPayments: "载入付款记录",
      buildCards: "\u751f\u6210\u5206\u4eab\u5361\u7247", cardsNeedToken: "\u8bf7\u5148\u8d34\u4e0a\u7ba1\u7406\u4ee4\u724c\u3002", cardsUnavailable: "\u5361\u7247\u6e32\u67d3\u5668\u672a\u52a0\u8f7d\u3002", cardsWorking: "\u6b63\u5728\u7ed8\u5236 {n} \u5f20\u5206\u4eab\u5361\u7247\u2026", cardsDone: "\u5df2\u5b58\u5165 {done} \u5f20\uff0c{failed} \u5f20\u5931\u8d25\u3002", cardsFailed: "\u65e0\u6cd5\u751f\u6210\u5206\u4eab\u5361\u7247\u3002", 
      clearToken: "清除令牌",
      settledPayments: "笔已结算付款",
      settledTotal: "已结算总额",
      tableTitle: "已结算付款记录",
      colSettled: "结算时间",
      colListing: "条目",
      colAmount: "金额",
      colBuyer: "付款人",
      colActions: "联系方式",
      previousPage: "上一页",
      nextPage: "下一页",
      backToBoard: "返回榜单",
      loading: "正在载入已结算付款…",
      tokenRequired: "请先粘贴管理员令牌。",
      rejected: "令牌未通过验证，请核对后重试。",
      forbiddenMode: "站主视图只在正式榜单上开放。",
      unavailable: "暂时无法读取榜单数据，请稍后再试。",
      networkError: "请求未完成，请检查网络后重试。",
      noPayments: "目前还没有已结算的付款。",
      loadedOne: "已载入 1 笔已结算付款。",
      loadedMany: "已载入 {count} 笔已结算付款。",
      cleared: "令牌已清除，表格已清空。",
      copyEmail: "复制邮箱",
      copied: "已复制",
      copyFailed: "此浏览器无法复制邮箱。",
      copiedEmail: "邮箱已复制。",
      whatsapp: "WhatsApp",
      invoice: "发票",
      noEmail: "未记录邮箱",
      noPhone: "未记录电话",
      noInvoice: "没有发票链接",
      notRecorded: "未记录",
      pageOf: "第 {page} 页，共 {pages} 页",
      settledUnknown: "未记录结算时间",
    },
  };

  const state = { language: "en", page: 1, pages: 1, currency: "MYR" };
  let token = "";
  let inFlight = false;
  // Kept so a language switch redraws the rows that JavaScript built. It holds
  // buyer detail, so it is dropped the moment the table is cleared.
  let lastPayload = null;
  let copyResetTimer = null;

  function text(key) {
    return (translations[state.language] || translations.en)[key] || translations.en[key] || key;
  }

  function readPreferences() {
    try {
      return JSON.parse(localStorage.getItem(PREFERENCE_KEY)) || {};
    } catch {
      return {};
    }
  }

  // Theme and language only. The token is deliberately absent from this call.
  function savePreference(change) {
    try {
      localStorage.setItem(PREFERENCE_KEY, JSON.stringify({ ...readPreferences(), ...change }));
    } catch {
      /* A browser that refuses storage still gets a working page. */
    }
    applyPreferences();
  }

  function applyPreferences() {
    const saved = readPreferences();
    state.language = saved.language === "zh" ? "zh" : "en";
    root.dataset.theme = saved.theme === "light" ? "light" : "dark";
    root.lang = state.language === "zh" ? "zh-Hans" : "en";
    document.title = `${text("pageKicker")} · ${text("pageTitle")}`;
    document.querySelectorAll("[data-i18n]").forEach((node) => { node.textContent = text(node.dataset.i18n); });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => { node.setAttribute("placeholder", text(node.dataset.i18nPlaceholder)); });
    if (elements.languageToggle) {
      elements.languageToggle.textContent = state.language === "zh" ? "EN" : "中文";
      elements.languageToggle.setAttribute("aria-pressed", String(state.language === "zh"));
    }
    if (elements.themeToggle) {
      const dark = root.dataset.theme !== "light";
      elements.themeToggle.textContent = dark ? "Light" : "Dark";
      elements.themeToggle.setAttribute("aria-pressed", String(dark));
    }
    if (lastPayload) render(lastPayload);
  }

  function setStatus(message) {
    if (elements.status) elements.status.textContent = message;
  }

  function moneyFormat(code) {
    const currency = String(code || "MYR").toUpperCase();
    try {
      return new Intl.NumberFormat(currency === "MYR" ? "en-MY" : "en-US", { style: "currency", currency, minimumFractionDigits: 2 });
    } catch {
      return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 });
    }
  }

  function formatAmount(minor, code) {
    return moneyFormat(code).format(Number(minor || 0) / 100);
  }

  function formatMoment(value) {
    if (!value) return text("settledUnknown");
    const moment = new Date(String(value).includes("T") ? value : `${value}Z`);
    if (Number.isNaN(moment.getTime())) return String(value);
    try {
      return new Intl.DateTimeFormat(state.language === "zh" ? "zh-Hans" : "en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(moment);
    } catch {
      return moment.toISOString();
    }
  }

  function addressLine(address) {
    return [address?.street, address?.city, address?.state, address?.zipcode, address?.country]
      .map((part) => String(part || "").trim())
      .filter(Boolean)
      .join(", ");
  }

  // wa.me takes digits only, country code included. A number that cannot become
  // digits gets no link rather than a link that opens an empty chat.
  function whatsappHref(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    return digits.length >= 8 ? `https://wa.me/${digits}` : "";
  }

  function safeHttpsUrl(value) {
    try {
      const url = new URL(String(value));
      return url.protocol === "https:" ? url.toString() : "";
    } catch {
      return "";
    }
  }

  function line(parent, value, className) {
    const node = document.createElement("span");
    node.className = className;
    node.textContent = value;
    parent.append(node);
    return node;
  }

  function copyText(value) {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      return navigator.clipboard.writeText(value).then(() => true).catch(() => false);
    }
    const helper = document.createElement("textarea");
    helper.value = value;
    helper.setAttribute("readonly", "");
    helper.className = "visually-hidden";
    document.body.append(helper);
    helper.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }
    helper.remove();
    return Promise.resolve(copied);
  }

  function copyButton(email) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "owner-action";
    button.textContent = text("copyEmail");
    button.addEventListener("click", () => {
      copyText(email).then((copied) => {
        if (!copied) {
          setStatus(text("copyFailed"));
          return;
        }
        button.textContent = text("copied");
        setStatus(text("copiedEmail"));
        window.clearTimeout(copyResetTimer);
        copyResetTimer = window.setTimeout(() => { button.textContent = text("copyEmail"); }, COPY_RESET_MS);
      });
    });
    return button;
  }

  function externalLink(href, label) {
    const link = document.createElement("a");
    link.className = "owner-action";
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = label;
    return link;
  }

  function renderRow(payment) {
    const row = document.createElement("tr");

    const settled = document.createElement("td");
    line(settled, formatMoment(payment.settled_at), "owner-strong");
    if (payment.provider_payment_id) line(settled, payment.provider_payment_id, "owner-muted");
    row.append(settled);

    const listing = document.createElement("td");
    line(listing, payment.listing?.title || text("notRecorded"), "owner-strong");
    if (payment.listing?.hostname) line(listing, payment.listing.hostname, "owner-muted");
    if (payment.listing?.category) line(listing, payment.listing.category, "owner-muted");
    row.append(listing);

    const amount = document.createElement("td");
    line(amount, formatAmount(payment.amount_minor, payment.currency), "owner-strong");
    if (payment.card_network || payment.card_last_four) {
      line(amount, [payment.card_network, payment.card_last_four ? `•••• ${payment.card_last_four}` : ""].filter(Boolean).join(" "), "owner-muted");
    }
    row.append(amount);

    const buyer = document.createElement("td");
    line(buyer, payment.buyer?.name || text("notRecorded"), "owner-strong");
    line(buyer, payment.buyer?.email || text("noEmail"), "owner-muted");
    line(buyer, payment.buyer?.phone || text("noPhone"), "owner-muted");
    const address = addressLine(payment.buyer?.address);
    if (address) line(buyer, address, "owner-muted");
    row.append(buyer);

    const actions = document.createElement("td");
    const group = document.createElement("div");
    group.className = "owner-actions";
    if (payment.buyer?.email) group.append(copyButton(payment.buyer.email));
    const chat = whatsappHref(payment.buyer?.phone);
    if (chat) group.append(externalLink(chat, text("whatsapp")));
    const invoice = safeHttpsUrl(payment.invoice_url);
    if (invoice) group.append(externalLink(invoice, text("invoice")));
    if (!group.childElementCount) line(group, text("notRecorded"), "owner-muted");
    actions.append(group);
    row.append(actions);

    return row;
  }

  function render(payload) {
    lastPayload = payload;
    const payments = Array.isArray(payload.payments) ? payload.payments : [];
    state.currency = String(payload.summary?.currency || payload.board?.currency || state.currency).toUpperCase();
    state.page = Number(payload.pagination?.page || 1);
    state.pages = Number(payload.pagination?.total_pages || 1);

    if (elements.count) elements.count.textContent = String(Number(payload.summary?.settled_count || 0));
    if (elements.total) elements.total.textContent = formatAmount(payload.summary?.total_minor, state.currency);
    if (elements.summary) elements.summary.hidden = false;

    if (elements.rows) {
      elements.rows.replaceChildren();
      payments.forEach((payment) => elements.rows.append(renderRow(payment)));
    }
    if (elements.results) elements.results.hidden = false;
    if (elements.pager) elements.pager.textContent = text("pageOf").replace("{page}", String(state.page)).replace("{pages}", String(state.pages));
    if (elements.previous) elements.previous.disabled = !payload.pagination?.has_previous;
    if (elements.next) elements.next.disabled = !payload.pagination?.has_next;

    if (!payments.length) setStatus(text("noPayments"));
    else if (payments.length === 1) setStatus(text("loadedOne"));
    else setStatus(text("loadedMany").replace("{count}", String(payments.length)));
  }

  function reset() {
    lastPayload = null;
    if (elements.rows) elements.rows.replaceChildren();
    if (elements.results) elements.results.hidden = true;
    if (elements.summary) elements.summary.hidden = true;
    state.page = 1;
    state.pages = 1;
  }

  function messageFor(status, code) {
    if (status === 401 || status === 403) return text("rejected");
    if (code === "production_only") return text("forbiddenMode");
    return text("unavailable");
  }

  // Workers have no canvas, so the picture a link preview shows has to be
  // painted in a browser. It is painted here, by the owner, rather than accepted
  // from the public — an open upload would let anyone choose the image that
  // represents a paying merchant in every share of their listing.
  async function generateShareCards() {
    const C = window.RankoffCard;
    if (!token) return setStatus(text("cardsNeedToken"));
    if (!C?.renderOgCard || !C?.buildCardModel) return setStatus(text("cardsUnavailable"));
    if (elements.cards) elements.cards.disabled = true;
    let done = 0;
    let failed = 0;
    try {
      const board = await fetch("/api/v1/board?board=global&category=all&period=all&limit=100", { cache: "no-store" }).then((r) => r.json());
      const rankings = board?.rankings || [];
      setStatus(text("cardsWorking").replace("{n}", String(rankings.length)));
      for (const entry of rankings) {
        const listing = entry.listing || {};
        const money = `RM ${Math.ceil(Number(entry.bid?.amount_minor || 0) / 100)}`;
        const model = C.buildCardModel({
          language: "en",
          card: {
            name: String(listing.title || listing.hostname || ""),
            place: Number(entry.rank),
            where: "RANKOFF",
            total: money,
            period: "all",
            capturedAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
            logoUrl: C.proxyPathFor(String(listing.url || "")) || "",
          },
        });
        if (!model) { failed += 1; continue; }
        try {
          const blob = await C.renderOgCard(model);
          const response = await fetch(`/api/v1/admin/listings/${encodeURIComponent(listing.id)}/card`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": blob.type || "image/jpeg",
              "X-Rankoff-Rank": String(entry.rank),
              "X-Rankoff-Total": money,
            },
            body: blob,
          });
          if (response.ok) done += 1;
          else failed += 1;
        } catch {
          failed += 1;
        }
      }
      setStatus(text("cardsDone").replace("{done}", String(done)).replace("{failed}", String(failed)));
    } catch {
      setStatus(text("cardsFailed"));
    } finally {
      if (elements.cards) elements.cards.disabled = false;
    }
  }

  async function load(page) {
    if (inFlight) return;
    if (!token) {
      setStatus(text("tokenRequired"));
      return;
    }
    inFlight = true;
    if (elements.load) elements.load.disabled = true;
    setStatus(text("loading"));
    try {
      const response = await fetch(`./api/v1/admin/payments?limit=${PAGE_SIZE}&page=${page}`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        cache: "no-store",
        credentials: "omit",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        reset();
        setStatus(messageFor(response.status, payload.error?.code));
        return;
      }
      render(payload);
    } catch {
      reset();
      setStatus(text("networkError"));
    } finally {
      inFlight = false;
      if (elements.load) elements.load.disabled = false;
    }
  }

  elements.form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const pasted = String(elements.token?.value || "").trim();
    if (pasted) token = pasted;
    if (!token) {
      setStatus(text("tokenRequired"));
      return;
    }
    // The field is emptied as soon as the token is in memory: it should not sit
    // in the DOM, in a form restore, or in a password manager prompt.
    if (elements.token) elements.token.value = "";
    load(1);
  });

  elements.cards?.addEventListener("click", () => { void generateShareCards(); });
  elements.clear?.addEventListener("click", () => {
    token = "";
    if (elements.token) elements.token.value = "";
    reset();
    setStatus(text("cleared"));
  });

  elements.previous?.addEventListener("click", () => { if (state.page > 1) load(state.page - 1); });
  elements.next?.addEventListener("click", () => { load(state.page + 1); });

  elements.languageToggle?.addEventListener("click", () => savePreference({ language: state.language === "zh" ? "en" : "zh" }));
  elements.themeToggle?.addEventListener("click", () => savePreference({ theme: root.dataset.theme === "light" ? "dark" : "light" }));

  applyPreferences();
})();
