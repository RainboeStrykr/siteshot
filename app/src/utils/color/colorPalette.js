import { clamp } from '../core/math';
import { rgbToHex, hexToRgb } from './color';

const dist2 = (a, b) => {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
};

const pickDistinct = (rgbs, count, minDistSq = 28 * 28) => {
  const out = [];
  for (const c of rgbs) {
    if (out.length >= count) break;
    if (!out.length) {
      out.push(c);
      continue;
    }
    let ok = true;
    for (const o of out) {
      if (dist2(c, o) < minDistSq) {
        ok = false;
        break;
      }
    }
    if (ok) out.push(c);
  }
  return out;
};

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/**
 * Extract a small color palette from a screenshot data URL.
 *
 * This is intentionally lightweight (no dependencies) and samples a downscaled image.
 */
export async function extractPaletteFromDataUrl(dataUrl, { colorCount = 5, returnMeta = false } = {}) {
  if (typeof window === 'undefined') return null;
  if (typeof dataUrl !== 'string' || !dataUrl.length) return null;

  // Historically this utility only accepted data: URLs, but the app also uses blob:
  // object URLs (and may use local/http paths for wallpapers). Support those too.
  // Note: cross-origin http(s) images may still fail due to CORS/tainted canvas.
  const src = dataUrl;
  const looksLikeImageUrl =
    src.startsWith('data:') ||
    src.startsWith('blob:') ||
    src.startsWith('/') ||
    /^https?:\/\//i.test(src);
  if (!looksLikeImageUrl) return null;

  const img = await loadImage(src);
  const canvas = document.createElement('canvas');

  // Downscale for speed, but keep enough fidelity for color picking.
  const maxDim = 220;
  const iw = img.naturalWidth || img.width || 0;
  const ih = img.naturalHeight || img.height || 0;
  if (!iw || !ih) return null;

  const scale = Math.min(1, maxDim / Math.max(iw, ih));
  canvas.width = Math.max(1, Math.round(iw * scale));
  canvas.height = Math.max(1, Math.round(ih * scale));

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Sample primarily from the center (to reduce UI chrome/borders bias), but also
  // include some edge content so accent colors near the bounds are not missed.
  const regions = [
    // center-heavy region
    {
      sx: Math.floor(canvas.width * 0.10),
      sy: Math.floor(canvas.height * 0.10),
      sw: Math.max(1, Math.floor(canvas.width * 0.80)),
      sh: Math.max(1, Math.floor(canvas.height * 0.80)),
      weight: 1.0,
    },
    // full image (lower weight)
    { sx: 0, sy: 0, sw: canvas.width, sh: canvas.height, weight: 0.45 },
  ];

  // Quantize (4 bits per channel) and build bucket averages.
  const buckets = new Map();
  for (const region of regions) {
    const { sx, sy, sw, sh, weight } = region;
    let imgData;
    try {
      imgData = ctx.getImageData(sx, sy, sw, sh);
    } catch {
      // Tainted canvas (CORS) or other readback failures.
      continue;
    }
    const { data, width, height } = imgData;
    const step = Math.max(1, Math.floor((width * height) / 12_000));

    for (let i = 0; i < data.length; i += 4 * step) {
      const a = data[i + 3];
      if (a < 128) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const qr = r >> 4;
      const qg = g >> 4;
      const qb = b >> 4;
      const key = (qr << 8) | (qg << 4) | qb;

      const prev = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0, sat: 0 };
      const maxc = Math.max(r, g, b);
      const minc = Math.min(r, g, b);
      const sat = maxc - minc;
      const w = Number.isFinite(weight) ? weight : 1;
      buckets.set(key, {
        n: prev.n + w,
        r: prev.r + r * w,
        g: prev.g + g * w,
        b: prev.b + b * w,
        sat: prev.sat + sat * w,
      });
    }
  }

  const scored = [...buckets.entries()]
    .map(([key, v]) => {
      const n = v.n || 1;
      const avg = { r: v.r / n, g: v.g / n, b: v.b / n };
      const sat = (v.sat / n) || 0;
      // Favor colors that are both frequent and not washed-out.
      // Also keep a saturation-forward score so we don't miss accent colors.
      const score = Math.pow(n, 0.72) * (1 + Math.min(2.6, sat / 36));
      const satScore = sat * Math.sqrt(n);
      const luma = 0.2126 * avg.r + 0.7152 * avg.g + 0.0722 * avg.b;
      return { key, score, satScore, sat, luma, n, rgb: avg };
    })
    .filter((x) => {
      // Drop near-neutral extremes (pure black/white) unless the image is very monotone.
      if (x.sat < 10 && (x.luma < 10 || x.luma > 245)) return false;
      return true;
    });

  // Aggregate global stats so we can detect monochrome images.
  const totals = { n: 0, r: 0, g: 0, b: 0, sat: 0, lumaMin: 255, lumaMax: 0 };
  for (const v of buckets.values()) {
    const n = v.n || 0;
    if (!n) continue;
    const r = v.r / n;
    const g = v.g / n;
    const b = v.b / n;
    const sat = (v.sat / n) || 0;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    totals.n += n;
    totals.r += r * n;
    totals.g += g * n;
    totals.b += b * n;
    totals.sat += sat * n;
    totals.lumaMin = Math.min(totals.lumaMin, luma);
    totals.lumaMax = Math.max(totals.lumaMax, luma);
  }
  const avgRgb = totals.n
    ? { r: totals.r / totals.n, g: totals.g / totals.n, b: totals.b / totals.n }
    : { r: 0, g: 0, b: 0 };
  const avgSat = totals.n ? (totals.sat / totals.n) : 0;
  const lumaRange = totals.n ? (totals.lumaMax - totals.lumaMin) : 0;
  const isMonochrome = totals.n ? (avgSat < 14 || lumaRange < 18) : false;

  const byFreq = [...scored].sort((a, b) => b.score - a.score).slice(0, 70);
  const bySat = [...scored].sort((a, b) => b.satScore - a.satScore).slice(0, 70);
  const merged = [];
  for (let i = 0; i < Math.max(byFreq.length, bySat.length); i++) {
    if (byFreq[i]) merged.push(byFreq[i]);
    if (bySat[i]) merged.push(bySat[i]);
    if (merged.length >= 120) break;
  }

  const rgbs = merged.map((x) => x.rgb);
  const distinct = pickDistinct(rgbs, Math.max(3, colorCount), 24 * 24);

  // Fallbacks if the image is too monotone.
  const fallback = [
    '#8B5CF6', // based purple
    '#EC4899', // pink
    '#22C55E', // green
    '#06B6D4', // cyan
    '#F59E0B', // amber
  ];

  const scaleRgb = (c, factor) => ({
    r: clamp(c.r * factor, 0, 255),
    g: clamp(c.g * factor, 0, 255),
    b: clamp(c.b * factor, 0, 255),
  });

  const buildMonochromePalette = () => {
    const luma = 0.2126 * avgRgb.r + 0.7152 * avgRgb.g + 0.0722 * avgRgb.b;
    const factors = luma > 200
      ? [0.85, 0.7, 0.55, 0.4, 0.25]
      : [0.6, 0.8, 1.0, 1.2, 1.4];
    return factors.map((f) => rgbToHex(scaleRgb(avgRgb, f).r, scaleRgb(avgRgb, f).g, scaleRgb(avgRgb, f).b));
  };

  let out = distinct.map((c) => rgbToHex(c.r, c.g, c.b));

  if (!out.length && totals.n) {
    out = buildMonochromePalette();
  }

  while (out.length < colorCount) {
    if (isMonochrome && totals.n) {
      const mono = buildMonochromePalette();
      out.push(mono[out.length % mono.length]);
    } else {
      out.push(fallback[out.length % fallback.length]);
    }
  }

  // Normalize to consistent hex case.
  const colors = out.slice(0, colorCount).map((h) => rgbToHex(hexToRgb(h)?.r ?? 0, hexToRgb(h)?.g ?? 0, hexToRgb(h)?.b ?? 0));

  if (!returnMeta) return colors;

  // Estimate weights by assigning each bucket to the nearest selected color.
  const weights = new Array(colors.length).fill(0);
  const selectedRgbs = colors.map((h) => hexToRgb(h)).filter(Boolean);
  for (const v of buckets.values()) {
    const n = v.n || 0;
    if (!n || !selectedRgbs.length) continue;
    const avg = { r: v.r / n, g: v.g / n, b: v.b / n };
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < selectedRgbs.length; i++) {
      const c = selectedRgbs[i];
      const d = dist2(avg, c);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    weights[bestIdx] += n;
  }

  const totalW = weights.reduce((sum, w) => sum + w, 0) || 1;
  const normWeights = weights.map((w) => w / totalW);
  return { colors, weights: normWeights, isMonochrome };
}
