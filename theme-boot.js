// Apply the saved appearance before page styles paint. Reading preferences must
// never rewrite language, listing or checkout state in the shared store.
(() => {
  const root = document.documentElement;
  let theme = 'light';
  try {
    const saved = JSON.parse(localStorage.getItem('rankoff-mvp-demo-v3'));
    if (!new URL(location.href).searchParams.has('reset') && saved?.theme === 'dark') theme = 'dark';
  } catch { /* Unavailable or damaged storage uses the public light default. */ }
  root.dataset.theme = theme;

  // Page controllers still own their toggles; keep browser chrome in sync too.
  const syncChrome = () => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content', root.dataset.theme === 'dark' ? '#090a0c' : '#faf7f5',
    );
  };
  syncChrome();
  new MutationObserver(syncChrome).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
})();
