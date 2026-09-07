import assert from "node:assert/strict";
import test from "node:test";

import { MARKET_GROUPS, VISIBLE_CATEGORIES } from "../../functions/_lib/config.js";
import { accountFrom, destinationAction, displayName, isUsableHandle, listingIdentity, profilePath } from "../../functions/_lib/platform.js";
import { canonicalDetailPath, markHue } from "../../functions/_lib/product.js";
import { normalizeDestinationUrl } from "../../functions/_lib/validation.js";

const identityOf = (url) => normalizeDestinationUrl(url).identity;
const identityFor = identityOf;
const refusalFor = (url) => { try { normalizeDestinationUrl(url); return ""; } catch (error) { return error.code; } };
const refusal = (url) => {
  try { normalizeDestinationUrl(url); return ""; } catch (error) { return error.code; }
};

test("a profile address resolves to one identity however it is written", () => {
  assert.equal(identityOf("https://www.instagram.com/agent_ali/"), "instagram:agent_ali");
  assert.equal(identityOf("https://instagram.com/Agent_Ali"), "instagram:agent_ali");
  assert.equal(identityOf("https://m.instagram.com/agent_ali?utm_source=bio"), "instagram:agent_ali");
  assert.equal(identityOf("https://www.tiktok.com/@makanplace"), "tiktok:makanplace");
  assert.equal(identityOf("https://www.facebook.com/KedaiKopi"), "facebook:kedaikopi");
  assert.equal(identityOf("https://m.facebook.com/kedaikopi/"), "facebook:kedaikopi");
  assert.equal(identityOf("https://x.com/someone"), "x:someone");
});

test("a handle may open or close with an underscore, as the platforms allow", () => {
  // _umidesign_ is a real Instagram account that could not be listed or paid
  // for: the handle rule required a letter or digit at both ends.
  assert.equal(identityOf("https://www.instagram.com/_umidesign_"), "instagram:_umidesign_");
  assert.equal(identityOf("https://instagram.com/_umidesign"), "instagram:_umidesign");
  assert.equal(identityOf("https://instagram.com/umidesign_"), "instagram:umidesign_");
  assert.equal(identityOf("https://www.tiktok.com/@_shop_"), "tiktok:_shop_");
  assert.equal(identityOf("https://x.com/_jack_"), "x:_jack_");
  // The handle is placed in /profile/<platform>/<handle>, so it still may not
  // traverse, and punctuation on its own is not an account.
  assert.equal(refusal("https://instagram.com/.."), "profile_required");
  assert.equal(refusal("https://instagram.com/."), "profile_required");
  assert.equal(refusal("https://instagram.com/___"), "profile_required");
  assert.equal(refusal("https://instagram.com/a..b"), "profile_required");
});

test("every path that judges a handle agrees with every other", () => {
  // Four places accepted _umidesign_ while the profile route still refused it,
  // so the listing could be paid for and then answered "Listing not found".
  for (const handle of ["_umidesign_", "umidesign_", "_umidesign", "umi.design", "agent_ali"]) {
    assert.equal(isUsableHandle(handle), true, `${handle} should be usable`);
    assert.equal(accountFrom(new URL(`https://instagram.com/${handle}`)).handle, handle);
    assert.equal(canonicalDetailPath(`instagram:${handle}`), `/profile/instagram/${handle}`);
    assert.equal(profilePath(`instagram:${handle}`), `/profile/instagram/${handle}`);
  }
  for (const handle of ["..", ".", "___", "a..b", "", "x".repeat(61)]) {
    assert.equal(isUsableHandle(handle), false, `${handle} should be refused`);
    assert.equal(canonicalDetailPath(`instagram:${handle}`), "");
  }
});

test("every copy of the mark hue agrees with the server's", async () => {
  const { readFileSync } = await import("node:fs");
  // The hue decides a listing's tile colour on the board, on its own page and in
  // categories. If a copy drifts, one listing wears two colours.
  for (const file of ["app.js", "listing.js", "categories.js"]) {
    const source = readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
    const body = source.match(/function markHue\(seed\) \{([\s\S]*?)\n {2}\}/);
    assert.ok(body, `${file} has no markHue`);
    const copy = new Function("seed", body[1]);
    for (const seed of ["instagram:_umidesign_", "rakanjayahardware.com", "中华健康", "", "x"]) {
      assert.equal(copy(seed), markHue(seed), `${file} disagrees on ${seed}`);
    }
  }
  // A hue is always a usable angle, whatever the seed.
  for (const seed of ["", "a", "instagram:_umidesign_", "z".repeat(200)]) {
    const hue = markHue(seed);
    assert.ok(Number.isInteger(hue) && hue >= 0 && hue < 360, `${seed} produced ${hue}`);
  }
  // The same listing must not change colour between renders.
  assert.equal(markHue("instagram:_umidesign_"), markHue("instagram:_umidesign_"));
});

