// /img/<hostname> exists so a merchant's logo can be drawn into a canvas that
// still produces a file. It is a proxy on a live payments site, so what it
// refuses matters more than what it serves.

import assert from "node:assert/strict";
import test from "node:test";

import {
  allowedImageType,
  candidateSources,
  fetchImageBytes,
  instagramIdentityFrom,
  onRequestGet,
  readCapped,
  resolveMerchantImage,
  resolveProfileImage,
} from "../../functions/img/[slug].js";

const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

function streamOf(chunks) {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

function imageReply(type = "image/png", bytes = PNG, extra = {}) {
  return new Response(bytes, { status: 200, headers: { "Content-Type": type, ...extra } });
}

test("an Instagram identity is accepted by the proxy; everything else keeps initials", () => {
  assert.equal(instagramIdentityFrom("instagram:_umidesign_"), "instagram:_umidesign_");
  assert.equal(instagramIdentityFrom("Instagram:Mumeiyan.HQ"), "instagram:mumeiyan.hq");
  assert.equal(instagramIdentityFrom("instagram%3A_umidesign_"), "instagram:_umidesign_");
  // Business Discovery covers only Instagram, and the proxy must never fetch a guess.
  for (const bad of ["tiktok:makanplace", "facebook:kedaikopi", "instagram:", "instagram:..", "instagram:a..b", "instagram:___", `instagram:${"x".repeat(61)}`, "rakanjayahardware.com", "", "instagram:../../etc"]) {
    assert.equal(instagramIdentityFrom(bad), "", `${JSON.stringify(bad)} must be refused`);
  }
});

test("a profile picture is asked for fresh, with the stored link only as a fallback", async () => {
  const served = [];
  const fetcher = async (url) => { served.push(String(url)); return imageReply("image/jpeg"); };

  // Fresh link from Meta wins.
  const fresh = await resolveProfileImage("instagram:_umidesign_", {}, {
    fetcher,
    discover: async () => ({ logo: "https://scontent.cdninstagram.com/fresh.jpg" }),
    storedUrl: "https://scontent.cdninstagram.com/stale.jpg",
  });
  assert.equal(fresh?.type, "image/jpeg");
  assert.deepEqual(served, ["https://scontent.cdninstagram.com/fresh.jpg"]);

  // Meta declines (personal account, token without scope): the stored link is
  // tried while it is still alive.
  served.length = 0;
  const stored = await resolveProfileImage("instagram:_umidesign_", {}, {
    fetcher, discover: async () => null, storedUrl: "https://scontent.cdninstagram.com/stale.jpg",
  });
  assert.equal(stored?.type, "image/jpeg");
  assert.deepEqual(served, ["https://scontent.cdninstagram.com/stale.jpg"]);

  // Nothing fresh, nothing stored: initials, not an error.
  assert.equal(await resolveProfileImage("instagram:_umidesign_", {}, { fetcher, discover: async () => null }), null);
  // A discover that throws is a miss, never a 500.
  assert.equal(await resolveProfileImage("instagram:_umidesign_", {}, { fetcher, discover: async () => { throw new Error("meta down"); } }), null);
  // Only https links from Meta are followed.
  served.length = 0;
  assert.equal(await resolveProfileImage("instagram:_umidesign_", {}, { fetcher, discover: async () => ({ logo: "http://evil.example/x.jpg" }) }), null);
  assert.deepEqual(served, []);
});

test("only raster image types are re-served", () => {
  assert.equal(allowedImageType("image/png"), "image/png");
  assert.equal(allowedImageType("IMAGE/JPEG; charset=binary"), "image/jpeg");
  assert.equal(allowedImageType("image/x-icon"), "image/x-icon");
  // SVG is a document. Serving one from rankoff.my hands a merchant's server a
  // same-origin page on our own domain.
  assert.equal(allowedImageType("image/svg+xml"), "");
  assert.equal(allowedImageType("text/html"), "");
  assert.equal(allowedImageType(""), "");
  assert.equal(allowedImageType(null), "");
});

test("a body over the cap is abandoned rather than buffered", async () => {
  const small = await readCapped(streamOf([new Uint8Array([1, 2]), new Uint8Array([3])]), 8);
  assert.deepEqual(Array.from(small), [1, 2, 3]);
  assert.equal(await readCapped(streamOf([new Uint8Array(200)]), 100), null);
  assert.equal(await readCapped(null, 100), null);
});

test("a non-image answer is refused whatever the URL promised", async () => {
  const html = async () => new Response("<html></html>", { status: 200, headers: { "Content-Type": "text/html" } });
  assert.equal(await fetchImageBytes("https://merchant.test/apple-touch-icon.png", html), null);

  const missing = async () => new Response(null, { status: 404 });
  assert.equal(await fetchImageBytes("https://merchant.test/favicon.ico", missing), null);

  const broken = async () => { throw new Error("network"); };
  assert.equal(await fetchImageBytes("https://merchant.test/favicon.ico", broken), null);

  assert.equal(await fetchImageBytes("", async () => imageReply()), null);
});

test("a declared size over the cap is refused before the body is read", async () => {
  const huge = async () => imageReply("image/png", PNG, { "Content-Length": "40000000" });
  assert.equal(await fetchImageBytes("https://merchant.test/apple-touch-icon.png", huge), null);
});

test("an empty image is a miss, not a zero-byte card", async () => {
  const empty = async () => imageReply("image/png", new Uint8Array(0));
  assert.equal(await fetchImageBytes("https://merchant.test/favicon.ico", empty), null);
});

test("a real image comes back with its own content type", async () => {
  const found = await fetchImageBytes("https://merchant.test/apple-touch-icon.png", async () => imageReply());
  assert.equal(found.type, "image/png");
  assert.deepEqual(Array.from(found.bytes), Array.from(PNG));
});

test("the square icon is asked for first and stops the search", async () => {
  const asked = [];
  const fetcher = async (url) => {
    asked.push(url);
    return imageReply();
  };
  const found = await resolveMerchantImage("merchant.test", { fetcher, discover: async () => "https://cdn.test/og.png" });
  assert.equal(found.type, "image/png");
  assert.deepEqual(asked, ["https://merchant.test/apple-touch-icon.png"]);
  assert.deepEqual(candidateSources("merchant.test"), [
    "https://merchant.test/apple-touch-icon.png",
    "https://merchant.test/favicon.ico",
  ]);
});

test("the listing's stored logo wins over guessed icons and page photography", async () => {
  const asked = [];
  const fetcher = async (url) => {
    asked.push(url);
    return imageReply();
  };
  const found = await resolveMerchantImage("merchant.test", {
    fetcher,
    preferredUrl: "https://merchant.test/assets/brand-mark.png",
    discover: async () => "https://merchant.test/therapy-photo.jpg",
  });
  assert.equal(found.type, "image/png");
  assert.deepEqual(asked, ["https://merchant.test/assets/brand-mark.png"]);
});

test("a site with no icons falls back to the share image /og already resolves", async () => {
  const asked = [];
  const fetcher = async (url) => {
    asked.push(url);
    return url === "https://cdn.test/og.png" ? imageReply("image/jpeg") : new Response(null, { status: 404 });
  };
  const found = await resolveMerchantImage("merchant.test", { fetcher, discover: async () => "https://cdn.test/og.png" });
  assert.equal(found.type, "image/jpeg");
  assert.deepEqual(asked, [
    "https://merchant.test/apple-touch-icon.png",
    "https://merchant.test/favicon.ico",
    "https://cdn.test/og.png",
  ]);
});

test("a site with nothing at all is a miss the card survives", async () => {
  const fetcher = async () => new Response(null, { status: 404 });
  assert.equal(await resolveMerchantImage("merchant.test", { fetcher, discover: async () => "" }), null);
  const throwing = async () => { throw new Error("discovery failed"); };
  assert.equal(await resolveMerchantImage("merchant.test", { fetcher, discover: throwing }), null);
});

async function get(slug, env = { RANKOFF_MODE: "production" }) {
  return onRequestGet({ request: new Request(`https://rankoff.my/img/${slug}`), env, params: { slug } });
}

test("a slug that is not a hostname never reaches the network", async () => {
  for (const slug of ["", "not a host", "localhost", "..", "203.0.113.9", "merchant.test/../secret"]) {
    const response = await get(slug);
    assert.equal(response.status, 404, slug);
    assert.match(response.headers.get("cache-control"), /max-age=900/);
  }
});

test("a board that is not live proxies nothing", async () => {
  const response = await get("merchant.test", { RANKOFF_MODE: "demo" });
  assert.equal(response.status, 404);
});
