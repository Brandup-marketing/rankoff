import test from 'node:test';
import assert from 'node:assert/strict';
import { extractSiteInfo } from '../../functions/_lib/siteinfo.js';

// Regression: the value of a meta tag ends at the quote that OPENED it. An
// apostrophe inside a double-quoted description used to end it early, so
// "Let's GO" was stored as "Let" and the cut text went out in public posts.
const LONG = 'Describe your video, ad, or workflow on Home, tap Let\'s GO, and let BloomBot start a cinematic Workflow. Pick up recent projects and browse templates.';

test('an apostrophe inside a double-quoted description is kept', () => {
  const result = extractSiteInfo(`<meta name="description" content="${LONG}" />`, 'bloomway.ai');
  assert.equal(result.description, LONG);
});

test('an apostrophe inside a title is kept', () => {
  const result = extractSiteInfo('<meta property="og:site_name" content="Kim\'s Salon | Johor">', 'kims.example');
  assert.equal(result.title, 'Kim\'s Salon');
});

test('a double quote inside a single-quoted value is kept', () => {
  const value = 'He said "hi" to us and we said hello back to everyone here today';
  const result = extractSiteInfo(`<meta content='${value}' name="description">`, 'example.com');
  assert.equal(result.description, value);
});

test('attribute order and quote style do not matter, and entities still decode', () => {
  const result = extractSiteInfo('<meta content=\'Fish &amp; chips, don&#39;t miss it, the best in town for many years now.\' property=\'og:description\'>', 'example.com');
  assert.equal(result.description, 'Fish & chips, don\'t miss it, the best in town for many years now.');
});

test('an apostrophe inside an icon URL does not lose the icon', () => {
  const result = extractSiteInfo('<link rel="icon" href="https://cdn.example.com/kim\'s/logo.png">', 'example.com');
  assert.equal(result.logo, 'https://cdn.example.com/kim\'s/logo.png');
});

// ---- named entities -------------------------------------------------------
// CMS themes and SEO plugins write punctuation as named entities. They used to
// be published verbatim ("We&rsquo;re") on the listing and in social captions.
test('named punctuation entities are decoded', () => {
  const desc = (html) => extractSiteInfo(`<meta name="description" content="${html}">`, 'example.com').description;
  assert.equal(desc('We&rsquo;re the best salon in town and we love our clients dearly.'), 'We’re the best salon in town and we love our clients dearly.');
  assert.equal(desc('Fresh flowers &mdash; delivered daily across the whole of Johor Bahru city.'), 'Fresh flowers — delivered daily across the whole of Johor Bahru city.');
  assert.equal(desc('&ldquo;Best in town&rdquo; says everyone who has tried our signature wedding packages&hellip;'), '“Best in town” says everyone who has tried our signature wedding packages…');
  assert.equal(desc('Tom &amp; Jerry&#39;s &copy; 2026 &ndash; cakes, bread and pastries baked fresh every morning.'), 'Tom & Jerry\'s © 2026 – cakes, bread and pastries baked fresh every morning.');
});

test('an unknown or malformed entity is left as text and never throws away the description', () => {
  const desc = (html) => extractSiteInfo(`<meta name="description" content="${html}">`, 'example.com').description;
  const base = 'Family-run bakery in Johor Bahru baking fresh bread and pastries every single morning';
  assert.equal(desc(`${base} &notarealentity;`), `${base} &notarealentity;`);
  assert.equal(desc(`${base} &#99999999999; done`), `${base} &#99999999999; done`);
  assert.equal(desc(`${base} &#0; done`), `${base} &#0; done`);
});

// ---- ">" inside a quoted value --------------------------------------------
test('a ">" inside a description no longer ends the tag or drops the description', () => {
  const text = 'Save 20% > everyone else on all our wedding packages booked this whole year.';
  assert.equal(extractSiteInfo(`<meta name="description" content="${text}">`, 'example.com').description, text);
  // content BEFORE name: the old pattern could not see the name at all
  assert.equal(extractSiteInfo(`<meta content="${text}" name="description">`, 'example.com').description, text);
  assert.equal(extractSiteInfo(`<meta property="og:site_name" content="A > B Studio"><meta name="description" content="${text}">`, 'example.com').title, 'A > B Studio');
});

// ---- attribute parsing ----------------------------------------------------
test('attributes may be unquoted, reordered or repeated', () => {
  const text = 'Independent coffee roaster serving Johor Bahru with small-batch beans since 2015.';
  assert.equal(extractSiteInfo(`<meta name=description content="${text}">`, 'example.com').description, text);
  assert.equal(extractSiteInfo(`<META CONTENT="${text}" NAME="Description" />`, 'example.com').description, text);
  // A browser honours the first occurrence of a repeated attribute.
  assert.equal(extractSiteInfo(`<meta name="description" content="${text}" content="ignored">`, 'example.com').description, text);
});

test('a value that merely contains "name=" or "content=" is not mistaken for the attribute', () => {
  const text = 'Read our story: name="Ah Kow" content="handmade" since 1998, still family owned and run.';
  const result = extractSiteInfo(`<meta name="description" content='${text}'>`, 'example.com');
  assert.equal(result.description, text);
});

test('icon and logo lookups survive quotes and ">" in other attributes', () => {
  const icon = extractSiteInfo('<link rel="apple-touch-icon" title="Kim\'s > icon" href="https://cdn.example.com/a.png">', 'example.com');
  assert.equal(icon.logo, 'https://cdn.example.com/a.png');
  const img = extractSiteInfo('<img alt="Kim\'s logo > mark" src="https://cdn.example.com/logo.png">', 'example.com');
  assert.equal(img.logo, 'https://cdn.example.com/logo.png');
  // an .ico is still skipped
  assert.equal(extractSiteInfo('<link rel="icon" href="/favicon.ico">', 'example.com').logo, '');
});

test('hostile markup is read in linear time', () => {
  const hostile = `<meta name="description" content="${'\' " '.repeat(20000)}` + '<meta '.repeat(5000) + 'x="'.repeat(5000);
  const started = Date.now();
  extractSiteInfo(hostile, 'example.com');
  assert.ok(Date.now() - started < 1500, `took ${Date.now() - started}ms`);
});