test("a share token is not the merchant's public destination", () => {
  // Instagram's share links carry ?stkn=, which expires and identifies whoever
  // copied the link. The stored destination is the profile itself.
  const shared = normalizeDestinationUrl("https://www.instagram.com/_umidesign_?stkn=NDJjaGx2enRtYTZk");
  assert.equal(shared.url, "https://www.instagram.com/_umidesign_");
  assert.equal(shared.identity, "instagram:_umidesign_");
  // A website's query may be the page the merchant meant, so it survives.
  assert.match(normalizeDestinationUrl("https://example.com/shop?item=42").url, /\?item=42$/);
});

test("posts, reels, stories and groups are not profiles", () => {
  assert.equal(refusal("https://www.instagram.com/p/Cabc123/"), "profile_required");
  assert.equal(refusal("https://www.instagram.com/reel/Cabc123/"), "profile_required");
  assert.equal(refusal("https://www.instagram.com/stories/agent_ali/1/"), "profile_required");
  assert.equal(refusal("https://www.tiktok.com/@makanplace/video/12345"), "profile_required");
  assert.equal(refusal("https://www.facebook.com/profile.php?id=123456"), "profile_required");
  assert.equal(refusal("https://www.facebook.com/groups/propertykl"), "profile_required");
  assert.equal(refusal("https://www.facebook.com/watch/?v=1"), "profile_required");
});

test("two accounts on one platform never become one listing", () => {
  const ali = identityOf("https://www.instagram.com/agent_ali/");
  const siti = identityOf("https://www.instagram.com/kol_siti/");
  assert.notEqual(ali, siti, "a second Instagram account would inherit the first one's rank");

  // The same name on two platforms is two businesses until proven otherwise.
  assert.notEqual(identityOf("https://instagram.com/glowme"), identityOf("https://www.tiktok.com/@glowme"));

  // A repeat submission of the same account is the same listing, so payment adds on.
  assert.equal(identityOf("https://instagram.com/agent_ali/?hl=en"), ali);
});

test("websites keep the identity they were already stored under", () => {
  assert.equal(identityOf("https://brandupdesignmarketing.com/"), "brandupdesignmarketing.com");
  assert.equal(identityOf("https://www.brandupdesignmarketing.com/services"), "brandupdesignmarketing.com");
  assert.equal(listingIdentity("example.com", null), "example.com");
});

test("each identity has one address and one honest button", () => {
  assert.equal(profilePath("instagram:agent_ali"), "/profile/instagram/agent_ali");
  assert.equal(profilePath("facebook:kedaikopi"), "/profile/facebook/kedaikopi");
  assert.equal(profilePath("tiktok:makanplace"), "/profile/tiktok/makanplace");
  assert.equal(profilePath("example.com"), "/product/example.com");

  assert.equal(destinationAction("instagram:agent_ali"), "viewInstagram");
  assert.equal(destinationAction("facebook:kedaikopi"), "viewFacebook");
  assert.equal(destinationAction("tiktok:makanplace"), "viewTiktok");
  assert.equal(destinationAction("example.com"), "visit");

  assert.equal(displayName("instagram:agent_ali"), "@agent_ali");
  assert.equal(displayName("example.com"), "example.com");
});

test("a profile carries no site favicon, so the board is not a wall of one logo", () => {
  assert.equal(normalizeDestinationUrl("https://instagram.com/agent_ali").faviconUrl, "");
  assert.equal(normalizeDestinationUrl("https://example.com/").faviconUrl, "https://example.com/favicon.ico");
});

test("a non-platform host is untouched by the account rules", () => {
  assert.equal(accountFrom(new URL("https://example.com/agent_ali")), null);
});

test("Health splits into Health & Beauty and Sports & Fitness without losing the old key", () => {
  assert.ok(VISIBLE_CATEGORIES.includes("Health"), "existing Health records must stay valid");
  assert.ok(VISIBLE_CATEGORIES.includes("Sports"));
  assert.deepEqual([...MARKET_GROUPS.Sports], ["Sports"]);
});

test("every category the server accepts has a label on both clients", async () => {
  const { readFileSync } = await import("node:fs");
  const keysIn = (file, variable) => {
    const source = readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
    const line = source.match(new RegExp(`const ${variable} = \\{([^}]*)\\}`));
    assert.ok(line, `${variable} not found in ${file}`);
    return line[1].split(",").map((pair) => pair.split(":")[0].trim()).filter(Boolean);
  };

  for (const [file, variable] of [
    ["app.js", "categoryLabels"],
    ["app.js", "categoryTranslations"],
    ["listing.js", "categoryLabels"],
    ["listing.js", "categoryTranslations"],
  ]) {
    const labelled = keysIn(file, variable);
    for (const category of VISIBLE_CATEGORIES) {
      assert.ok(labelled.includes(category), `${file} ${variable} is missing ${category}`);
    }
  }
});

