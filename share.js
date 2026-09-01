(() => {
  "use strict";

  const dialog = document.querySelector("[data-share-dialog]");
  if (!dialog) return;

  const elements = {
    title: dialog.querySelector("[data-share-title]"),
    text: dialog.querySelector("[data-share-text]"),
    mark: dialog.querySelector("[data-share-mark]"),
    image: dialog.querySelector("[data-share-image]"),
    note: dialog.querySelector("[data-share-note]"),
    url: dialog.querySelector("[data-share-url]"),
    copy: dialog.querySelector("[data-share-copy]"),
    whatsapp: dialog.querySelector("[data-share-whatsapp]"),
    whatsappLabel: dialog.querySelector("[data-share-whatsapp-label]"),
    facebook: dialog.querySelector("[data-share-facebook]"),
    facebookLabel: dialog.querySelector("[data-share-facebook-label]"),
    facebookNote: dialog.querySelector("[data-share-facebook-note]"),
    x: dialog.querySelector("[data-share-x]"),
    xLabel: dialog.querySelector("[data-share-x-label]"),
    xNote: dialog.querySelector("[data-share-x-note]"),
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
      whatsapp: "WhatsApp", whatsappNote: "Send to a contact", native: "Share…", nativeNote: "Instagram, Messenger, more",
      facebook: "Facebook", facebookNote: "Post to your timeline", x: "X", xNote: "Post with your rank",
      nativeOpened: "Share menu opened.", close: "Close share options", options: "Share options",
    },
    zh: {
      heading: "分享此排名", intro: "发送准确的排名、榜单与分类。", link: "排名链接",
      copy: "复制链接", copied: "已复制", copySuccess: "排名链接已复制。", copyError: "无法复制排名链接。",
      whatsapp: "WhatsApp", whatsappNote: "发送给联系人", native: "分享…", nativeNote: "Instagram、Messenger 等",
      facebook: "Facebook", facebookNote: "发到你的动态", x: "X", xNote: "带排名发帖",
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

  // Facebook reads the page's own og tags and drops any text we pass, so the
  // card does the talking there. X keeps the sentence, so it gets both.
  function openFacebook() {
    if (!current) return;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(current.url)}`, "_blank", "noopener,noreferrer");
    close();
  }

  function openX() {
    if (!current) return;
    const text = encodeURIComponent(current.text);
    window.open(`https://x.com/intent/post?text=${text}&url=${encodeURIComponent(current.url)}`, "_blank", "noopener,noreferrer");
    close();
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
    if (elements.facebookLabel) elements.facebookLabel.textContent = strings.facebook;
    if (elements.facebookNote) elements.facebookNote.textContent = strings.facebookNote;
    if (elements.xLabel) elements.xLabel.textContent = strings.x;
    if (elements.xNote) elements.xNote.textContent = strings.xNote;
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
    // The preview is where a merchant decides whether this is worth sending, so
    // it carries the same brand and words the recipient's app will render.
    if (elements.note) {
      elements.note.textContent = String(options.description || "");
      elements.note.hidden = !options.description;
    }
    if (elements.mark && elements.image) {
      const source = String(options.image || "");
      elements.mark.hidden = !source;
      if (source && elements.image.src !== source) elements.image.src = source;
      elements.image.onerror = () => { elements.mark.hidden = true; };
    }
    elements.url.value = current.url;
    elements.native.hidden = typeof navigator.share !== "function";
    // One column is only right when one option survives; with Facebook and X
    // present, hiding the native sheet still leaves a grid.
    const visibleOptions = [...dialog.querySelectorAll(".share-option")].filter((option) => !option.hidden).length;
    elements.options.classList.toggle("is-single", visibleOptions <= 1);
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else dialog.setAttribute("open", "");
    window.setTimeout(() => elements.copy.focus(), 0);
  }

  elements.copy.addEventListener("click", copyLink);
  elements.whatsapp.addEventListener("click", openWhatsApp);
  elements.facebook?.addEventListener("click", openFacebook);
  elements.x?.addEventListener("click", openX);
  elements.native.addEventListener("click", openNativeShare);
  elements.close.forEach((button) => button.addEventListener("click", close));
  dialog.addEventListener("click", (event) => { if (event.target === dialog) close(); });

  window.RankoffShare = { open };
})();
