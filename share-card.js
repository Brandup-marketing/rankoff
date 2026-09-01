// Instagram accepts no link. It accepts an image. A merchant who just paid for
// #1 in a market has nothing to post there today, because the only thing we can
// hand the OS is a URL whose preview picture is the merchant's own logo — which
// says nothing about the rank they bought.
//
// This module paints that rank onto a canvas and hands the OS a PNG file, which
// is what puts Instagram, Stories and WhatsApp Status into the share sheet.
//
// It is an ES module so the pure parts (parsing, wrapping, naming) can be unit
// tested in Node; the browser loads it with <script type="module">, which the
// site's `script-src 'self'` allows. Nothing here touches the DOM at load time.

export const CARD_SHAPES = Object.freeze({
  square: Object.freeze({ name: "square", width: 1080, height: 1080, pad: 84, scale: 1, safeTop: 0, safeBottom: 0 }),
  // Instagram and WhatsApp draw their own controls over the top and bottom of a
  // story, so the wordmark and the footer are held inside that chrome, and the
  // type runs larger because the card is read at arm's length on a phone.
  story: Object.freeze({ name: "story", width: 1080, height: 1920, pad: 92, scale: 1.3, safeTop: 150, safeBottom: 200 }),
});

// The dark theme's own tokens, resolved to sRGB. The card is always dark, even
// when the site is in light mode: it is going onto somebody's Story, not a page.
const PALETTE = Object.freeze({
  bg: "#080505",
  line: "#2f2726",
  ink: "#eeeaea",
  muted: "#a59c9b",
  accent: "#f73a33",
  accentStrong: "#ff5d50",
  accentSoft: "#2d0c09",
});

const FONT_STACK = 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const LOGO_TIMEOUT_MS = 4000;

export const CARD_STRINGS = Object.freeze({
  en: Object.freeze({ total: "Settled total", todayTotal: "Past 24h total", footer: "Sponsored ranking", board: "on RANKOFF", allTime: "All-time", today: "Past 24h" }),
  zh: Object.freeze({ total: "累计出价", todayTotal: "近 24 小时累计", footer: "赞助排名", board: "RANKOFF 全站", allTime: "全部时间", today: "近 24 小时" }),
});

function fontOf(weight, size) {
  return `${weight} ${Math.round(size)}px ${FONT_STACK}`;
}

// ---------------------------------------------------------------------------
// Reading the rank back out of the share copy.
//
// app.js and listing.js already decide which of the two true positions is worth
// showing — the market one, or the whole-board one — and write it into the share
// title. The card must say the same thing, so it reads that decision rather than
// making a second one. If the sentence does not match, nothing is guessed: the
// caller gets null and the card is not offered at all.
// ---------------------------------------------------------------------------

const TITLE_EN = /^(.+?)\s+—\s+#(\d+)\s+(in|on)\s+(.+)$/;
const TITLE_ZH = /^(.+?)\s+—\s+(.+?)\s*第\s*(\d+)\s*名$/;

export function parseRankTitle(title) {
  const value = String(title || "").replace(/\s+/g, " ").trim();
  if (!value) return null;
  const english = value.match(TITLE_EN);
  if (english) {
    return { name: english[1].trim(), place: Number(english[2]), joiner: english[3], where: english[4].trim() };
  }
  const chinese = value.match(TITLE_ZH);
  if (chinese) {
    return { name: chinese[1].trim(), place: Number(chinese[3]), joiner: "", where: chinese[2].trim() };
  }
  return null;
}

const TOTAL_EN = /with an?\s+([^.]{1,24}?)\s+sponsored bid/i;
const TOTAL_ZH = /以\s*([^的]{1,24}?)\s*的赞助出价/;

// The money the board actually settled, taken verbatim out of the sentence the
// board itself composed. A figure that does not contain a digit is not money,
// and an absent one leaves the block off the card rather than inventing one.
export function parseSettledTotal(text) {
  const value = String(text || "");
  const match = value.match(TOTAL_EN) || value.match(TOTAL_ZH);
  if (!match) return "";
  const total = match[1].trim();
  return /\d/.test(total) ? total : "";
}

// Only a website has a logo we can go and get. A social profile hides its
// picture from crawlers, so those cards carry initials, same as the board does.
export function proxyPathFor(url) {
  try {
    const parsed = new URL(String(url || ""), "https://rankoff.my");
    const match = parsed.pathname.match(/^\/product\/([a-z0-9.-]+)\/?$/i);
    return match ? `/img/${match[1].toLowerCase()}` : "";
  } catch {
    return "";
  }
}

