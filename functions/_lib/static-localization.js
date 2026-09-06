// Server-side copy for the public static pages. The browser still owns live
// board state; this layer makes each advertised ?lang=zh URL truthful before
// JavaScript runs, which matters to link unfurlers and non-JS crawlers.

const SITE_ORIGIN = "https://rankoff.my";

const STATIC_LOCALIZED_METADATA = Object.freeze({
  home: Object.freeze({
    path: "/",
    title: "RANKOFF｜出价登上第 1 名",
    description: "在 Rankoff 出价登上第 1 名。用公开透明的赞助出价，让你的产品出现在实时榜单最显眼的位置。",
    socialTitle: "RANKOFF｜RM5 拿下第 1 名",
    socialDescription: "面向马来西亚商家的公开赞助榜单。RM5 起即可上榜；累计付款金额和追踪点击公开可见。",
  }),
  categories: Object.freeze({
    path: "/categories",
    title: "RANKOFF｜分类",
    description: "浏览 Rankoff 分类，查看每个赞助市场中领先的产品。",
    socialTitle: "RANKOFF｜分类",
    socialDescription: "每个分类都有自己的公开赞助榜单。",
  }),
  about: Object.freeze({
    path: "/about",
    title: "关于 RANKOFF",
    description: "了解 Rankoff 如何把赞助注意力变成公开竞价榜单，让产品为清晰可见的排名展开竞争。",
    socialTitle: "关于 RANKOFF",
    socialDescription: "了解 Rankoff 的运作方式：马来西亚商家付费持有排名，每一笔付款都公开可见。",
  }),
});

const HOME_STATIC_COPY = Object.freeze({
  skipLeaderboard: "跳到榜单", navBoard: "榜单", navCategories: "分类", navAbout: "关于",
  heroCopy: "把产品放到最显眼的位置。只要没有更高的有效出价，你的介绍就会留在榜首。",
  totalBid: "你的总出价", productUrl: "网站或公开社交账号", productUrlPlaceholder: "example.com 或 instagram.com/yourname",
  challengeCategory: "挑战类别", chooseMarket: "选择市场", reviewBid: "确认出价", markets: "市场",
  todayRanking: "今日领先", seeAll: "查看全部", livePulse: "实时竞价", latestActivity: "最新动态", refresh: "刷新",
  boardSummary: "累计出价最高者获得第 1 名。随时追加出价即可上升。", howItWorks: "排名规则",
  rules: "每个条目都是付费广告。累计已结算付款最高者排名第一 —— 没有奖品、没有抽奖，也不涉及任何运气成分。",
  position: "排名位置", positionCopy: "保持到其他条目的累计出价超过为止。", charge: "费用", chargeCopy: "通过安全托管付款页面一次性付款。",
  reporting: "数据", reportingCopy: "所选时间范围内的追踪点击。重复与自动化流量未经过滤——一次点击不等于一位客户。", readRules: "查看完整规则 →",
  askWhatIs: "什么是付费排名榜？", askHowWorks: "Rankoff 排名怎么算？", askHowSponsor: "怎么赞助一个网站或社交账号？",
  rulesLink: "规则", terms: "条款", termsOfService: "服务条款", privacyLink: "隐私", payments: "付款", footerCredit: "Brandup Marketing 出品",
  confirmRank: "确认此排名", confirmRankIntro: "核对排名与价格，同意《服务条款》后继续。", rankLabel: "排名", priceLabel: "价格", dueNow: "现在支付", statVisitors: "访客会话", statClicks: "次跳转到商家", statPaid: "商家累计付款", statWindow: "全时段，由 Rankoff 统计", alreadyPaid: "已付金额", payNow: "本次支付", totalAfter: "付款后累计",
  confirmationCopy: "付款确认后，你的条目会以此排名上线。其他人仍可出价取得更高排名。此次收费是一次性的广告位置费用 —— 不是投注、押金或参赛费。没有奖品，也不涉及任何运气成分。",
  agreeTermsPrefix: "我了解这是为一个公开链接购买的赞助展示，付款不会获得该账号的所有权或编辑权，被展示方可要求下架。我同意《",
  agreeTermsSuffix: "》。", cancel: "取消", continueCheckout: "继续付款", close: "关闭", searchPlaceholder: "搜索产品和分类…",
  brandHome: "RANKOFF 首页", brandLogoAlt: "RANKOFF — 出价登上第一名", rankingTimeframe: "排名时间范围", mainNavigation: "主导航",
  searchResults: "搜索结果", challengeLeaderboard: "挑战排行榜", decreaseBid: "出价减少 10", increaseBid: "出价增加 10",
  filterCategory: "按类别筛选", topThree: "赞助榜单前三名", boardPulse: "榜单动态", boardListings: "赞助条目榜单",
  pageNumbers: "页码", answers: "常见问题", closeDialog: "关闭对话框", rankPrice: "排名与价格",
});

