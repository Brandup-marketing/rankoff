(() => {
  "use strict";
  const copy = {
    en: "Payment issue or missing logo? Email us with your listing link.",
    zh: "付款遇到问题，或 logo 没有显示？请将榜单链接发送到以下邮箱，我们会协助处理。",
  };
  function render() {
    let chinese = document.documentElement.lang.startsWith("zh");
    // Legal content stays English, while its navigation follows the visitor.
    if (document.querySelector("[data-legal-language]")) {
      const requested = new URL(location.href).searchParams.get("lang");
      let saved;
      try { saved = JSON.parse(localStorage.getItem("rankoff-mvp-demo-v3")); } catch {}
      chinese = requested === "zh" || (!requested && saved?.language === "zh");
    }
    document.querySelectorAll("[data-support-copy]").forEach((element) => {
      element.textContent = copy[chinese ? "zh" : "en"];
      element.lang = chinese ? "zh-Hans" : "en";
    });
  }
  render();
  new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
})();
