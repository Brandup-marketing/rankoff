import assert from "node:assert/strict";
import test from "node:test";

import { MARKET_GROUPS, VISIBLE_CATEGORIES } from "../../functions/_lib/config.js";
import { accountFrom, destinationAction, displayName, listingIdentity, profilePath } from "../../functions/_lib/platform.js";
import { normalizeDestinationUrl } from "../../functions/_lib/validation.js";

const identityOf = (url) => normalizeDestinationUrl(url).identity;
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
