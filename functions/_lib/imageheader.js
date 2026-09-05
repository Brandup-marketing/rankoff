// Read an image's real dimensions out of its own bytes.
//
// A Worker has no canvas and no image decoder, so the only honest way to know
// what was uploaded is to parse the header. Trusting a client-supplied width
// would let anything at all become the picture that represents a paying
// merchant in every share of their page.

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function isPng(bytes) {
  if (bytes.length < 24) return false;
  return PNG_MAGIC.every((byte, index) => bytes[index] === byte);
}

function pngSize(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // Bytes 12..15 must spell IHDR; the dimensions follow it.
  if (view.getUint32(12) !== 0x49484452) return null;
  return { contentType: "image/png", width: view.getUint32(16), height: view.getUint32(20) };
}

function jpegSize(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    // Standalone markers carry no length.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const length = view.getUint16(offset + 2);
    if (length < 2) return null;
    // Any SOF frame header but the arithmetic-coded and reserved ones.
    const isFrame = marker >= 0xc0 && marker <= 0xcf
      && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame) {
      return {
        contentType: "image/jpeg",
        height: view.getUint16(offset + 5),
        width: view.getUint16(offset + 7),
      };
    }
    offset += 2 + length;
  }
  return null;
}

// Returns { contentType, width, height } for a raster image we recognise, or
// null for everything else — including SVG, which must never be served from
// our own origin because it is a document, not a picture.
export function readImageHeader(bytes) {
  if (!(bytes instanceof Uint8Array)) return null;
  if (isPng(bytes)) return pngSize(bytes);
  return jpegSize(bytes);
}
