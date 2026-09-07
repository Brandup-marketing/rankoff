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
    description: "Rankoff 怎么运作：马来西亚商家付费占据公开榜单的位置，每一笔付款和点击都公开可见。",
    socialTitle: "关于 RANKOFF",
    socialDescription: "Rankoff 怎么运作：马来西亚商家付费占据公开榜单的位置，每一笔付款和点击都公开可见。",
  }),
});

const HOME_STATIC_COPY = Object.freeze({
  skipLeaderboard: "跳到榜单", navBoard: "榜单", navCategories: "分类", navAbout: "关于",
  heroCopy: "把你的生意放在顾客第一眼看到的位置。直到有人付得更多，它都留在榜首。",
  totalBid: "付款金额", productUrl: "你的网站或社交账号", productUrlPlaceholder: "example.com 或 instagram.com/yourname",
  challengeCategory: "市场", chooseMarket: "选择市场", reviewBid: "确认并付款", markets: "市场",
  todayRanking: "今日领先", seeAll: "查看全部", livePulse: "实时竞价", latestActivity: "最新动态", refresh: "刷新",
  boardSummary: "累计付款最高者第 1 名。随时追加付款即可上升。", howItWorks: "排名规则",
  rules: "每个条目都是付费广告。累计付款最高者排第一——没有奖品、没有抽奖，也不涉及任何运气成分。",
  position: "排名位置", positionCopy: "直到别的条目累计付款超过你为止。", charge: "费用", chargeCopy: "通过安全托管付款页面一次性付款。",
  reporting: "数据", reportingCopy: "所选时间范围内的追踪点击。重复与自动化流量未经过滤——一次点击不等于一位客户。", readRules: "查看完整规则 →",
  askWhatIs: "什么是付费排名榜？", askHowWorks: "Rankoff 排名怎么算？", askHowSponsor: "怎么赞助一个网站或社交账号？",
  rulesLink: "规则", terms: "条款", termsOfService: "服务条款", privacyLink: "隐私", payments: "付款", footerCredit: "Brandup Marketing 出品",
  confirmRank: "确认此排名", confirmRankIntro: "核对排名与价格，同意《服务条款》后继续。", rankLabel: "排名", priceLabel: "价格", dueNow: "现在支付", stepPay: "付款", stepPayCopy: "一次付清，RM5 起。", stepRank: "排名", stepRankCopy: "累计付款最高者拿下第 1 名。", stepHold: "保持", stepHoldCopy: "直到有人付得更多。随时可追加。", statVisitors: "访问人次", statClicks: "次点进商家", statPaid: "商家已付", statWindow: "全时段，由 Rankoff 统计", alreadyPaid: "已付金额", payNow: "本次支付", totalAfter: "付款后累计",
  confirmationCopy: "付款确认后，你的条目会以此排名上线。其他人仍可付更多取得更高排名。此次收费是一次性的广告位置费用 —— 不是投注、押金或参赛费。没有奖品，也不涉及任何运气成分。",
  agreeTermsPrefix: "我了解这是为一个公开链接购买的赞助展示，付款不会获得该账号的所有权或编辑权，被展示方可要求下架。我同意《",
  agreeTermsSuffix: "》。", cancel: "取消", continueCheckout: "继续付款", close: "关闭", searchPlaceholder: "搜索商家和市场…",
  brandHome: "RANKOFF 首页", brandLogoAlt: "RANKOFF — 出价登上第一名", rankingTimeframe: "排名时间范围", mainNavigation: "主导航",
  searchResults: "搜索结果", challengeLeaderboard: "挑战排行榜", decreaseBid: "减少 RM5", increaseBid: "增加 RM5",
  filterCategory: "按类别筛选", topThree: "赞助榜单前三名", boardPulse: "榜单动态", boardListings: "赞助条目榜单",
  pageNumbers: "页码", answers: "常见问题", closeDialog: "关闭对话框", rankPrice: "排名与价格",
});

const CATEGORIES_STATIC_COPY = Object.freeze({
  skipCategories: "跳至分类", board: "榜单", categories: "分类", about: "关于", footerParent: "Brandup Marketing 旗下产品",
  rules: "规则", terms: "条款", privacy: "隐私", payments: "付款", seeBoard: "查看榜单", browseMarkets: "浏览市场",
  heroCopy: "每个市场都有自己的榜单。选你的行业，看看谁在榜首。", activeHeading: "最活跃的分类", allHeading: "全部分类", allCopy: "选择一个市场，查看其实时榜单。",
});

