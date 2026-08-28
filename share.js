(() => {
  "use strict";

  const dialog = document.querySelector("[data-share-dialog]");
  if (!dialog) return;

  const elements = {
    title: dialog.querySelector("[data-share-title]"),
    text: dialog.querySelector("[data-share-text]"),
    url: dialog.querySelector("[data-share-url]"),
    copy: dialog.querySelector("[data-share-copy]"),
    whatsapp: dialog.querySelector("[data-share-whatsapp]"),
    whatsappLabel: dialog.querySelector("[data-share-whatsapp-label]"),
    native: dialog.querySelector("[data-share-native]"),
    nativeLabel: dialog.querySelector("[data-share-native-label]"),
    options: dialog.querySelector(".share-options"),
    close: Array.from(dialog.querySelectorAll("[data-share-close]")),
    heading: dialog.querySelector("[data-share-heading]"),
    intro: dialog.querySelector("[data-share-intro]"),
    linkLabel: dialog.querySelector("[data-share-link-label]"),
    whatsappNote: dialog.querySelector("[data-share-whatsapp-note]"),
    nativeNote: dialog.querySelector("[data-share-native-note]"),
  };

  const labels = {
    en: {
      heading: "Share this rank", intro: "Send the exact position, board, and category.", link: "Rank link",
      copy: "Copy link", copied: "Copied", copySuccess: "Rank link copied.", copyError: "Unable to copy the rank link.",
      whatsapp: "WhatsApp", whatsappNote: "Send to a contact", native: "Share…", nativeNote: "Messenger and more apps",
      nativeOpened: "Share menu opened.", close: "Close share options", options: "Share options",
    },
    zh: {
      heading: "分享此排名", intro: "发送准确的排名、榜单与分类。", link: "排名链接",
      copy: "复制链接", copied: "已复制", copySuccess: "排名链接已复制。", copyError: "无法复制排名链接。",
      whatsapp: "WhatsApp", whatsappNote: "发送给联系人", native: "分享…", nativeNote: "Messenger 与更多应用",
      nativeOpened: "已打开分享菜单。", close: "关闭分享选项", options: "分享选项",
    },
  };

  let current = null;
  let copyResetTimer = null;

  function language() { return current?.language === "zh" ? "zh" : "en"; }

  function copyText(value) {
    if (navigator.clipboard?.writeText && window.isSecureContext) return navigator.clipboard.writeText(value).then(() => true);
    const helper = document.createElement("textarea");
    helper.value = value;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.append(helper);
    helper.select();
    const copied = document.execCommand("copy");
    helper.remove();
    return Promise.resolve(copied);
  }

  function status(message, type = "success") {
    if (typeof current?.onStatus === "function") current.onStatus(message, type);
  }

  function close() {
    window.clearTimeout(copyResetTimer);
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else dialog.removeAttribute("open");
  }

  async function copyLink() {
    if (!current) return;
    const strings = labels[language()];
    try {
      const copied = await copyText(current.url);
      if (!copied) throw new Error("Copy failed");
      elements.copy.textContent = strings.copied;
      status(strings.copySuccess);
      window.clearTimeout(copyResetTimer);
      copyResetTimer = window.setTimeout(() => { elements.copy.textContent = strings.copy; }, 1400);
    } catch {
      status(strings.copyError, "error");
    }
  }

  function openWhatsApp() {
    if (!current) return;
    const message = encodeURIComponent(`${current.text} ${current.url}`);
    window.open(`https://wa.me/?text=${message}`, "_blank", "noopener,noreferrer");
    close();
  }

  async function openNativeShare() {
    if (!current || typeof navigator.share !== "function") return copyLink();
    try {
      await navigator.share({ title: current.title, text: current.text, url: current.url });
      status(labels[language()].nativeOpened);
      close();
    } catch (error) {
      if (error?.name !== "AbortError") await copyLink();
    }
  }

  function localize() {
    const strings = labels[language()];
    elements.heading.textContent = strings.heading;
    elements.intro.textContent = strings.intro;
    elements.linkLabel.textContent = strings.link;
    elements.copy.textContent = strings.copy;
    elements.whatsappLabel.textContent = strings.whatsapp;
    elements.whatsappNote.textContent = strings.whatsappNote;
    elements.nativeLabel.textContent = strings.native;
    elements.nativeNote.textContent = strings.nativeNote;
    elements.options.setAttribute("aria-label", strings.options);
    elements.close.forEach((button) => button.setAttribute("aria-label", strings.close));
  }

  function open(options) {
    current = {
      title: String(options?.title || "RANKOFF"), text: String(options?.text || ""),
      url: String(options?.url || window.location.href), language: options?.language === "zh" ? "zh" : "en",
      onStatus: options?.onStatus,
    };
    localize();
    elements.title.textContent = current.title;
    elements.text.textContent = current.text;
    elements.url.value = current.url;
    elements.native.hidden = typeof navigator.share !== "function";
    elements.options.classList.toggle("is-single", elements.native.hidden);
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else dialog.setAttribute("open", "");
    window.setTimeout(() => elements.copy.focus(), 0);
  }

  elements.copy.addEventListener("click", copyLink);
  elements.whatsapp.addEventListener("click", openWhatsApp);
  elements.native.addEventListener("click", openNativeShare);
  elements.close.forEach((button) => button.addEventListener("click", close));
  dialog.addEventListener("click", (event) => { if (event.target === dialog) close(); });

  window.RankoffShare = { open };
})();
