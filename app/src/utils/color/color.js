/**
 * Shared color and PRNG utilities.
 * Consolidated from duplicated definitions across colorPalette.js, canvasBackgroundFx.js,
 * blobGradientPreview.js, imageInset.js, and cssColor.js.
 */

import { clamp } from '../core/math';
import { parseCssColor } from './cssColor';

/** Convert individual R, G, B values (0–255) to a hex string like "#AABBCC". */
export const rgbToHex = (r, g, b) => {
  const rr = clamp(Math.round(r), 0, 255).toString(16).padStart(2, '0');
  const gg = clamp(Math.round(g), 0, 255).toString(16).padStart(2, '0');
  const bb = clamp(Math.round(b), 0, 255).toString(16).padStart(2, '0');
  return `#${rr}${gg}${bb}`.toUpperCase();
};

/** Parse a hex color string (#RGB or #RRGGBB) into { r, g, b }. Returns null on invalid input. */
export const hexToRgb = (hex) => {
  const h = String(hex || '').trim();
  const m = h.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!m) return null;
  let s = m[1];
  if (s.length === 3) s = s.split('').map((c) => c + c).join('');
  const n = Number.parseInt(s, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

/** Deterministic PRNG (Mulberry32) for stable presets. */
export const mulberry32 = (seed) => {
  let t = (Number(seed) || 1) >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Parse a CSS color string, with bounded caching.
 * Accepts anything parseCssColor handles (hex, rgb(), hsl(), etc.)
 */
const parsedCssColorCache = new Map();
export const parseCssColorCached = (raw) => {
  if (parsedCssColorCache.has(raw)) return parsedCssColorCache.get(raw);
  let parsed = null;
  try {
    parsed = parseCssColor(raw);
  } catch {
    parsed = null;
  }
  parsedCssColorCache.set(raw, parsed);
  if (parsedCssColorCache.size > 256) parsedCssColorCache.clear();
  return parsed;
};

/**
 * Convert a CSS color string to an rgba() string suitable for canvas fillStyle.
 * Falls back to hex parsing, then raw passthrough for named colors.
 */
export const toCanvasRgba = (color, alphaMul = 1) => {
  const raw = String(color ?? '').trim();
  if (!raw) return 'rgba(0,0,0,0)';
  if (raw.toLowerCase() === 'transparent') return 'rgba(0,0,0,0)';

  const parsed = parseCssColorCached(raw);
  if (parsed && Number.isFinite(parsed.r) && Number.isFinite(parsed.g) && Number.isFinite(parsed.b)) {
    const a = clamp((Number.isFinite(parsed.a) ? parsed.a : 1) * (Number(alphaMul) || 0), 0, 1);
    return `rgba(${parsed.r},${parsed.g},${parsed.b},${a})`;
  }

  const rgb = hexToRgb(raw);
  if (rgb) {
    return `rgba(${rgb.r},${rgb.g},${rgb.b},${clamp(Number(alphaMul) || 0, 0, 1)})`;
  }

  return raw;
};
