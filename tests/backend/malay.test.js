import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderMalay, translateSchema, malayUrl } from '../../functions/_lib/malay.js';
import { translateMs } from '../../ms-copy.js';
import { productEntries } from '../../functions/sitemap.xml.js';
import { buildCardModel } from '../../share-card.js';

test('Malay share card retains the actual name, place and settled total', () => {
 const model=buildCardModel({language:'ms',title:'Example — #2 in Beauty & Wellness',card:{total:'RM 10'}});
 assert.equal(model.name,'Example');assert.equal(model.place,2);assert.equal(model.total,'RM 10');
 assert.equal(model.position,'dalam Kecantikan & Kesejahteraan');
 assert.equal(translateMs('Example — #2 in Beauty & Wellness | RANKOFF'),'Example — #2 dalam Kecantikan & Kesejahteraan | RANKOFF');
});
test('Malay confirmation translates composed disclosure and market context',()=>{
 const message='Your listing goes live at this rank when payment confirms. Someone else can claim a higher one. This is a one-time fee for advertising placement — not a wager, deposit, or contest entry. There are no prizes and no element of chance.';
 const translated=translateMs(message);
 assert.doesNotMatch(translated,/Your listing|Someone else|This is|There are/);
 assert.equal(translateMs('in Beauty & Wellness · all-time'),'dalam Kecantikan & Kesejahteraan · sepanjang masa');
});

test('Malay SSR localises public copy and metadata without changing customer data or scripts',()=>{
 const html='<html lang="en"><head><title>RANKOFF | Pay-to-rank leaderboard, from RM 5</title><link rel="canonical" href="https://rankoff.my/" /></head><body><h1>Claim #1 for RM 15</h1><a href="/categories">Categories</a><span data-title>Home</span><p data-description>View Instagram</p><script>const name="Home";</script></body></html>';
 const ms=renderMalay(html,'https://rankoff.my/?lang=ms');
 assert.match(ms,/<html lang="ms">/);assert.match(ms,/Dapatkan #1 dengan RM 15/);assert.match(ms,/Papan kedudukan berbayar, dari RM 5/);
 assert.match(ms,/href="\/categories\?lang=ms"/);assert.match(ms,/<span data-title>Home<\/span>/);assert.match(ms,/<p data-description>View Instagram<\/p>/);assert.match(ms,/const name="Home"/);
});
test('Malay link handling preserves filters and anchors, excludes API, payment, outbound and external URLs',()=>{
 assert.equal(malayUrl('/?category=Beauty#board'),'/?category=Beauty&lang=ms#board');
 for(const url of ['/go/123','/api/v1/bids','https://www.instagram.com/test','mailto:sales@example.com'])assert.equal(malayUrl(url),url);
});
test('Malay schema retains customer names and translates FAQ answers to match visible content',()=>{
 const data=translateSchema({'@type':'FAQPage',inLanguage:'en',mainEntity:[{'@type':'Question',name:'Who can sponsor a link? / 谁可以赞助一个链接？',acceptedAnswer:{'@type':'Answer',text:'Anyone may sponsor an eligible public website or social profile. Payments accumulate on the link. 任何人都可以赞助符合条件的公开网站或社交账号，金额会累积在该链接上。'}}]});
 assert.equal(data.inLanguage,'ms-MY');assert.equal(data.mainEntity[0].name,'Siapakah yang boleh menaja pautan?');assert.match(data.mainEntity[0].acceptedAnswer.text,/Sesiapa sahaja/);
 assert.equal(translateSchema({'@type':'Organization',name:'Home',description:'Real customer bio'}).name,'Home');
});
test('Malay policies include translated payment obligations and retain access to binding English terms',()=>{
 const ms=renderMalay(readFileSync(new URL('../../legal.html',import.meta.url),'utf8'),'https://rankoff.my/legal?lang=ms');
 assert.match(ms,/Versi bahasa Inggeris/);assert.match(ms,/href="\/legal\?lang=en"/);assert.match(ms,/Tiada hadiah/);assert.match(ms,/Bayaran balik dan ketersediaan/);assert.doesNotMatch(ms,/id="zh-summary"/);
});
test('Malay sitemap includes every public listing and reciprocal alternates',()=>{
 const xml=productEntries([{listing:{hostname:'example.com'},bid:{settled_at:'2026-09-12'}}]);
 assert.match(xml,/<loc>https:\/\/rankoff.my\/product\/example.com\?lang=ms<\/loc>/);
 assert.equal((xml.match(/hreflang="ms"/g)||[]).length,3);
});
test('Malay dynamic prices stay numeric and translation is idempotent',()=>{
 for(const text of ['Claim #1 for RM 15','One payment, from RM 5.','Categories','I understand this is a paid sponsored placement for a public link. It gives me no rights over that account, and the listed party may request removal. I agree to the ']){
 const ms=translateMs(text);assert.notEqual(ms,text);assert.equal(translateMs(ms),ms);
 }
});
