// The rank card puts a number on an image a merchant posts to Instagram. That
// number is not allowed to be a guess, so these tests pin the exact sentences
// app.js and listing.js compose today: if either one is reworded, the parse
// fails here rather than shipping a wrong rank onto somebody's Story.

import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCardModel,
  cardFileName,
  initialsOf,
  parseRankTitle,
  parseSettledTotal,
  proxyPathFor,
  wrapLines,
} from "../../share-card.js";

// Exactly what app.js writes: `${name} — #${place} ${useMarket ? "in" : "on"} ${where}`.
const money = new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 0 });
const RM250 = money.format(250);
const RM260 = money.format(260);

const boardTitleEn = "Aurora Clinic — #4 on RANKOFF";
const marketTitleEn = "Aurora Clinic — #1 in Beauty & Wellness";
const marketTitleZh = "极光诊所 — 美容与养生 第 1 名";
const marketTextEn = `Aurora Clinic holds #1 in Beauty & Wellness with a ${RM250} sponsored bid. Think you can outrank it? Claim #1 from ${RM260}.`;
const marketTextZh = `极光诊所 以 ${RM250} 的赞助出价位居 美容与养生 第 1 名。你能超越它吗？${RM260} 起认领第 1 名。`;

test("the share title app.js writes is read back exactly", () => {
  assert.deepEqual(parseRankTitle(marketTitleEn), {
    name: "Aurora Clinic", place: 1, joiner: "in", where: "Beauty & Wellness",
  });
  assert.deepEqual(parseRankTitle(boardTitleEn), {
    name: "Aurora Clinic", place: 4, joiner: "on", where: "RANKOFF",
  });
  assert.deepEqual(parseRankTitle(marketTitleZh), {
    name: "极光诊所", place: 1, joiner: "", where: "美容与养生",
  });
});

test("a sentence that is not a rank produces no card rather than a guess", () => {
  assert.equal(parseRankTitle("RANKOFF"), null);
  assert.equal(parseRankTitle("Aurora Clinic - #1 in Beauty"), null);
  assert.equal(parseRankTitle("Aurora Clinic — #one in Beauty"), null);
  assert.equal(parseRankTitle(""), null);
  assert.equal(parseRankTitle(null), null);
});

test("the settled total is lifted verbatim, never recomputed", () => {
  assert.equal(parseSettledTotal(marketTextEn), RM250);
  assert.equal(parseSettledTotal(marketTextZh), RM250);
  assert.equal(parseSettledTotal("Aurora Clinic is #1 in Beauty & Wellness."), "");
  assert.equal(parseSettledTotal("with a lot of sponsored bid energy"), "");
  assert.equal(parseSettledTotal(""), "");
});

test("only a website listing gets a proxied logo", () => {
  assert.equal(proxyPathFor("https://rankoff.my/product/auroraclinic.com"), "/img/auroraclinic.com");
  assert.equal(proxyPathFor("https://rankoff.my/product/AuroraClinic.com/"), "/img/auroraclinic.com");
  assert.equal(proxyPathFor("https://rankoff.my/profile/instagram/aurora"), "");
  assert.equal(proxyPathFor("https://rankoff.my/?period=all#listing-7"), "");
  assert.equal(proxyPathFor(""), "");
});

test("a full card model is assembled from the board's own copy", () => {
  const model = buildCardModel({
    title: marketTitleEn,
    text: marketTextEn,
    url: "https://rankoff.my/product/auroraclinic.com",
    language: "en",
  });
  assert.equal(model.name, "Aurora Clinic");
  assert.equal(model.place, 1);
  assert.equal(model.position, "in Beauty & Wellness");
  assert.equal(model.total, RM250);
  assert.equal(model.logoUrl, "/img/auroraclinic.com");
  assert.equal(model.initials, "AC");
});

test("a whole-board placement says so in both languages", () => {
  const english = buildCardModel({ title: boardTitleEn, text: "", url: "/", language: "en" });
  assert.equal(english.position, "on RANKOFF");
  const chinese = buildCardModel({ title: "极光诊所 — RANKOFF 第 4 名", text: "", url: "/", language: "zh" });
  assert.equal(chinese.position, "RANKOFF 全站");
  assert.equal(chinese.place, 4);
  assert.equal(chinese.initials, "极");
});

test("a card is refused outright when the rank cannot be read", () => {
  assert.equal(buildCardModel({ title: "RANKOFF", text: marketTextEn, url: "/", language: "en" }), null);
  assert.equal(buildCardModel({ title: "", text: "", url: "/", language: "en" }), null);
  assert.equal(buildCardModel(null), null);
});

test("a missing total leaves the block off instead of inventing one", () => {
  const model = buildCardModel({
    title: marketTitleEn,
    text: "Aurora Clinic is #1 in Beauty & Wellness.",
    url: "https://rankoff.my/product/auroraclinic.com",
    language: "en",
  });
  assert.equal(model.total, "");
});

test("an explicitly supplied fact always beats the parsed one", () => {
  const model = buildCardModel({
    title: marketTitleEn,
    text: marketTextEn,
    url: "https://rankoff.my/product/auroraclinic.com",
    language: "en",
    card: { total: "RM 900", name: "Aurora Aesthetics", place: 2, where: "Health & Medical" },
  });
  assert.equal(model.total, "RM 900");
  assert.equal(model.name, "Aurora Aesthetics");
  assert.equal(model.place, 2);
  assert.equal(model.position, "in Health & Medical");
});

// A fake measurer: every character is ten units wide, so the expectations are
// arithmetic rather than font metrics.
const measure = (value) => Array.from(String(value)).length * 10;

test("latin copy wraps on word boundaries", () => {
  assert.deepEqual(wrapLines("Aurora Clinic Kuala Lumpur", 140, measure, 2), ["Aurora Clinic", "Kuala Lumpur"]);
  assert.deepEqual(wrapLines("Aurora", 140, measure, 2), ["Aurora"]);
  assert.deepEqual(wrapLines("   ", 140, measure, 2), []);
});

test("a name with no spaces at all still breaks", () => {
  assert.deepEqual(wrapLines("极光医疗美容诊所集团", 50, measure, 2), ["极光医疗美", "容诊所集团"]);
});

test("copy past the last line is truncated, never spilled off the card", () => {
  const lines = wrapLines("Aurora Clinic Kuala Lumpur Sdn Bhd Malaysia", 140, measure, 2);
  assert.equal(lines.length, 2);
  assert.ok(lines[1].endsWith("…"));
  assert.ok(measure(lines[1]) <= 140);
});

test("a very long single word cannot overflow the card either", () => {
  const lines = wrapLines("Supercalifragilisticexpialidocious", 100, measure, 2);
  assert.equal(lines.length, 2);
  assert.ok(lines.every((line) => measure(line) <= 100));
});

test("the downloaded file is named after the merchant and the shape", () => {
  assert.equal(cardFileName("Aurora Clinic", "square"), "rankoff-aurora-clinic-square.png");
  assert.equal(cardFileName("Aurora Clinic", "story"), "rankoff-aurora-clinic-story.png");
  assert.equal(cardFileName("极光诊所", "square"), "rankoff-rank-square.png");
  assert.equal(cardFileName("", "story"), "rankoff-rank-story.png");
});

test("initials match the ones the server already draws", () => {
  assert.equal(initialsOf("Aurora Clinic"), "AC");
  assert.equal(initialsOf("Aurora"), "A");
  assert.equal(initialsOf("极光诊所"), "极");
  assert.equal(initialsOf(""), "R");
});