const ABOUT_STATIC_COPY = Object.freeze({
  Board: "榜单", Categories: "分类", About: "关于", "The story behind the board": "榜单背后的故事",
  "Attention has a price.": "注意力，明码标价。", "Make it visible.": "让它公开可见。",
  "RANKOFF is the public leaderboard for Malaysian businesses. Pay to hold a spot, show customers what you do, and keep it until someone pays more. One board, one rule: the highest total paid takes #1.": "RANKOFF 是马来西亚商家的公开榜单。付费占一个位置，把你的生意展示给顾客，直到有人付得更多。一个榜单，一条规则：累计付款最高者，就是第 1 名。",
  "Why it exists": "为什么有 Rankoff", "Rankoff started with one question.": "Rankoff 始于一个问题。",
  "What if a business could buy the top spot in the open, not in a hidden ad auction? What if everyone could see who is on top, what it cost, and who is getting the clicks?": "如果商家可以光明正大买下最显眼的位置，而不是在看不见的广告竞价里？如果每个人都能看到谁在榜首、花了多少钱、谁拿到了点击？",
  "Rankoff is the answer: a public board where the price, the position and the clicks are all on show, and every listing is labelled as sponsored.": "Rankoff 就是答案：一个公开榜单，价格、排名、点击全部公开，每个条目都标明是赞助。",
  Visible: "可见", "Public by default": "默认公开", "Every listing shows its rank, its total paid, and what the business does.": "每个条目都显示排名、累计付款，以及这家生意是做什么的。",
  Simple: "简明", "One clear rule": "一条规则", "Pay more than the listing above you and you move up. That is the whole rule.": "付得比上面那家多，你就往上走。规则就这么简单。",
  Measured: "可衡量", "Evidence over promises": "数据胜于承诺", "Clicks are tracked redirects, counted by Rankoff and shown in public. No promises, just the number.": "点击是 Rankoff 记录的跳转次数，公开显示。不承诺效果，只给你数字。",
  "The board today": "榜单现况", "The board, right now.": "此刻的榜单。", "live listings": "上榜条目", "tracked clicks": "追踪点击", "top total paid": "最高累计付款",
  "Real numbers from the board, updated live.": "榜单真实数据，实时更新。", "Claim your spot →": "拿下你的位置 →", "How it works": "运作方式", "The board keeps moving.": "榜单一直在动。",
  Now: "现在", "List your business": "让生意上榜", "Enter your website, choose a market, and pay from RM5.": "输入网站、选择市场，RM5 起付款。",
  Then: "随后", "Compete in public": "公开竞争", "Once payment settles, your business, your total and your position are on the board for everyone to see.": "付款确认后，你的生意、累计付款和排名就公开在榜单上，人人可见。",
  Next: "接下来", "See what it earns": "看看回报", "Tracked clicks show how many people went from the board to your website.": "追踪点击告诉你，有多少人从榜单点进了你的网站。",
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
  output = output.replace(/aria-label="Search businesses and markets"/g, 'aria-label="搜索商家和市场"');
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
    html = html.replace(/(<span data-entry-toggle-label>)Enter your website(<\/span>)/, "$1输入你的网站$2");
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
    html = html.replace(/(<span class="board-seo-note"[^>]*>)Sponsored · ([^·<]+) · ([^·<]+) paid · ([\d,]+) tracked clicks<\/span>/g, (match, open, market, total, clicks) => `${open}广告 · ${escapeHtml(MARKET_TRANSLATIONS[market.trim().replaceAll("&amp;", "&")] || market.trim().replaceAll("&amp;", "&"))} · 已付 ${total.trim()} · ${clicks} 次追踪点击</span>`);
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
    html = html.replace(/(<label[^>]*for="site-search-input"[^>]*>)[\s\S]*?(<\/label>)/, "$1搜索商家和市场$2");
    html = html.replace(/(<input[^>]*data-site-search-input[^>]*placeholder=")[^"]*(")/, "$1搜索商家和市场…$2");
    html = html.replace(/(<button[^>]*data-search-close[^>]*>)[\s\S]*?(<\/button>)/, "$1关闭$2");
    html = html.replace(/aria-label="Search results"/, 'aria-label="搜索结果"');
    html = html.replace(/aria-label="Board status"/, 'aria-label="榜单状态"');
    html = html.replace(/(<strong data-category-status>)Live board(<\/strong>)/, "$1实时榜单$2");
    html = html.replace(/aria-label="Category timeframe"/, 'aria-label="分类时间范围"');
    html = html.replace(/>Loading…<\/span>/, ">正在载入…</span>");
    html = html.replace(/>All-time<\/button>/g, ">全部时间</button>").replace(/>Past 24h<\/button>/g, ">近 24 小时</button>");
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
