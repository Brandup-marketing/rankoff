import { readFile } from 'node:fs/promises';
import { translateMs, normalizeCopy } from '../ms-copy.js';
const files=['index.html','about.html','categories.html','listing.html','legal.html','answers/pay-to-rank-leaderboard.html','answers/how-rankoff-ranking-works.html','answers/sponsor-a-public-link.html'];
const missing=new Set();
for(const file of files){
 const html=(await readFile(file,'utf8')).replace(/<script[\s\S]*?<\/script>/g,'').replace(/<style[\s\S]*?<\/style>/g,'').replace(/<!--[\s\S]*?-->/g,'');
 const values=[...html.matchAll(/>([^<>]+)</g)].map(m=>m[1]);
 values.push(...[...html.matchAll(/(?:content|aria-label|placeholder|title)="([^"]*)"/g)].map(m=>m[1]));
 for(let value of values){value=normalizeCopy(value.replaceAll('&amp;','&'));if(!/[a-zA-Z]{3}/.test(value)||/^(https?:|\/|#)/.test(value)||/[\u3400-\u9fff]/.test(value))continue;if(translateMs(value)===value)missing.add(value);}
}
console.log([...missing].sort().join('\n'));
