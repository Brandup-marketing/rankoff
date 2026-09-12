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

  // A settled payment is the only conversion worth optimising for, and a buyer
  // returning from the hosted checkout has not necessarily paid. app.js calls
  // this only after the board's own API reports the bid settled. The bid id is
  // the event id, so a server-side Purchase for the same payment deduplicates
  // instead of counting the sale twice.
  const counted = new Set();
  window.rankoffTrackPurchase = function (bidId, amountMinor, currency) {
    const id = String(bidId || '').trim();
    if (!id || counted.has(id)) return false;
    const minor = Number(amountMinor);
    const code = String(currency || '').trim().toUpperCase();
    // The amount comes from our own settled record. If it is not a real figure,
    // report nothing rather than invent a sale value.
    if (!Number.isFinite(minor) || minor <= 0 || !/^[A-Z]{3}$/.test(code)) return false;
    counted.add(id);
    window.fbq('track', 'Purchase', { value: minor / 100, currency: code }, { eventID: id });
    return true;
  };
})();
