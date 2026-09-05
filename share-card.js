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
  en: Object.freeze({ total: "Settled total", todayTotal: "Past 24h total", footer: "Sponsored ranking", board: "on RANKOFF", allTime: "All-time", today: "Past 24h", challenge: "OUTRANK ME" }),
  zh: Object.freeze({ total: "累计出价", todayTotal: "近 24 小时累计", footer: "赞助排名", board: "RANKOFF 全站", allTime: "全部时间", today: "近 24 小时", challenge: "来超越我" }),
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
  roundRect(ctx, x, y, size, size, 12);
  ctx.fillStyle = logo ? "#ffffff" : "#302623";
  ctx.fill();
  ctx.clip();
  if (logo) {
    const box = size * 0.76;
    const ratio = Math.min(box / logo.naturalWidth, box / logo.naturalHeight);
    const width = logo.naturalWidth * ratio;
    const height = logo.naturalHeight * ratio;
    ctx.drawImage(logo, x + (size - width) / 2, y + (size - height) / 2, width, height);
  } else {
    ctx.fillStyle = PALETTE.ink;
    ctx.font = fontOf(800, size * 0.42);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, x + size / 2, y + size * 0.53);
  }
  ctx.restore();
}

function rankCardPlaquePath(ctx, x, y, width, height, cut = 26) {
  ctx.beginPath();
  ctx.moveTo(x + cut, y);
  ctx.lineTo(x + width - cut, y);
  ctx.lineTo(x + width, y + cut);
  ctx.lineTo(x + width, y + height - cut);
  ctx.lineTo(x + width - cut, y + height);
  ctx.lineTo(x + cut, y + height);
  ctx.lineTo(x, y + height - cut);
  ctx.lineTo(x, y + cut);
  ctx.closePath();
}

// Fit complete values; especially never abbreviate a rank, amount or date.
function rankCardFitText(ctx, value, weight, preferred, maxWidth) {
  ctx.font = fontOf(weight, preferred);
  const measured = ctx.measureText(String(value)).width;
  const size = measured > maxWidth ? preferred * maxWidth / measured : preferred;
  ctx.font = fontOf(weight, Math.max(1, Math.floor(size)));
  return Math.max(1, Math.floor(size));
}

function rankCardFitLines(ctx, value, weight, preferred, maxWidth, maxLines = 2) {
  let size = Math.floor(preferred);
  let lines;
  do {
    ctx.font = fontOf(weight, size);
    lines = wrapLines(value, maxWidth, (line) => ctx.measureText(line).width, maxLines);
    if (!lines.join("").endsWith("…") || size <= 10) break;
    size -= 1;
  } while (size > 0);
  return { size, lines };
}

