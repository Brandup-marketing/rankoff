// Base advertising measurement only. Purchases require settled-payment events.
(() => {
  if (location.hostname !== 'rankoff.my' || window.__rankoffMetaPixelLoaded) return;
  window.__rankoffMetaPixelLoaded = true;
  if (!window.fbq) {
    const queue = window.fbq = function () {
      queue.callMethod ? queue.callMethod.apply(queue, arguments) : queue.queue.push(arguments);
    };
    if (!window._fbq) window._fbq = queue;
    queue.push = queue;
    queue.loaded = true;
    queue.version = '2.0';
    queue.queue = [];
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }
  window.fbq('init', '1381116680322454');
  window.fbq('track', 'PageView');
})();
