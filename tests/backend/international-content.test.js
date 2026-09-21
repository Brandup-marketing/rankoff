import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { renderMalay } from '../../functions/_lib/malay.js';

const read = (name) => readFileSync(new URL(`../../${name}`, import.meta.url), 'utf8');
const answerNames = ['pay-to-rank-leaderboard', 'how-rankoff-ranking-works', 'sponsor-a-public-link', 'business-exposure-malaysia'];

test('evergreen guides defer to current board pricing and preserve the Malaysian guide', () => {
  for (const name of answerNames) {
    const html = read(`answers/${name}.html`);
    assert.doesNotMatch(html, /RM\s?5|US\$\s?[12](?:\D|$)/);
    assert.match(html, /href="\/"/);
    for (const [, json] of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) {
      assert.doesNotThrow(() => JSON.parse(json));
    }
  }
  const local = read('answers/business-exposure-malaysia.html');
  assert.match(local, /canonical" href="https:\/\/rankoff\.my\/answers\/business-exposure-malaysia"/);
  assert.match(local, /Hypex Auto/);
  assert.match(local, /Express Queen Lash/);
  assert.doesNotMatch(read('llms.txt'), /RM\s?5|US\$\s?[12](?:\D|$)/);
});

test('Malay about and guides translate international scope and current-price explanations', () => {
  const about = renderMalay(read('about.html'), 'https://rankoff.my/about?lang=ms');
  assert.match(about, /Merentas sempadan atau berhampiran anda/);
  assert.match(about, /Lokasi perniagaan berbeza daripada kawasan perkhidmatannya/);
  assert.doesNotMatch(about.replace(/<script\b[\s\S]*?<\/script>/g, ''), /RANKOFF helps|Across borders|Explore software|Locations, services|Malaysian businesses/);
  for (const name of ['pay-to-rank-leaderboard', 'sponsor-a-public-link', 'business-exposure-malaysia']) {
    const ms = renderMalay(read(`answers/${name}.html`), `https://rankoff.my/answers/${name}?lang=ms`);
    assert.match(ms, /mata wang/);
    assert.doesNotMatch(ms.replace(/<script\b[\s\S]*?<\/script>/g, ''), /The live board|Rankoff is a public sponsored|Software, design|A public listing/);
  }
});

test('sponsor FAQ uses the same currency-neutral pricing in visible text and structured data', () => {
  const html = read('answers/sponsor-a-public-link.html');
  const faq = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  const answer = faq.mainEntity.find((entry) => entry.name.startsWith('What is the starting amount?')).acceptedAnswer.text;
  const english = 'The live board shows the current minimum and currency. The applicable published price is shown before payment.';
  const chinese = '实时榜单会显示当前最低金额和币种，付款前会显示适用的公开价格。';
  assert.equal(answer, `${english} ${chinese}`);
  assert.ok(html.includes(`<p lang="en">${english}</p>`));
  assert.ok(html.includes(`<p lang="zh-CN">${chinese}</p>`));
  const ms = renderMalay(html, 'https://rankoff.my/answers/sponsor-a-public-link?lang=ms');
  const localized = JSON.parse(ms.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  const translated = localized.mainEntity.find((entry) => entry.name === 'Berapakah jumlah permulaan?').acceptedAnswer.text;
  assert.ok(ms.includes(`<p lang="ms">${translated}</p>`));
});
