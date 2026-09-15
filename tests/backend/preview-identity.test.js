import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { accountFrom, listingIdentity } from '../../platform-identity.js';
const source = (file) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const homeBody = source('app.js').match(/function existingListingForPending\(\) \{([\s\S]*?)\n  \}/)[1];
const detailBody = source('listing.js').match(/function existingForTypedUrl\(\) \{([\s\S]*?)\n  \}/)[1];
const home = new Function('pendingChallenge','state','accountFrom','listingIdentity',homeBody);
const detail = new Function('elements','boardRankings','parseClaimUrl','accountFrom','listingIdentity',detailBody);
for (const [stored, same, different] of [
 ['https://www.instagram.com/glowmebykimisoi','https://m.instagram.com/GLOWMEBYKIMISOI/?stkn=test','https://www.instagram.com/express_queenlash'],
 ['https://facebook.com/ShopA','https://fb.com/shopa/','https://facebook.com/ShopB'],
 ['https://tiktok.com/@shop_a','https://www.tiktok.com/@SHOP_A','https://tiktok.com/@shop_b'],
 ['https://linkedin.com/company/shop','https://www.linkedin.com/company/SHOP/','https://linkedin.com/in/shop'],
 ['https://example.com/shop','https://www.example.com/other','https://other.example.com/'],
]) {
 test(`both previews distinguish accounts and recognize returning customers: ${stored}`, () => {
  const u=new URL(stored), identity=listingIdentity(u.hostname,accountFrom(u));
  const row={id:'existing',url:stored,hostname:identity,bid:10};
  for(const [input, expected] of [[same,row],[different,null]]) {
   assert.equal(home({url:new URL(input)},{listings:[row]},accountFrom,listingIdentity),expected);
   assert.equal(detail({claimUrl:{value:input}},[row],v=>new URL(v),accountFrom,listingIdentity),expected);
  }
 });
}
