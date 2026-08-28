import { cp, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url);
const dist = new URL('../dist/', import.meta.url);
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const files = [
  'index.html', 'categories.html', 'about.html', 'legal.html', 'listing.html',
  'styles.css', 'categories.css', 'about.css', 'legal.css', 'listing.css',
  'app.js', 'search.js', 'share.js', 'categories.js', 'about.js', 'listing.js', '_headers', '_routes.json',
  'robots.txt', 'sitemap.xml', 'llms.txt'
];
for (const file of files) await cp(new URL(`../${file}`, import.meta.url), new URL(`../dist/${file}`, import.meta.url));
await cp(new URL('../assets/', import.meta.url), new URL('./assets/', dist), { recursive: true });
console.log(`Built ${files.length} runtime files and assets into ${join(root.pathname, 'dist')}`);