function rankCardPaintMark(ctx, x, y, size) {
  ctx.fillStyle = PALETTE.accent;
  ctx.beginPath();
  ctx.arc(x + size * 0.27, y, size * 0.27, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.ink;
  ctx.font = fontOf(850, size);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  drawTracked(ctx, "RANKOFF", x + size * 0.87, y, size * 0.12);
}

function rankCardPaintChallenge(ctx, strings, x, y, width, scale) {
  ctx.fillStyle = PALETTE.line;
  ctx.fillRect(x, y, width, 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  rankCardFitText(ctx, strings.challenge, 850, 47 * scale, width * 0.6);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText(strings.challenge, x, y + 74 * scale);
  ctx.textAlign = "right";
  ctx.font = fontOf(600, 29 * scale);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText("rankoff.my", x + width - 51 * scale, y + 72 * scale);
  // A small directional CTA, not an unverified claim of rank movement.
  ctx.strokeStyle = PALETTE.accent;
  ctx.lineWidth = 4 * scale;
  ctx.lineCap = "square";
  ctx.beginPath();
  ctx.moveTo(x + width - 29 * scale, y + 61 * scale);
  ctx.lineTo(x + width, y + 61 * scale);
  ctx.lineTo(x + width - 10 * scale, y + 51 * scale);
  ctx.moveTo(x + width, y + 61 * scale);
  ctx.lineTo(x + width - 10 * scale, y + 71 * scale);
  ctx.stroke();
  ctx.textAlign = "left";
}

function rankCardPaintPlaque(ctx, model, logo, strings, layout) {
  const { x, y, width, faceHeight, ownerHeight, angle, story } = layout;
  const height = faceHeight + ownerHeight;
  const faceY = story ? ownerHeight : 0;
  const ownerY = story ? 0 : faceHeight;
  ctx.save();
  ctx.translate(x + width / 2, y + height / 2);
  ctx.rotate(angle);
  ctx.translate(-width / 2, -height / 2);

  // A solid object: a cast edge, a lit enamel face and an attached nameplate.
  // None of the geometry encodes rank changes, time held or people beaten.
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = 44;
  ctx.shadowOffsetY = 32;
  rankCardPlaquePath(ctx, 14, 20, width, height);
  ctx.fillStyle = "#100806";
  ctx.fill();
  ctx.restore();
  for (let depth = 18; depth > 0; depth -= 2) {
    rankCardPlaquePath(ctx, depth * 0.7, depth, width, height);
    ctx.fillStyle = depth > 6 ? "#6e160f" : "#9c251b";
    ctx.fill();
  }

  ctx.save();
  rankCardPlaquePath(ctx, 0, 0, width, height);
  ctx.clip();
  const enamel = ctx.createLinearGradient(0, faceY, width * 0.82, faceY + faceHeight);
  enamel.addColorStop(0, "#f34b3e");
  enamel.addColorStop(0.3, "#e7352b");
  enamel.addColorStop(0.74, "#c7251c");
  enamel.addColorStop(1, "#eb4031");
  ctx.fillStyle = enamel;
  ctx.fillRect(0, faceY, width, faceHeight);
  // Broad highlights describe the surface; keep them behind the claim.
  const light = ctx.createLinearGradient(0, faceY, 0, faceY + 70);
  light.addColorStop(0, "rgba(255, 213, 193, 0.32)");
  light.addColorStop(1, "rgba(255, 213, 193, 0)");
  ctx.fillStyle = light;
  ctx.fillRect(0, faceY, width, 70);
  const nameplate = ctx.createLinearGradient(0, ownerY, width, ownerY + ownerHeight);
  nameplate.addColorStop(0, "#2a201d");
  nameplate.addColorStop(0.5, "#181211");
  nameplate.addColorStop(1, "#100c0b");
  ctx.fillStyle = nameplate;
  ctx.fillRect(0, ownerY, width, ownerHeight);
  ctx.fillStyle = "#ff8b6d";
  ctx.globalAlpha = 0.65;
  ctx.fillRect(0, story ? ownerHeight : faceHeight, width, 2);
  ctx.globalAlpha = 1;
  ctx.restore();

  // Tight edge highlights make the silhouette legible at thumbnail scale.
  ctx.strokeStyle = "#ff917b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(1, height - 27);
  ctx.lineTo(1, 27);
  ctx.lineTo(27, 1);
  ctx.lineTo(width - 27, 1);
  ctx.stroke();
  ctx.strokeStyle = "#50110c";
  ctx.beginPath();
  ctx.moveTo(width - 1, 27);
  ctx.lineTo(width - 1, height - 27);
  ctx.lineTo(width - 27, height - 1);
  ctx.lineTo(27, height - 1);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#250b08";
  rankCardFitText(ctx, strings.footer, 650, story ? 32 : 27, width - 90);
  ctx.fillText(strings.footer, width / 2, faceY + (story ? 64 : 51));

  const position = rankCardFitLines(ctx, model.position, 600, story ? 44 : 36, width - 90);
  const positionStart = faceY + faceHeight - (story ? 56 : 45) - (position.lines.length - 1) * position.size * 1.16;
  const rank = `#${model.place}`;
  const rankTop = faceY + (story ? 110 : 80);
  const rankBottom = positionStart - position.size - (story ? 28 : 18);
  let rankSize = rankCardFitText(ctx, rank, 900, story ? 445 : 322, width - (story ? 90 : 100));
  let rankMetrics = ctx.measureText(rank);
  const rankHeight = rankMetrics.actualBoundingBoxAscent + rankMetrics.actualBoundingBoxDescent;
  if (rankHeight > rankBottom - rankTop) {
    rankSize = Math.floor(rankSize * (rankBottom - rankTop) / rankHeight);
    ctx.font = fontOf(900, rankSize);
    rankMetrics = ctx.measureText(rank);
  }
  const rankBaseline = (rankTop + rankBottom + rankMetrics.actualBoundingBoxAscent - rankMetrics.actualBoundingBoxDescent) / 2;
  ctx.fillStyle = "#a22219";
  ctx.fillText(rank, width / 2 + 2, rankBaseline + 7);
  ctx.fillStyle = "#fff4ed";
  ctx.fillText(rank, width / 2, rankBaseline);

  ctx.font = fontOf(600, position.size);
  ctx.fillStyle = "#fff4ed";
  position.lines.forEach((line, index) => {
    ctx.fillText(line, width / 2, positionStart + index * position.size * 1.16);
  });

  const logoSize = story ? 118 : 104;
  const inset = story ? 36 : 34;
  const textX = inset + logoSize + 30;
  const textWidth = width - textX - inset;
  const name = rankCardFitLines(ctx, model.name, 800, story ? 54 : 50, textWidth);
  const leading = name.size * 1.14;
  const textHeight = name.size + (name.lines.length - 1) * leading;
  drawLogoTile(ctx, inset, ownerY + (ownerHeight - logoSize) / 2, logoSize, logo, model.initials);
  ctx.font = fontOf(800, name.size);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = PALETTE.ink;
  name.lines.forEach((line, index) => {
    ctx.fillText(line, textX, ownerY + (ownerHeight - textHeight) / 2 - 2 + index * leading);
  });
  ctx.restore();
}

function paint(model, shape, logo) {
  const canvas = document.createElement("canvas");
  canvas.width = shape.width;
  canvas.height = shape.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");

  const { width, height } = shape;
  const story = shape.name === "story";
  const strings = CARD_STRINGS[model.language] || CARD_STRINGS.en;
  const pad = story ? 92 : 76;
  const inner = width - pad * 2;
  const period = model.period === "today" ? strings.today : strings.allTime;
  const stamp = model.capturedAt ? `${period} · ${model.capturedAt}` : period;

  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, width, height);

  // Square: the rank leads, and the business signs the lower nameplate.
  // Story: the business introduces the tall plaque, above the giant rank.
  // All story text is inside [150, 1720]; only the ambient field enters chrome.
  rankCardPaintMark(ctx, pad, story ? shape.safeTop + 87 : 83, story ? 40 : 34);
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillStyle = PALETTE.muted;
  rankCardFitText(ctx, stamp, 500, story ? 27 : 24, inner * (story ? 0.5 : 0.58));
  ctx.fillText(stamp, width - pad, story ? shape.safeTop + 87 : 83);

  rankCardPaintPlaque(ctx, model, logo, strings, story
    ? { x: 130, y: 408, width: 804, faceHeight: 636, ownerHeight: 218, angle: 0.035, story: true }
    : { x: 91, y: 205, width: 882, faceHeight: 403, ownerHeight: 170, angle: -0.035, story: false });

  const receiptY = story ? 1404 : 865;
  if (model.total) {
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = PALETTE.muted;
    rankCardFitText(ctx, model.period === "today" ? strings.todayTotal : strings.total, 500, story ? 32 : 27, inner * 0.47);
    ctx.fillText(model.period === "today" ? strings.todayTotal : strings.total, pad, receiptY);
    ctx.textAlign = "right";
    ctx.fillStyle = PALETTE.ink;
    rankCardFitText(ctx, model.total, 700, story ? 48 : 40, inner * 0.48);
    ctx.fillText(model.total, width - pad, receiptY + 3);
  }
  rankCardPaintChallenge(ctx, strings, pad, story ? height - shape.safeBottom - 135 : 945, inner, story ? 1.15 : 1);
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
// Clicking the picture means "give me the file". saveRankCard may open the OS
// sheet instead, which is right for the Share button below but wrong here.
export function downloadRankCard(model, shapeName) {
  const write = () => {
    const blob = renderCardBlobSync(model, shapeName);
    download(blob, cardFileName(model.name, shapeName));
    return "downloaded";
  };
  if (model?.logoState === "ready" || !model?.logoUrl) return Promise.resolve(write());
  return preloadLogo(model).then(write);
}

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
  downloadRankCard,
});

if (typeof window !== "undefined") window.RankoffCard = api;

export default api;
