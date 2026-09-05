import test from "node:test";
import assert from "node:assert/strict";
import { readImageHeader } from "../../functions/_lib/imageheader.js";

function png(width, height) {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13);
  view.setUint32(12, 0x49484452); // "IHDR"
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

function jpeg(width, height) {
  // SOI, then a single SOF0 frame carrying the dimensions.
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0, 0, 0, 0, 0x03]);
  const view = new DataView(bytes.buffer);
  view.setUint16(7, height);
  view.setUint16(9, width);
  return bytes;
}

test("a PNG reports the size written in its own header", () => {
  assert.deepEqual(readImageHeader(png(1200, 630)), { contentType: "image/png", width: 1200, height: 630 });
});

test("a JPEG reports the size written in its own frame header", () => {
  assert.deepEqual(readImageHeader(jpeg(1200, 630)), { contentType: "image/jpeg", width: 1200, height: 630 });
});

test("a client cannot pass off something that is not a raster image", () => {
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"></svg>');
  assert.equal(readImageHeader(svg), null, "SVG is a document and must never be served from our own origin");
  assert.equal(readImageHeader(new TextEncoder().encode("GIF89a")), null);
  assert.equal(readImageHeader(new Uint8Array(0)), null);
  assert.equal(readImageHeader(new Uint8Array([0x89, 0x50, 0x4e, 0x47])), null, "truncated PNG");
  assert.equal(readImageHeader("not bytes"), null);
});

test("a PNG whose magic is right but whose IHDR is missing is refused", () => {
  const bytes = png(1200, 630);
  new DataView(bytes.buffer).setUint32(12, 0x12345678);
  assert.equal(readImageHeader(bytes), null);
});
