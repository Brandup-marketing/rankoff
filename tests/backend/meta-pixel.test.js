import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../meta-pixel.js', import.meta.url), 'utf8');
test('production pixel initializes once and tracks only PageView', () => {
  const scripts = [];
  const context = vm.createContext({ window: {}, location: { hostname: 'rankoff.my' }, document: {
    createElement: () => ({}), head: { appendChild: script => scripts.push(script) },
  } });
  vm.runInContext(source, context);
  vm.runInContext(source, context);
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].src, 'https://connect.facebook.net/en_US/fbevents.js');
  assert.deepEqual(Array.from(context.window.fbq.queue, args => Array.from(args)), [
    ['init', '1381116680322454'], ['track', 'PageView'],
  ]);
});
test('preview and localhost do not load advertising pixel', () => {
  for (const hostname of ['localhost', 'rankoff-git.pages.dev']) {
    const context = vm.createContext({ window: {}, location: { hostname } });
    vm.runInContext(source, context);
    assert.equal(context.window.fbq, undefined);
  }
});

test('a settled payment reports one Purchase with the real amount', () => {
  const context = vm.createContext({ window: {}, location: { hostname: 'rankoff.my' }, document: {
    createElement: () => ({}), head: { appendChild: () => {} },
  } });
  vm.runInContext(source, context);
  // Objects built inside the vm context have that realm's prototypes, so the
  // queue is compared as data rather than by deep strict equality.
  const fired = () => Array.from(context.window.fbq.queue, args => Array.from(args))
    .filter(args => args[1] === 'Purchase');

  assert.equal(context.window.rankoffTrackPurchase('bid_1', 500, 'MYR'), true);
  assert.equal(
    JSON.stringify(fired()),
    JSON.stringify([['track', 'Purchase', { value: 5, currency: 'MYR' }, { eventID: 'bid_1' }]]),
  );

  // The same payment must never be counted twice, and the bid id is the event
  // id so a server-side Purchase for it deduplicates.
  assert.equal(context.window.rankoffTrackPurchase('bid_1', 500, 'MYR'), false);
  assert.equal(fired().length, 1);

  // No real figure, no reported sale value.
  for (const bad of [['bid_2', 0, 'MYR'], ['bid_3', NaN, 'MYR'], ['bid_4', 500, ''], ['', 500, 'MYR']]) {
    assert.equal(context.window.rankoffTrackPurchase(...bad), false);
  }
  assert.equal(fired().length, 1);
});

test('the Purchase event is reachable only from confirmed settlement', () => {
  const app = readFileSync(new URL('../../app.js', import.meta.url), 'utf8');
  const call = 'window.rankoffTrackPurchase?.(bidId, status.amountMinor, status.currency);';
  assert.equal(app.split(call).length - 1, 1);
  // Returning from the hosted checkout is not payment: the call must sit after
  // the API has answered "settled", not in the return handler.
  const settledGate = app.indexOf('if (!status.settled) continue;');
  assert.ok(settledGate > 0 && app.indexOf(call) > settledGate);
  assert.ok(app.indexOf(call) < app.indexOf('settledListingId = status.listingId;'));
});

test('advertising measurement is disclosed where visitors read the policies', () => {
  const legal = readFileSync(new URL('../../legal.html', import.meta.url), 'utf8');
  assert.match(legal, /Meta Pixel/);
  assert.match(legal, /facebook\.com\/privacy\/policy/);
});
