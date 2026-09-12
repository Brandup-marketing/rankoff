import test from 'node:test';
import assert from 'node:assert/strict';
import { extractSiteInfo } from '../../functions/_lib/siteinfo.js';
import { resolveFacebookImage } from '../../functions/img/[slug].js';
import { proxyPathFor } from '../../share-card.js';

test('Facebook uses the page image with decoded parameters and omits platform counts',()=>{
 const result=extractSiteInfo('<meta property="og:site_name" content="Facebook"><meta property="og:title" content="MoonSoul | Puchong"><meta property="og:description" content="MoonSoul, Puchong. 688 sukaan. Moonsoul supplies beauty home devices as well as beauty related products."><link rel="icon" href="https://facebook.com/icon.png"><meta property="og:image" content="https://scontent.example.fbcdn.net/v/photo.jpg?a=1&amp;b=2">','facebook.com',{social:true,allowSocialImage:true,allowSocialDescription:true});
 assert.equal(result.title,'MoonSoul');
 assert.equal(result.description,'Moonsoul supplies beauty home devices as well as beauty related products.');
 assert.equal(result.logo,'https://scontent.example.fbcdn.net/v/photo.jpg?a=1&b=2');
 assert.equal(proxyPathFor('https://rankoff.my/profile/facebook/moonsoul.fb.official'),'/img/facebook:moonsoul.fb.official?v=4');
});
test('Facebook login pages never become the merchant logo',async()=>{
 const calls=[];
 const found=await resolveFacebookImage('facebook:moonsoul.fb.official','https://facebook.com/favicon.ico',async url=>{calls.push(String(url));return new Response('<meta property="og:title" content="Facebook"><meta property="og:image" content="https://facebook.com/icon.png">');});
 assert.equal(found,null);assert.equal(calls.length,1);
});