const CATEGORIES_STATIC_COPY = Object.freeze({
  skipCategories: "跳至分类", board: "榜单", categories: "分类", about: "关于", footerParent: "Brandup Marketing 旗下产品",
  rules: "规则", terms: "条款", privacy: "隐私", payments: "付款", seeBoard: "查看榜单", browseMarkets: "浏览市场",
  heroCopy: "每个类别都有自己的榜单。选择一个市场，看看谁在领先。", activeHeading: "最活跃的分类", allHeading: "全部分类", allCopy: "选择一个市场，查看其实时榜单。",
});

const ABOUT_STATIC_COPY = Object.freeze({
  Board: "榜单", Categories: "分类", About: "关于", "The story behind the board": "榜单背后的故事",
  "Attention has a price.": "注意力有价格", "Make it visible.": "让价值被看见",
  "RANKOFF is the public market for visible attention. Products bid for sponsored rank, show what they do, and stay in position until someone pays more. One board, one clear rule: the highest total paid takes #1.": "RANKOFF 是公开的注意力市场。产品通过竞价获得赞助排名，展示自身价值，并保持位置，直到有人出价更高。一个榜单，一条清晰规则：累计付款金额最高者登上第 1 名。",
  "Why it exists": "为什么创立 Rankoff", "Rankoff started with one question.": "Rankoff 始于一个问题。",
  "What if a product launch had a visible market instead of a hidden ad slot? What if anyone could see who was winning, what #1 costs, and which products are earning attention?": "如果产品发布面对的是一个透明市场，而不是隐藏的广告位，会怎样？如果任何人都能看见谁在领先、第 1 名值多少钱，以及哪些产品正在赢得关注，会怎样？",
  "Rankoff turns that question into a public place to compete. Listings are clear, totals paid are visible, and sponsored placement is labelled as sponsored.": "Rankoff 把这个问题变成一个公开竞争的平台。条目信息清晰、累计付款金额公开，赞助展示也会明确标注。",
  Visible: "可见", "Public by default": "默认公开", "Every listing shows its current rank, total paid, and product description.": "每个条目都会显示当前排名、累计付款金额和产品介绍。",
  Simple: "简明", "One clear rule": "一条明确规则", "A higher total paid moves a listing higher on the board.": "累计付款金额越高，条目在榜单上的位置就越靠前。",
  Measured: "可衡量", "Evidence over promises": "数据胜于承诺", "Referral clicks are labelled by how they were measured.": "推荐点击会注明统计方式。",
  "The board today": "今日榜单", "A live market, in public.": "公开、实时的注意力市场。", "live listings": "实时条目", "measured clicks": "已统计点击", "current top bid": "当前最高价",
  "Live board values, updated continuously.": "榜单实时数值，持续更新。", "What happens next": "接下来会发生什么", "The board keeps moving.": "榜单持续变化。",
  Now: "现在", "Submit a listing": "提交条目", "Enter a URL, choose a market, and set the bid that feels worth the position.": "输入网址、选择市场，并为你认为值得的位置设定出价。",
  Then: "随后", "Compete in public": "公开竞争", "Your public identity, description, total paid, and position appear on the board after payment settles.": "付款结算后，你的公开身份、介绍、累计付款金额和位置会显示在榜单上。",
  Next: "接下来", "Measure the outcome": "衡量结果", "Tracked clicks and public activity make the market legible over time.": "追踪点击和公开活动，让市场表现随时间清晰可见。",
  "A Brandup Marketing product": "Brandup Marketing 旗下产品", Rules: "规则", Terms: "条款", Privacy: "隐私", Payments: "付款",
});

