// These facts are editorial additions, not inferred from a payment or category.
const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (text) => String(text ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);
const labels = {
  heading: { en: "Business details", zh: "商家资料" },
  services: { en: "Services & products", zh: "服务与产品" },
  areas: { en: "Service areas", zh: "服务地区" },
  location: { en: "Location", zh: "所在地" },
  source: { en: "Source", zh: "资料来源" },
  reviewed: { en: "Source checked", zh: "来源查阅日期" },
  sourced: { en: "Details summarised from the business’s website. Confirm current services and availability with the business.", zh: "资料根据商家网站整理，最新服务与供应情况请向商家确认。" },
  disclosure: { en: "Paid position, not a quality rating or endorsement.", zh: "此为付费位置，不代表品质评分或推荐。" },
  correction: { en: "Suggest a correction", zh: "提交资料更正" },
};

export function safeBusinessUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : "";
  } catch { return ""; }
}

export function renderBusinessProfile(view) {
  const locale = view.language === "zh" ? "zh" : "en";
  const facts = view.businessFacts;
  const text = (value, tag = "span") => `<${tag} data-business-en="${esc(value.en)}" data-business-zh="${esc(value.zh)}">${esc(value[locale])}</${tag}>`;
  const rows = [];
  for (const key of ["services", "location", "areas"]) {
    if (!facts?.[key]) continue;
    const value = facts[key];
    const formatted = { en: Array.isArray(value.en) ? value.en.join(" · ") : value.en, zh: Array.isArray(value.zh) ? value.zh.join(" · ") : value.zh };
    rows.push(`<div><dt>${text(labels[key])}</dt><dd>${text(formatted)}</dd></div>`);
  }
  const hasDetails = rows.length > 0;
  const source = safeBusinessUrl(facts?.source || view.destination);
  if (source) rows.push(`<div><dt>${text(labels.source)}</dt><dd><a href="${esc(source)}" target="_blank" rel="sponsored nofollow noopener noreferrer">${esc(new URL(source).hostname.replace(/^www\./, ""))}${view.platform ? esc(new URL(source).pathname.replace(/\/$/, "")) : ""} ↗</a></dd></div>`);
  if (facts?.reviewedAt) rows.push(`<div><dt>${text(labels.reviewed)}</dt><dd><time datetime="${esc(facts.reviewedAt)}">${esc(facts.reviewedAt)}</time></dd></div>`);
  const subject = encodeURIComponent(`Listing correction: ${view.canonicalBase}`);
  const disclosure = `<p class="business-source-note">${text(labels.disclosure)} <a href="mailto:sales@brandupdesignmarketing.com?subject=${esc(subject)}">${text(labels.correction)}</a></p>`;
  if (!hasDetails) return `<div class="business-profile business-profile-compact">
    <dl class="business-facts">${rows.join("")}</dl>
    ${disclosure}
  </div>`;
  return `<section class="business-profile" aria-labelledby="business-heading">
    <h2 id="business-heading">${text(labels.heading)}</h2>
    <dl class="business-facts">${rows.join("")}</dl>
    <p class="business-source-note">${text(labels.sourced)}</p>
    ${disclosure}
  </section>`;
}

export function businessSubject(view) {
  const subject = { "@type": view.businessFacts ? "Organization" : "Thing", "@id": `${view.canonicalBase}#business`, name: view.title, description: view.description };
  const url = safeBusinessUrl(view.destination);
  if (url) subject.url = url;
  if (view.platform) subject.alternateName = view.hostname;
  // The type of an arbitrary social account is unknown. A profile picture is
  // an image, not necessarily a corporate logo or evidence of incorporation.
  const image = safeBusinessUrl(view.logo);
  if (image) subject.image = image;
  const facts = view.businessFacts;
  const locale = view.language === "zh" ? "zh" : "en";
  if (facts?.areas) subject.areaServed = facts.areas[locale];
  if (facts?.location) subject.location = { "@type": "Place", name: facts.location[locale] };
  return subject;
}
