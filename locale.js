import { translateMs } from './ms-copy.js?v=2';

const locale = window.RankoffLocale?.language || 'en';
const isMalay = locale === 'ms';
window.RankoffMalay = isMalay ? translateMs : value => value;
const publicPath = /^\/(?:$|index(?:\.html)?$|about(?:\.html)?$|categories(?:\.html)?$|legal(?:\.html)?$|listing(?:\.html)?$|answers\/[^/]+$|product\/[^/]+$|profile\/[^/]+\/[^/]+$)/;
const skip = 'script,style,textarea,[translate="no"],[data-title],[data-description],[data-host],[data-no-translate],[data-share-title],[data-share-url],[data-mark],.product-name,.listing-description,.listing-host,.brand-word,.locale-select';
const attrs = ['aria-label','placeholder','title','alt'];

function urlFor(raw, language = locale) {
  const url = new URL(raw, location.href);
  if (url.origin !== location.origin || !publicPath.test(url.pathname)) return url;
  if (language === 'en') url.searchParams.set('lang', 'en');
  else url.searchParams.set('lang', language);
  return url;
}

function languageSelect() {
  if (document.querySelector('.locale-select')) return;
  const old = document.querySelector('[data-language-toggle],[data-legal-language]');
  const nav = document.querySelector('.topbar');
  if (!nav) return;
  if (old) { old.classList.add('locale-legacy'); old.setAttribute('aria-hidden','true'); old.tabIndex = -1; }
  const select = document.createElement('select');
  select.className = 'locale-select';
  select.setAttribute('aria-label', locale === 'ms' ? 'Bahasa' : locale === 'zh' ? '语言' : 'Language');
  for (const [value, label] of [['en','EN'],['zh','中文'],['ms','BM']]) {
    const option = document.createElement('option'); option.value=value; option.textContent=label; select.append(option);
  }
  select.value=isMalay ? 'ms' : document.documentElement.lang.startsWith('zh') ? 'zh' : locale;
  select.addEventListener('change', () => { location.href=urlFor(location.href, select.value).href; });
  if (old) old.before(select); else nav.append(select);
}

function translateTree(root) {
  if (!isMalay) return;
  if (root.nodeType === Node.TEXT_NODE) {
    if (!root.parentElement?.closest(skip)) { const next=translateMs(root.nodeValue); if(next!==root.nodeValue) root.nodeValue=next; }
    return;
  }
  if (root.nodeType!==Node.ELEMENT_NODE && root.nodeType!==Node.DOCUMENT_NODE) return;
  if (root.nodeType===Node.ELEMENT_NODE && root.closest(skip)) return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()) translateTree(walker.currentNode);
  const elements=root.querySelectorAll ? [...(root.nodeType===1?[root]:[]),...root.querySelectorAll('*')] : [];
  for (const el of elements) {
    if(el.closest('script,style,.locale-select')) continue;
    for(const attr of attrs) if(el.hasAttribute(attr)){const old=el.getAttribute(attr),next=translateMs(old);if(next!==old)el.setAttribute(attr,next);}
    if(el.matches('a[href]') && !el.closest('.locale-legal-note')) {
      const old=el.getAttribute('href');
      try { const next=urlFor(old); if(next.origin===location.origin && publicPath.test(next.pathname) && next.href!==el.href) el.setAttribute('href',next.pathname+next.search+next.hash); } catch { /* Malformed external link stays unchanged. */ }
    }
  }
}

function metadata() {
  if(!isMalay) return;
  if(document.documentElement.lang!=='ms')document.documentElement.lang='ms';
  for(const node of document.querySelectorAll('title,meta[name="description"],meta[property="og:title"],meta[property="og:description"],meta[name="twitter:title"],meta[name="twitter:description"]')) {
    const attr=node.tagName==='META'?'content':null;
    const old=attr?node.getAttribute(attr):node.textContent;
    const next=translateMs(old);if(next!==old){if(attr)node.setAttribute(attr,next);else node.textContent=next;}
  }
  for(const node of document.querySelectorAll('link[rel="canonical"],meta[property="og:url"]')) {
    const attr=node.tagName==='LINK'?'href':'content', old=node.getAttribute(attr);
    try { const url=new URL(old,location.href);url.searchParams.set('lang','ms');if(url.href!==old)node.setAttribute(attr,url.href); } catch { /* Keep valid server metadata. */ }
  }
  const ogLocale=document.querySelector('meta[property="og:locale"]');
  if(ogLocale && ogLocale.content!=='ms_MY')ogLocale.content='ms_MY';
  const schemaNode=document.querySelector('#website-schema');
  if(schemaNode){try{const schema=JSON.parse(schemaNode.textContent);if(schema.inLanguage!=='ms-MY'){schema.inLanguage='ms-MY';schema.description=translateMs(schema.description);schema.url=urlFor(schema.url).href;if(schema.potentialAction){schema.potentialAction.name=translateMs(schema.potentialAction.name);schema.potentialAction.target=urlFor(schema.potentialAction.target).href;}schemaNode.textContent=JSON.stringify(schema);}}catch{/* Keep server schema. */}}
}

function start() {
  languageSelect(); translateTree(document); metadata();
  if(!isMalay) return;
  const observer=new MutationObserver(records=>{
    observer.disconnect();
    for(const record of records){
      if(record.type==='childList')record.addedNodes.forEach(translateTree);
      else translateTree(record.target);
    }
    metadata(); observer.observe(document.documentElement, options);
  });
  const options={subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:[...attrs,'href','content','lang']};
  observer.observe(document.documentElement, options);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