const MARKET_TRANSLATIONS = Object.freeze({
  "AI Tools & Agents": "AI 工具与智能体", "Creators & Talent": "创作者与艺人", "Property & Agents": "房产与经纪",
  "Interior & Renovation": "室内设计与装修", "Beauty & Wellness": "美容与养生", "Health & Medical": "健康与医疗",
  "Sports & Fitness": "运动与健身", "Food & Beverage": "餐饮", "Marketing & Advertising": "营销与广告",
  "Creative & Production": "创意与制作", "Professional Services": "专业服务", "Education & Training": "教育与培训",
  "Finance & Insurance": "金融与保险", "Electronics & Repair": "电子与维修", "Retail & Ecommerce": "零售与电商",
  "Hardware & Construction": "五金与建筑", "Home Services": "家居服务", Automotive: "汽车", Other: "其他",
});

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

function replaceStaticCopy(html, attribute, copy) {
  let output = html;
  for (const [key, value] of Object.entries(copy)) {
    const pattern = new RegExp(`(<([a-z][a-z0-9-]*)\\b[^>]*\\b${attribute}="${key}"[^>]*>)[\\s\\S]*?(<\\/\\2>)`, "gi");
    output = output.replace(pattern, `$1${escapeHtml(value)}$3`);
  }
  return output;
}

function replaceMarkedAttribute(html, marker, target, copy) {
  return html.replace(new RegExp(`<[^>]+${marker}="[^"]+"[^>]*>`, "gi"), (tag) => {
    const key = new RegExp(`${marker}="([^"]+)"`, "i").exec(tag)?.[1];
    if (!key || !copy[key]) return tag;
    const value = escapeHtml(copy[key]);
    const targetPattern = new RegExp(`(\\s${target}=)"[^"]*"`, "i");
    return targetPattern.test(tag)
      ? tag.replace(targetPattern, `$1"${value}"`)
      : tag.replace(/>$/, ` ${target}="${value}">`);
  });
}

function replaceHeadAttribute(html, marker, target, value) {
  return html.replace(/<(?:meta|link)\b[^>]*>/gi, (tag) => {
    if (!marker.test(tag)) return tag;
    const escaped = escapeHtml(value);
    return new RegExp(`${target}="[^"]*"`, "i").test(tag)
      ? tag.replace(new RegExp(`${target}="[^"]*"`, "i"), `${target}="${escaped}"`)
      : tag.replace(/\s*\/>$/, ` ${target}="${escaped}" />`);
  });
}

