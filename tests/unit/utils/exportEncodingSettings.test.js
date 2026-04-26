import { afterEach, describe, expect, it, vi } from 'vitest';

import { scaleAndEncodeBlob } from '../ui/src/utils/export/imageProcessor';

const ORIGINAL_OFFSCREEN = globalThis.OffscreenCanvas;
const ORIGINAL_CREATE_IMAGE_BITMAP = globalThis.createImageBitmap;

const restoreGlobals = () => {
  if (ORIGINAL_OFFSCREEN === undefined) {
    delete globalThis.OffscreenCanvas;
  } else {
    globalThis.OffscreenCanvas = ORIGINAL_OFFSCREEN;
  }

  if (ORIGINAL_CREATE_IMAGE_BITMAP === undefined) {
    delete globalThis.createImageBitmap;
  } else {
    globalThis.createImageBitmap = ORIGINAL_CREATE_IMAGE_BITMAP;
  }
};

afterEach(() => {
  restoreGlobals();
  vi.restoreAllMocks();
});

function installOffscreenMocks({ width = 200, height = 120 } = {}) {
  const convertToBlob = vi.fn(async ({ type, quality }) => {
    return new Blob([`encoded:${type}:${String(quality)}`], { type });
  });

  const drawImage = vi.fn();
  const getContext = vi.fn(() => ({
    drawImage,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high',
  }));

  class FakeOffscreenCanvas {
    constructor(w, h) {
      this.width = w;
      this.height = h;
      this._ctx = getContext();
    }

    getContext() {
      return this._ctx;
    }

    async convertToBlob(opts) {
      return convertToBlob(opts);
    }
  }

  const close = vi.fn();
  const createImageBitmap = vi.fn(async () => ({ width, height, close }));

  globalThis.OffscreenCanvas = FakeOffscreenCanvas;
  globalThis.createImageBitmap = createImageBitmap;

  return { convertToBlob, createImageBitmap, drawImage, close };
}

describe('scaleAndEncodeBlob export settings behavior', () => {
  it('returns source blob for default PNG export with scale=1', async () => {
    const src = new Blob(['raw'], { type: 'image/png' });
    const out = await scaleAndEncodeBlob(src, { scale: 1, format: 'png', quality: 0.95 });
    expect(out).toBe(src);
  });

  it('applies WEBP format and quality to encoder', async () => {
    const mocks = installOffscreenMocks({ width: 200, height: 120 });
    const src = new Blob(['raw'], { type: 'image/png' });

    const out = await scaleAndEncodeBlob(src, { scale: 1.5, format: 'webp', quality: 0.6 });

    expect(mocks.createImageBitmap).toHaveBeenCalledTimes(1);
    expect(mocks.convertToBlob).toHaveBeenCalledTimes(1);
    expect(mocks.convertToBlob).toHaveBeenCalledWith({ type: 'image/webp', quality: 0.6 });
    expect(out.type).toBe('image/webp');
  });

  it('applies JPEG format and clamps quality into valid range', async () => {
    const mocks = installOffscreenMocks({ width: 240, height: 160 });
    const src = new Blob(['raw'], { type: 'image/png' });

    const out = await scaleAndEncodeBlob(src, { scale: 1.25, format: 'jpeg', quality: 4 });

    expect(mocks.convertToBlob).toHaveBeenCalledWith({ type: 'image/jpeg', quality: 1 });
    expect(out.type).toBe('image/jpeg');
  });

  it('uses explicit target width/height over scale', async () => {
    const seenSizes = [];

    class FakeOffscreenCanvas {
      constructor(w, h) {
        this.width = w;
        this.height = h;
        seenSizes.push([w, h]);
      }

      getContext() {
        return { drawImage: vi.fn(), imageSmoothingEnabled: true, imageSmoothingQuality: 'high' };
      }

      async convertToBlob({ type, quality }) {
        return new Blob([`encoded:${type}:${String(quality)}`], { type });
      }
    }

    globalThis.OffscreenCanvas = FakeOffscreenCanvas;
    globalThis.createImageBitmap = vi.fn(async () => ({ width: 100, height: 100, close: vi.fn() }));

    const src = new Blob(['raw'], { type: 'image/png' });
    const out = await scaleAndEncodeBlob(src, {
      scale: 4,
      format: 'jpeg',
      quality: 0.8,
      targetWidth: 640,
      targetHeight: 360,
    });

    expect(seenSizes.at(-1)).toEqual([640, 360]);
    expect(out.type).toBe('image/jpeg');
  });
});