test("a bare social handle is not mistaken for a website", () => {
  // Malaysian handles carry dots, so "name.name" is ambiguous until the suffix is checked.
  assert.equal(refusalFor("https://mumeiyan.arkadia"), "unknown_tld");
  assert.equal(refusalFor("https://kedai.kopi"), "unknown_tld");
  assert.equal(refusalFor("https://example.con"), "unknown_tld");

  assert.equal(identityFor("https://www.instagram.com/mumeiyan.arkadia/"), "instagram:mumeiyan.arkadia");
  assert.equal(identityFor("https://brandupdesignmarketing.com/"), "brandupdesignmarketing.com");
  assert.equal(identityFor("https://shop.com.my/"), "shop.com.my");
});

test("every link-in-bio and channel platform keeps its accounts apart", () => {
  // Linktree is what a Malaysian merchant without a website hands out.
  assert.notEqual(identityFor("https://linktr.ee/kedaiA"), identityFor("https://linktr.ee/kedaiB"));
  assert.equal(identityFor("https://linktr.ee/kedaiA"), "linktree:kedaia");

  assert.equal(identityFor("https://www.youtube.com/@channelA"), "youtube:channela");
  assert.equal(identityFor("https://www.youtube.com/channel/UCabc"), "youtube:channel-ucabc");
  assert.equal(refusalFor("https://www.youtube.com/watch?v=1"), "profile_required");

  // A person and a company sharing a name stay two listings.
  assert.notEqual(identityFor("https://www.linkedin.com/in/brandup"), identityFor("https://www.linkedin.com/company/brandup"));
  assert.equal(identityFor("https://www.xiaohongshu.com/user/profile/5f3abc"), "xiaohongshu:5f3abc");
});

test("a chat link is refused: it is not a page, and the number is not ours to publish", () => {
  assert.equal(refusalFor("https://wa.me/60123456789"), "chat_link");
  assert.equal(refusalFor("https://api.whatsapp.com/send?phone=60123456789"), "chat_link");
  assert.equal(refusalFor("https://t.me/someone"), "chat_link");
});

test("every market on the board has a name a reader can see", async () => {
  const { MARKET_LABELS, marketLabel } = await import("../../functions/_lib/config.js");
  for (const market of VISIBLE_CATEGORIES) {
    assert.ok(MARKET_LABELS[market], `${market} has no label`);
  }
  // A stored tag resolves to its market's name, never to the raw tag.
  assert.equal(marketLabel("Travel"), "Property & Agents");
  assert.equal(marketLabel("Insurance"), "Finance & Insurance");
});

test("a listing takes its words from the page it points at", async () => {
  const { extractSiteInfo } = await import("../../functions/_lib/siteinfo.js");

  const shop = `<html><head>
    <meta property="og:site_name" content="Rakan Jaya Hardware">
    <meta name="description" content="Industrial hardware supplier in Kemaman, Terengganu, specialising in oil &amp; gas products, steel and welding equipment.">
    <meta property="og:image" content="/cdn/logo.png"></head></html>`;
  const site = extractSiteInfo(shop, "rakanjayahardware.com");
  assert.equal(site.title, "Rakan Jaya Hardware");
  assert.match(site.description, /oil & gas products/);
  assert.equal(site.logo, "https://rakanjayahardware.com/cdn/logo.png");

  // A profile describes the platform and counts followers; neither is ours to publish.
  const profile = `<html><head>
    <meta property="og:title" content="Nike (@nike) • Instagram photos and videos">
    <meta property="og:description" content="291M Followers, 267 Following, 1,671 Posts - See Instagram photos and videos from Nike">
    <meta property="og:image" content="https://scontent.cdninstagram.com/signed.jpg"></head></html>`;
  const social = extractSiteInfo(profile, "instagram.com", { social: true });
  assert.equal(social.title, "Nike");
  assert.equal(extractSiteInfo(`<meta property="og:title" content="TikTok - Make Your Day">`, "tiktok.com", { social: true }).title, "", "the platform introducing itself is not a business name");
  assert.equal(social.description, "", "a follower count is not a description");
  assert.equal(social.logo, "", "a signed avatar URL expires within weeks");

  // Boilerplate is worse than nothing.
  assert.equal(extractSiteInfo('<meta name="description" content="Home">', "x.com").description, "");
  assert.equal(extractSiteInfo('<meta name="description" content="Welcome to our website, we sell things here">', "x.com").description, "");
});