// Mirrors functions/_lib/product.js initialsFor: one character for a CJK name,
// two letters for a latin one.
export function initialsOf(name) {
  const source = String(name || "").trim();
  if (!source) return "R";
  if (/[㐀-鿿]/.test(source)) return (source.match(/[㐀-鿿]/) || ["R"])[0];
  const words = source.replace(/[^A-Za-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  if (!words.length) return source.slice(0, 1).toUpperCase();
  return (words[0][0] + (words[1]?.[0] || "")).toUpperCase();
}

export function cardFileName(name, shape) {
  const slug = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `rankoff-${slug || "rank"}-${shape === "story" ? "story" : "square"}.png`;
}

export function buildCardModel(options) {
  const language = options?.language === "zh" ? "zh" : "en";
  const strings = CARD_STRINGS[language];
  const explicit = options?.card && typeof options.card === "object" ? options.card : null;
  const parsed = parseRankTitle(options?.title);
  const name = String(explicit?.name ?? parsed?.name ?? "").trim();
  const place = Number(explicit?.place ?? parsed?.place ?? NaN);
  const where = String(explicit?.where ?? parsed?.where ?? "").trim();
  if (!name || !where || !Number.isInteger(place) || place < 1) return null;

  const board = where === "RANKOFF";
  const joiner = String(explicit?.joiner ?? parsed?.joiner ?? "");
  const position = language === "zh"
    ? (board ? strings.board : where)
    : `${board || joiner === "on" ? "on" : "in"} ${where}`;
  const total = String(explicit?.total ?? parseSettledTotal(options?.text) ?? "").trim();

  // A PNG outlives the rank it shows. The board it came from and the day it was
  // taken travel with it, and the money keeps the label of its own window.
  const period = String(explicit?.period ?? "all") === "today" ? "today" : "all";
  return {
    name,
    place,
    where,
    position,
    total,
    period,
    capturedAt: String(explicit?.capturedAt ?? "").trim(),
    language,
    initials: initialsOf(name),
    logoUrl: String(explicit?.logoUrl ?? proxyPathFor(options?.url) ?? ""),
    shareTitle: String(options?.title || name),
    shareText: String(options?.text || ""),
  };
}

// ---------------------------------------------------------------------------
// Text layout. Takes its measuring function as an argument so the wrapping can
// be tested without a canvas.
// ---------------------------------------------------------------------------

export function wrapLines(value, maxWidth, measure, maxLines = 2) {
  const source = String(value || "").replace(/\s+/g, " ").trim();
  if (!source) return [];
  const characters = Array.from(source);
  const lines = [];
  let index = 0;

  while (index < characters.length && lines.length < maxLines) {
    let taken = 0;
    let lastBreak = 0;
    let line = "";
    while (index + taken < characters.length) {
      const next = line + characters[index + taken];
      if (taken > 0 && measure(next) > maxWidth) break;
      line = next;
      taken += 1;
      if (characters[index + taken - 1] === " ") lastBreak = taken;
    }
    // Prefer a word boundary, but only when breaking there would not throw away
    // the whole line — a CJK name has no spaces at all.
    let end = taken;
    if (index + taken < characters.length && lastBreak > 0 && characters[index + taken] !== " ") end = lastBreak;
    lines.push(characters.slice(index, index + end).join("").trim());
    index += end;
    while (characters[index] === " ") index += 1;
  }

  if (index < characters.length) {
    let last = lines[lines.length - 1] || "";
    while (last && measure(`${last}…`) > maxWidth) last = last.slice(0, -1);
    lines[lines.length - 1] = `${last.trimEnd()}…`;
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Painting. Browser only.
// ---------------------------------------------------------------------------

function roundRect(ctx, x, y, width, height, radius) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

// ctx.letterSpacing is too new to rely on, and the wordmark is the one place
// the tracking actually carries the brand.
function drawTracked(ctx, value, x, y, tracking) {
  let cursor = x;
  for (const character of String(value)) {
    ctx.fillText(character, cursor, y);
    cursor += ctx.measureText(character).width + tracking;
  }
  return cursor - tracking - x;
}

function drawLogoTile(ctx, x, y, size, logo, initials) {
  ctx.save();
  roundRect(ctx, x, y, size, size, size * 0.22);
  ctx.fillStyle = logo ? "#ffffff" : PALETTE.accentSoft;
  ctx.fill();
  ctx.save();
  ctx.clip();
  if (logo) {
    const inset = size * 0.12;
    const box = size - inset * 2;
    const ratio = Math.min(box / logo.naturalWidth, box / logo.naturalHeight);
    const width = logo.naturalWidth * ratio;
    const height = logo.naturalHeight * ratio;
    ctx.drawImage(logo, x + (size - width) / 2, y + (size - height) / 2, width, height);
  } else {
    ctx.fillStyle = PALETTE.accentStrong;
    ctx.font = fontOf(900, size * 0.4);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, x + size / 2, y + size / 2 + size * 0.03);
  }
  ctx.restore();
  ctx.strokeStyle = logo ? PALETTE.line : PALETTE.accent;
  ctx.lineWidth = 2;
  roundRect(ctx, x + 1, y + 1, size - 2, size - 2, size * 0.22);
  ctx.stroke();
  ctx.restore();
}

function paint(model, shape, logo) {
  const canvas = document.createElement("canvas");
  canvas.width = shape.width;
  canvas.height = shape.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");

  const { width, height, pad, scale } = shape;
  const safeTop = shape.safeTop || 0;
  const safeBottom = shape.safeBottom || 0;
  const inner = width - pad * 2;
  const strings = CARD_STRINGS[model.language] || CARD_STRINGS.en;

  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(width * 0.84, height * 0.06, 0, width * 0.84, height * 0.06, width);
  glow.addColorStop(0, "rgba(247, 58, 51, 0.32)");
  glow.addColorStop(0.5, "rgba(247, 58, 51, 0.07)");
  glow.addColorStop(1, "rgba(247, 58, 51, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = PALETTE.line;
  ctx.lineWidth = 2;
  roundRect(ctx, pad / 2, pad / 2, width - pad, height - pad, 44);
  ctx.stroke();

  // Wordmark.
  const markY = pad + safeTop + 20 * scale;
  ctx.fillStyle = PALETTE.accent;
  ctx.beginPath();
  ctx.arc(pad + 13 * scale, markY, 13 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.ink;
  ctx.font = fontOf(900, 34 * scale);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  drawTracked(ctx, "RANKOFF", pad + 42 * scale, markY, 6 * scale);
  const headerBottom = markY + 26 * scale;

  // Footer.
  const footerBaseline = height - pad - safeBottom;
  ctx.textBaseline = "alphabetic";
  ctx.font = fontOf(800, 32 * scale);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText("rankoff.my", pad, footerBaseline);
  ctx.font = fontOf(700, 26 * scale);
  ctx.fillStyle = PALETTE.muted;
  ctx.textAlign = "right";
  const board = model.period === "today" ? strings.today : strings.allTime;
  const stamped = model.capturedAt ? `${strings.footer} · ${board} · ${model.capturedAt}` : `${strings.footer} · ${board}`;
  ctx.fillText(stamped, width - pad, footerBaseline);
  ctx.textAlign = "left";
  const footerTop = footerBaseline - 56 * scale;

  // Body metrics first, so the stack can be centred in whatever room is left —
  // that is the only difference between the square card and the story card.
  const tile = 168 * scale;
  const rankSize = 232 * scale;
  const rankHeight = rankSize * 0.74;
  const positionSize = 46 * scale;
  const nameSize = 62 * scale;
  const nameLeading = nameSize * 1.2;
  const totalLabelSize = 26 * scale;
  const totalValueSize = 54 * scale;

  ctx.font = fontOf(600, positionSize);
  const positionLines = wrapLines(model.position, inner, (value) => ctx.measureText(value).width, 2);
  ctx.font = fontOf(800, nameSize);
  const nameLines = wrapLines(model.name, inner, (value) => ctx.measureText(value).width, 2);

  let bodyHeight = tile + 54 * scale + rankHeight + 16 * scale + positionLines.length * (positionSize * 1.22);
  bodyHeight += 44 * scale + nameLines.length * nameLeading;
  if (model.total) bodyHeight += 44 * scale + 2 + 32 * scale + totalLabelSize * 1.3 + totalValueSize;

  const room = footerTop - headerBottom;
  // A two-line name plus a total can exceed the room on the square card, and the
  // old floor of 48*scale then pushed the money down onto "rankoff.my". When the
  // stack does not fit, start at the top and let the gaps take the loss instead.
  const slack = room - bodyHeight;
  let y = headerBottom + (slack > 0 ? Math.max(48 * scale, slack / 2) : 0);

  drawLogoTile(ctx, pad, y, tile, logo, model.initials);
  y += tile + 54 * scale;

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = PALETTE.accentStrong;
  ctx.font = fontOf(900, rankSize);
  ctx.fillText(`#${model.place}`, pad, y + rankHeight);
  y += rankHeight + 16 * scale;

  ctx.textBaseline = "top";
  ctx.fillStyle = PALETTE.muted;
  ctx.font = fontOf(600, positionSize);
  for (const line of positionLines) {
    ctx.fillText(line, pad, y);
    y += positionSize * 1.22;
  }
  y += 44 * scale;

  ctx.fillStyle = PALETTE.ink;
  ctx.font = fontOf(800, nameSize);
  for (const line of nameLines) {
    ctx.fillText(line, pad, y);
    y += nameLeading;
  }

  if (model.total) {
    y += 44 * scale;
    ctx.fillStyle = PALETTE.line;
    ctx.fillRect(pad, y, inner, 2);
    y += 32 * scale;
    ctx.fillStyle = PALETTE.muted;
    ctx.font = fontOf(700, totalLabelSize);
    drawTracked(ctx, model.period === "today" ? strings.todayTotal : strings.total, pad, y, 2 * scale);
    y += totalLabelSize * 1.3;
    ctx.fillStyle = PALETTE.ink;
    ctx.font = fontOf(800, totalValueSize);
    ctx.fillText(model.total, pad, y);
  }

  return canvas;
}

function loadLogo(source) {
  return new Promise((resolve) => {
    if (!source || typeof Image !== "function") return resolve(null);
    const image = new Image();
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(null), LOGO_TIMEOUT_MS);
    image.decoding = "async";
    image.addEventListener("load", () => finish(image.naturalWidth > 0 ? image : null), { once: true });
    image.addEventListener("error", () => finish(null), { once: true });
    // Same-origin by construction: /img/<hostname> re-serves the bytes from
    // rankoff.my precisely so this does not taint the canvas.
    image.src = source;
  });
}

function dataUrlToBlob(dataUrl) {
  const [header, payload] = String(dataUrl).split(",");
  const binary = atob(payload || "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: /:(.*?);/.exec(header)?.[1] || "image/png" });
}

// Safari only honours navigator.share while the click that started it is still
// "active". Awaiting anything first spends that activation, and the share sheet
// — the only route to Instagram — never opens. So the logo is fetched when the
// dialog opens, and the click itself does nothing asynchronous before sharing:
// toDataURL is synchronous where toBlob is not.
function canvasToBlobSync(canvas) {
  return dataUrlToBlob(canvas.toDataURL("image/png"));
}

export function preloadLogo(model) {
  if (!model) return Promise.resolve(null);
  if (model.logoState === "ready") return Promise.resolve(model);
  return loadLogo(model.logoUrl).then((image) => {
    model.logo = image;
    model.logoState = "ready";
    return model;
  }).catch(() => {
    model.logo = null;
    model.logoState = "ready";
    return model;
  });
}

function renderCanvas(model, shapeName, logo) {
  return paint(model, CARD_SHAPES[shapeName] || CARD_SHAPES.square, logo);
}

// A logo is a nice-to-have; the card is not. If anything at all goes wrong with
// the merchant's picture — including a taint we failed to anticipate, which is
// why /img exists — the card is repainted on a clean canvas with their initials
// rather than failing in the merchant's hand.
export function renderCardBlobSync(model, shapeName) {
  try {
    return canvasToBlobSync(renderCanvas(model, shapeName, model.logo || null));
  } catch {
    return canvasToBlobSync(renderCanvas(model, shapeName, null));
  }
}

export async function renderCardBlob(model, shapeName) {
  await preloadLogo(model);
  return renderCardBlobSync(model, shapeName);
}

function download(blob, filename) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 20_000);
}

// navigator.canShare({ files }) is the gate that decides whether Instagram,
// Stories and WhatsApp Status appear in the sheet at all. Where it says no, the
// file still reaches the merchant — through their downloads folder.
function shareBlob(model, shapeName) {
  const blob = renderCardBlobSync(model, shapeName);
  const filename = cardFileName(model.name, shapeName);
  const file = typeof File === "function" ? new File([blob], filename, { type: "image/png" }) : null;

  let payload = null;
  if (file && typeof navigator.share === "function" && typeof navigator.canShare === "function") {
    const withText = { files: [file], title: model.shareTitle, text: model.shareText };
    const filesOnly = { files: [file] };
    try {
      if (navigator.canShare(withText)) payload = withText;
      else if (navigator.canShare(filesOnly)) payload = filesOnly;
    } catch {
      payload = null;
    }
  }
  if (!payload) {
    download(blob, filename);
    return Promise.resolve("downloaded");
  }
  return navigator.share(payload).then(() => "shared").catch((error) => {
    if (error?.name === "AbortError") return "cancelled";
    download(blob, filename);
    return "downloaded";
  });
}

// Synchronous on the path that matters: when the logo is already in hand this
// returns a promise created inside the click handler, not after an await.
export function saveRankCard(model, shapeName) {
  if (model?.logoState === "ready" || !model?.logoUrl) return shareBlob(model, shapeName);
  return preloadLogo(model).then(() => shareBlob(model, shapeName));
}

const api = Object.freeze({
  CARD_SHAPES,
  buildCardModel,
  cardFileName,
  parseRankTitle,
  parseSettledTotal,
  preloadLogo,
  proxyPathFor,
  renderCardBlob,
  renderCardBlobSync,
  saveRankCard,
});

if (typeof window !== "undefined") window.RankoffCard = api;

export default api;
