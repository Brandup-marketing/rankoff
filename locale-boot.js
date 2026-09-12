// Restore the language on provider checkout returns without changing payment data.
(() => {
  const url = new URL(location.href);
  let language = url.searchParams.get('lang');
  try {
    if (!language && url.searchParams.has('checkout')) {
      language = sessionStorage.getItem('rankoff-checkout-language');
      if (['ms','zh'].includes(language)) { url.searchParams.set('lang', language); history.replaceState(null, '', url); }
    }
    if (['en','zh','ms'].includes(language)) sessionStorage.setItem('rankoff-checkout-language',language);
  } catch { /* Language persistence is optional. */ }
  window.RankoffLocale = Object.freeze({ language: ['ms','zh'].includes(language) ? language : 'en', isMalay: language === 'ms' });
})();
