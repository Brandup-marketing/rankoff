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
