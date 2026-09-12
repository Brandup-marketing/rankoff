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
