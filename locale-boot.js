// Restore the language on provider checkout returns without changing payment data.
(() => {
  const url = new URL(location.href);
  let language = url.searchParams.get('lang');
  try {
    if (!language && url.searchParams.has('checkout')) {
      language = sessionStorage.getItem('rankoff-checkout-language');
      if (['ms','zh'].includes(language)) { url.searchParams.set('lang', language); history.replaceState(null, '', url); }
    }
    // English is the first-visit default. A saved Chinese or Malay choice is
    // applied before anything paints by loading the server-rendered page for it;
    // an explicit ?lang link always wins, and ?reset returns to the default.
    if (!language && !url.searchParams.has('reset')) {
      const saved = JSON.parse(localStorage.getItem('rankoff-mvp-demo-v3'))?.language;
      if (['ms','zh'].includes(saved)) { url.searchParams.set('lang', saved); language = saved; location.replace(url); }
    }
    if (['en','zh','ms'].includes(language)) sessionStorage.setItem('rankoff-checkout-language',language);
  } catch { /* Language persistence is optional. */ }
  window.RankoffLocale = Object.freeze({ language: ['ms','zh'].includes(language) ? language : 'en', isMalay: language === 'ms' });
})();