function localizeCommon(html) {
  let output = html.replace(/<html lang="[^"]*"/, '<html lang="zh-Hans"');
  output = output.replace(/aria-label="RANKOFF home"/g, 'aria-label="RANKOFF 首页"');
  output = output.replace(/aria-label="Main navigation"/g, 'aria-label="主导航"');
  output = output.replace(/aria-label="Search products and categories"/g, 'aria-label="搜索产品和分类"');
  output = output.replace(/alt="RANKOFF — Bid your way to number one"/g, 'alt="RANKOFF — 竞价登上第 1 名"');
  output = output.replace(/(<button class="language-toggle"[^>]*)(>)[\s\S]*?(<\/button>)/, (match, open, close, end) => {
    const labelled = /aria-label="[^"]*"/.test(open)
      ? open.replace(/aria-label="[^"]*"/, 'aria-label="切换为英文"')
      : `${open} aria-label="切换为英文"`;
    return `${labelled}${close}EN${end}`;
  });
  output = output.replace(/(<button class="theme-toggle"[^>]*aria-label=")[^"]*("[^>]*>)[\s\S]*?(<\/button>)/, "$1切换至浅色主题$2浅色$3");
  output = output.replace(/href="\/categories"/g, 'href="/categories?lang=zh"');
  output = output.replace(/href="\/about"/g, 'href="/about?lang=zh"');
  output = output.replace(/href="\.\/"/g, 'href="/?lang=zh"');
  output = output.replace(/href="\/"/g, 'href="/?lang=zh"');
  return output;
}

function localizeMetadata(html, page) {
  const metadata = STATIC_LOCALIZED_METADATA[page];
  const canonical = `${SITE_ORIGIN}${metadata.path}?lang=zh`;
  let output = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(metadata.title)}</title>`);
  output = replaceHeadAttribute(output, /name="description"/i, "content", metadata.description);
  output = replaceHeadAttribute(output, /property="og:title"/i, "content", metadata.socialTitle);
  output = replaceHeadAttribute(output, /property="og:description"/i, "content", metadata.socialDescription);
  output = replaceHeadAttribute(output, /property="og:url"/i, "content", canonical);
  output = replaceHeadAttribute(output, /property="og:locale"/i, "content", "zh_MY");
  output = replaceHeadAttribute(output, /property="og:locale:alternate"/i, "content", "en_MY");
  output = replaceHeadAttribute(output, /name="twitter:title"/i, "content", metadata.socialTitle);
  output = replaceHeadAttribute(output, /name="twitter:description"/i, "content", metadata.socialDescription);
  output = replaceHeadAttribute(output, /rel="canonical"/i, "href", canonical);
  return output;
}

export function localizeStaticPage(shell, page, language = "en") {
  if (language !== "zh" || !STATIC_LOCALIZED_METADATA[page]) return shell;
  let html = localizeMetadata(localizeCommon(String(shell)), page);
  if (page === "home") {
    html = replaceStaticCopy(html, "data-i18n", HOME_STATIC_COPY);
    html = replaceMarkedAttribute(html, "data-i18n-placeholder", "placeholder", HOME_STATIC_COPY);
    html = replaceMarkedAttribute(html, "data-i18n-aria-label", "aria-label", HOME_STATIC_COPY);
    html = replaceMarkedAttribute(html, "data-i18n-alt", "alt", HOME_STATIC_COPY);
    const price = /<strong data-hero-next-price>([\s\S]*?)<\/strong>/.exec(html)?.[1] || "RM 5";
    html = html.replace(/<h1 id="page-title">[\s\S]*?<\/h1>/, `<h1 id="page-title"><strong data-hero-next-price>${price}</strong><span class="hero-word" data-hero-join> 拿下</span><span data-hero-market></span><span data-hero-rank>第 1 名</span><span class="hero-word" data-hero-lead></span></h1>`);
    html = html.replace(/>All-time<\/button>/g, ">全部时间</button>").replace(/>Past 24h<\/button>/g, ">近 24 小时</button>");
    html = html.replace(/(<span class="demo-state"[^>]*>\s*<i[^>]*><\/i>\s*)Live board(<\/span>)/, "$1实时榜单$2");
    html = html.replace(/(<span data-entry-toggle-label>)Claim #1(<\/span>)/, "$1拿下第 1 名$2");
    html = html.replace(/(<span data-panel-toggle-label>)Minimize(<\/span>)/g, "$1收起$2");
    html = html.replace(/href="\/\?period=today#board"/, 'href="/?lang=zh&amp;period=today#board"');
    html = html.replace(/>Sponsored leaderboard<\/h2>/, ">实时赞助榜单</h2>");
    html = html.replace(/>How clicks are measured<\/summary>/, ">点击如何统计</summary>");
    html = html.replace(/>Referral clicks update from Rankoff tracking for the selected timeframe\.<\/p>/, ">推荐点击会根据所选时间范围内的 Rankoff 跳转记录更新。</p>");
    html = html.replace(/aria-label="Leaderboard pages"/, 'aria-label="榜单页码"');
    html = html.replace(/aria-label="Scroll markets left"/, 'aria-label="向左滚动市场"').replace(/aria-label="Scroll markets right"/, 'aria-label="向右滚动市场"');
    html = html.replace(/(<button[^>]*data-board-page="previous"[^>]*>)[\s\S]*?(<\/button>)/, "$1← 上一页$2");
    html = html.replace(/(<button[^>]*data-board-page="next"[^>]*>)[\s\S]*?(<\/button>)/, "$1下一页 →$2");
    html = html.replace(/(<span data-page-total>)of 50(<\/span>)/, "$1共 50 条$2");
    html = html.replace(/(<small data-dialog-context>)All-time · AI &amp; Automation(<\/small>)/, "$1全部时间 · AI 工具与智能体$2");
    html = html.replace(/(<h2[^>]*data-share-heading>)Share this rank(<\/h2>)/, "$1分享此排名$2");
    html = html.replace(/(<p[^>]*data-share-intro>)Send the exact position, board, and category\.(<\/p>)/, "$1发送准确的排名、榜单和类别。$2");
    html = html.replace(/aria-label="Close share options"/, 'aria-label="关闭分享选项"');
    html = html.replace(/(<button[^>]*data-card-save[^>]*>)Save image(<\/button>)/, "$1保存图片$2");
    html = html.replace(/(<span data-share-link-label>)Rank link(<\/span>)/, "$1排名链接$2");
    html = html.replace(/(<button[^>]*data-share-copy[^>]*>)Copy link(<\/button>)/, "$1复制链接$2");
    html = html.replace(/aria-label="Share options"/, 'aria-label="分享选项"');
    html = html.replace(/>Send to a contact<\/small>/, ">发送给联系人</small>");
    html = html.replace(/>Post to your timeline<\/small>/, ">发布到动态</small>");
    html = html.replace(/>Post with your rank<\/small>/, ">附上排名发布</small>");
    html = html.replace(/(<span data-share-native-label>)Share…(<\/span>)/, "$1分享…$2");
    html = html.replace(/>Messenger and more apps<\/small>/, ">Messenger 及更多应用</small>");
    html = html.replace(/(<span class="board-seo-note"[^>]*>)Sponsored · ([^·<]+) · ([^·<]+) settled · ([\d,]+) tracked clicks<\/span>/g, (match, open, market, total, clicks) => `${open}广告 · ${escapeHtml(MARKET_TRANSLATIONS[market.trim().replaceAll("&amp;", "&")] || market.trim().replaceAll("&amp;", "&"))} · ${total.trim()} 已结算 · ${clicks} 次追踪点击</span>`);
    const schemaMatch = /<script id="website-schema" type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html);
    if (schemaMatch) {
      try {
        const schema = JSON.parse(schemaMatch[1]);
        schema.url = `${SITE_ORIGIN}/?lang=zh`;
        schema.description = "Rankoff 是公开的赞助排名榜，产品通过透明出价竞争最显眼的位置。";
        schema.inLanguage = "zh-Hans";
        if (schema.potentialAction) {
          schema.potentialAction.target = `${SITE_ORIGIN}/?lang=zh`;
          schema.potentialAction.name = "认领赞助排名";
        }
        html = html.replace(schemaMatch[0], `<script id="website-schema" type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>`);
      } catch {
        /* The static schema remains valid if its hand-authored shape changes. */
      }
    }
  } else if (page === "categories") {
    html = replaceStaticCopy(html, "data-copy", CATEGORIES_STATIC_COPY);
    for (const [english, chinese] of Object.entries(MARKET_TRANSLATIONS)) html = html.split(`>${english.replaceAll("&", "&amp;")}<`).join(`>${escapeHtml(chinese)}<`);
    html = html.replace(/href="\/\?category=([^"#]+)#board"/g, 'href="/?lang=zh&amp;category=$1#board"');
    html = html.replace(/(<label[^>]*for="site-search-input"[^>]*>)[\s\S]*?(<\/label>)/, "$1搜索产品和分类$2");
    html = html.replace(/(<input[^>]*data-site-search-input[^>]*placeholder=")[^"]*(")/, "$1搜索产品和分类…$2");
    html = html.replace(/(<button[^>]*data-search-close[^>]*>)[\s\S]*?(<\/button>)/, "$1关闭$2");
    html = html.replace(/aria-label="Search results"/, 'aria-label="搜索结果"');
    html = html.replace(/aria-label="Board status"/, 'aria-label="榜单状态"');
    html = html.replace(/(<strong data-category-status>)Live board(<\/strong>)/, "$1实时榜单$2");
    html = html.replace(/aria-label="Category timeframe"/, 'aria-label="分类时间范围"');
    html = html.replace(/>Loading…<\/span>/, ">正在载入…</span>");
    html = html.replace(/>All-time<\/button>/g, ">全部时间</button>").replace(/>Today<\/button>/g, ">今日</button>");
  } else if (page === "about") {
    for (const [english, chinese] of Object.entries(ABOUT_STATIC_COPY)) html = html.split(`>${english}<`).join(`>${escapeHtml(chinese)}<`);
    html = html.replace(/aria-label="Rankoff origin"/, 'aria-label="Rankoff 起源"').replace(/aria-label="Rankoff principles"/, 'aria-label="Rankoff 原则"');
  }
  return html;
}

export async function serveLocalizedAsset(context, assetPath, page) {
  if (!context.env.ASSETS?.fetch) return context.next();
  const requestUrl = new URL(context.request.url);
  const response = await context.env.ASSETS.fetch(new Request(new URL(assetPath, requestUrl.origin)));
  if (!response.ok) return context.next();
  const language = requestUrl.searchParams.get("lang") === "zh" ? "zh" : "en";
  return new Response(localizeStaticPage(await response.text(), page, language), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Language": language === "zh" ? "zh-Hans" : "en",
      "Cache-Control": "public, max-age=60, must-revalidate",
    },
  });
}
