import { createComponentLogger, debugConfig } from '@/utils/core/debugLogger';

const logger = createComponentLogger('imageBalance');

const shouldLogBalance = () => !!(debugConfig?.ENABLED && debugConfig?.LOG_BALANCE);

// Euclidean distance between RGB colors (0..441)
const colorDist = (p, q) => {
  const dr = p.r - q.r;
  const dg = p.g - q.g;
  const db = p.b - q.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
};

const clampInt = (n, lo, hi) => Math.max(lo, Math.min(hi, Math.round(n)));

const rgbToCss = (r, g, b) => `rgb(${clampInt(r, 0, 255)}, ${clampInt(g, 0, 255)}, ${clampInt(b, 0, 255)})`;

// Robust background estimation: sample edge pixels and take per-channel median.
function estimateBackgroundFromEdges(data, w, h, opts) {
  const edgeSize = clampInt(opts.edgeSize ?? 20, 1, Math.min(w, h));
  // Require fairly opaque pixels for background sampling — avoids shadow/fringe contamination.
  const alphaMinBg = clampInt(opts.alphaMinBg ?? 180, 0, 255);

  const rs = [];
  const gs = [];
  const bs = [];

  const push = (i) => {
    const a = data[i + 3];
    if (a < alphaMinBg) return;
    rs.push(data[i]);
    gs.push(data[i + 1]);
    bs.push(data[i + 2]);
  };

  // Sample strips: top, bottom, left, right.
  for (let y = 0; y < edgeSize; y++) {
    const row = y * w * 4;
    for (let x = 0; x < w; x++) push(row + x * 4);
  }
  for (let y = h - edgeSize; y < h; y++) {
    const row = y * w * 4;
    for (let x = 0; x < w; x++) push(row + x * 4);
  }
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let x = 0; x < edgeSize; x++) push(row + x * 4);
  }
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let x = w - edgeSize; x < w; x++) push(row + x * 4);
  }

  if (!rs.length) return { r: 224, g: 224, b: 224, sampled: 0, edgeSize, alphaMinBg, mad: 0 };

  const median = (arr) => {
    arr.sort((a, b) => a - b);
    return arr[Math.floor(arr.length / 2)] ?? 224;
  };

  const r = median(rs);
  const g = median(gs);
  const b = median(bs);
  const meanAbsDev = (arr, med) => {
    let sum = 0;
    for (let i = 0; i < arr.length; i++) sum += Math.abs(arr[i] - med);
    return arr.length ? (sum / arr.length) : 0;
  };
  const mad = Math.round((meanAbsDev(rs, r) + meanAbsDev(gs, g) + meanAbsDev(bs, b)) / 3);

  return {
    r,
    g,
    b,
    sampled: rs.length,
    edgeSize,
    alphaMinBg,
    mad,
  };
}

function estimateBackgroundCssFromImage(imageEl, opts = {}) {
  const iw = imageEl.naturalWidth;
  const ih = imageEl.naturalHeight;
  if (!iw || !ih) return '#e0e0e0';

  const maxDim = Math.max(128, Math.min(2048, opts.analysisMaxDim ?? 512));
  const ratio = Math.min(1, maxDim / Math.max(iw, ih));
  const sw = Math.max(1, Math.round(iw * ratio));
  const sh = Math.max(1, Math.round(ih * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(imageEl, 0, 0, sw, sh);
  const { data } = ctx.getImageData(0, 0, sw, sh);
  const bg = estimateBackgroundFromEdges(data, sw, sh, {
    edgeSize: opts.edgeSize,
    alphaMinBg: opts.alphaMinBg,
  });
  return rgbToCss(bg.r, bg.g, bg.b);
}

/**
 * Balance algorithm (Xnapper-style):
 * 1) Sample edge pixels to estimate background color.
 * 2) Threshold each pixel vs background (with alpha awareness) to classify.
 * 3) Use density-based row/column scanning — require a minimum % of pixels in a
 *    row/col to be "content" before declaring it non-background. This filters
 *    noise, compression artifacts, and shadow fringes.
 * 4) Find content bounds from all four edges.
 * 5) Add proportional padding (% of content dimension, capped) for a clean centered result.
 * 6) Safety: if margins are tiny (< 1% per side), skip cropping entirely.
 */
function detectBalancedCropRect(imageEl, opts) {
  const iw = imageEl.naturalWidth;
  const ih = imageEl.naturalHeight;
  const analysisMaxDim = Math.max(256, Math.min(3000, opts.analysisMaxDim ?? 1024));
  const ratio = Math.min(1, analysisMaxDim / Math.max(iw, ih));
  const sw = Math.max(1, Math.round(iw * ratio));
  const sh = Math.max(1, Math.round(ih * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(imageEl, 0, 0, sw, sh);
  const { data } = ctx.getImageData(0, 0, sw, sh);

  // Higher default threshold handles compression noise, gradients, anti-aliasing.
  const threshold = Math.max(1, Number.isFinite(opts.threshold) ? opts.threshold : (Number.isFinite(opts.tolerance) ? opts.tolerance : 12));
  // Shadows should count as content — use a very low alpha threshold so drop-shadows
  // and other semi-transparent elements are preserved in the balanced crop.
  const alphaMin = clampInt(opts.alphaMin ?? 8, 0, 255);
  // Minimum fraction of pixels in a row/col that must be "content" to count.
  const contentDensity = Math.max(0.003, Math.min(0.5, opts.contentDensity ?? 0.01));
  const minContentPixels = Math.max(1, Math.round(Number.isFinite(opts.minContentPixels) ? opts.minContentPixels : 6));

  // Background color from edges (unless explicitly provided)
  const bg = (opts.bg && typeof opts.bg.r === 'number')
    ? { r: clampInt(opts.bg.r, 0, 255), g: clampInt(opts.bg.g, 0, 255), b: clampInt(opts.bg.b, 0, 255), sampled: 0, mad: 0 }
    : estimateBackgroundFromEdges(data, sw, sh, { edgeSize: opts.edgeSize, alphaMinBg: opts.alphaMinBg });

  const minBgSamples = Math.max(0, Math.round(Number.isFinite(opts.minBgSamples) ? opts.minBgSamples : 200));
  const maxEdgeNoise = Math.max(0, Math.round(Number.isFinite(opts.maxEdgeNoise) ? opts.maxEdgeNoise : 22));
  const edgeNoise = Number.isFinite(bg.mad) ? bg.mad : 0;

  if (bg.sampled < minBgSamples || edgeNoise > maxEdgeNoise) {
    return {
      hasContent: true,
      bg,
      threshold,
      alphaMin,
      ratio,
      sw,
      sh,
      content: { left: 0, top: 0, right: sw - 1, bottom: sh - 1 },
      margins: { top: 0, left: 0, right: 0, bottom: 0 },
      uniformMargin: 0,
      crop: { x: 0, y: 0, w: iw, h: ih },
      skippedReason: bg.sampled < minBgSamples ? 'edge-samples-low' : 'edge-noise-high',
    };
  }

  const isContentAtIndex = (i) => {
    const a = data[i + 3];
    // Fully or mostly transparent → background (shadows, etc.)
    if (a <= alphaMin) return false;
    const p = { r: data[i], g: data[i + 1], b: data[i + 2] };
    return colorDist(p, bg) > threshold;
  };

  // Density-based row/col scanning — counts content pixels and requires a
  // minimum fraction to declare the row/col as containing real content.
  const minRowContent = Math.max(minContentPixels, Math.round(sw * contentDensity));
  const minColContent = Math.max(minContentPixels, Math.round(sh * contentDensity));
  const rowHasContent = (y) => {
    const row = y * sw * 4;
    let count = 0;
    for (let x = 0; x < sw; x++) {
      if (isContentAtIndex(row + x * 4)) count++;
    }
    return count >= minRowContent;
  };
  const colHasContent = (x) => {
    let count = 0;
    for (let y = 0; y < sh; y++) {
      if (isContentAtIndex((y * sw + x) * 4)) count++;
    }
    return count >= minColContent;
  };

  let top = 0;
  while (top < sh && !rowHasContent(top)) top++;
  let bottom = sh - 1;
  while (bottom >= 0 && !rowHasContent(bottom)) bottom--;
  let left = 0;
  while (left < sw && !colHasContent(left)) left++;
  let right = sw - 1;
  while (right >= 0 && !colHasContent(right)) right--;

  const hasContent = left <= right && top <= bottom;
  if (!hasContent) {
    if (shouldLogBalance()) {
      logger.balance('detect:noContent', { iw, ih, sw, sh, ratio, threshold, alphaMin, bg });
    }
    return {
      hasContent: false,
      bg,
      threshold,
      alphaMin,
      ratio,
      sw,
      sh,
      crop: { x: 0, y: 0, w: iw, h: ih },
      content: { left: 0, top: 0, right: sw - 1, bottom: sh - 1 },
      uniformMargin: 0,
      margins: { top: 0, left: 0, right: 0, bottom: 0 },
    };
  }

  const margins = {
    top,
    left,
    right: (sw - 1) - right,
    bottom: (sh - 1) - bottom,
  };

  // If any edge margin is too small, balanced whitespace is not possible.
  // In that case, skip cropping to avoid over-aggressive trims.
  const minDim = Math.min(sw, sh);
  const minMarginFraction = Number.isFinite(opts.minMarginFraction) ? opts.minMarginFraction : 0.01;
  const minMarginThreshold = Math.max(3, Math.round(minDim * minMarginFraction));
  const minMargin = Math.min(margins.top, margins.left, margins.right, margins.bottom);
  if (minMargin < minMarginThreshold) {
    return {
      hasContent: true,
      bg,
      threshold,
      alphaMin,
      ratio,
      sw,
      sh,
      content: { left, top, right, bottom },
      margins,
      uniformMargin: 0,
      crop: { x: 0, y: 0, w: iw, h: ih },
      skippedReason: 'edge-content',
    };
  }

  const cropLeft = Math.max(0, left - minMargin);
  const cropTop = Math.max(0, top - minMargin);
  const cropRight = Math.min(sw - 1, right + minMargin);
  const cropBottom = Math.min(sh - 1, bottom + minMargin);

  const uniformMargin = minMargin;

  // Map back to original using inclusive->exclusive mapping.
  const x = Math.max(0, Math.floor(cropLeft / ratio));
  const y = Math.max(0, Math.floor(cropTop / ratio));
  const x2 = Math.min(iw, Math.ceil((cropRight + 1) / ratio));
  const y2 = Math.min(ih, Math.ceil((cropBottom + 1) / ratio));
  const w = Math.max(1, x2 - x);
  const h = Math.max(1, y2 - y);

  const result = {
    hasContent: true,
    bg,
    threshold,
    alphaMin,
    ratio,
    sw,
    sh,
    content: { left, top, right, bottom },
    margins,
    uniformMargin,
    crop: { x, y, w, h },
  };

  if (shouldLogBalance()) {
    logger.balance('detect:result', result);
  }

  return result;
}

// Main balance function: trim longer whitespace to match shorter, keep content centered. No external libs.
const computeBalancedCanvas = async (imageEl, options = {}) => {
  if (!imageEl.complete || !imageEl.naturalWidth) {
    await new Promise((resolve) => { imageEl.onload = resolve; });
  }
  const iw = imageEl.naturalWidth;
  const ih = imageEl.naturalHeight;
  if (!iw || !ih) {
    return {
      canvas: null,
      dimensions: { width: iw || 0, height: ih || 0, x: 0, y: 0, originalWidth: iw || 0, originalHeight: ih || 0 },
    };
  }

  if (shouldLogBalance()) {
    logger.balance('compute:start', {
      src: imageEl?.currentSrc || imageEl?.src,
      iw,
      ih,
      options: {
        analysisMaxDim: options.analysisMaxDim,
        threshold: options.threshold,
        tolerance: options.tolerance,
        alphaMin: options.alphaMin,
        edgeSize: options.edgeSize,
        alphaMinBg: options.alphaMinBg,
        bg: options.bg,
      },
    });
  }

  const detection = detectBalancedCropRect(imageEl, options);
  const { x, y, w: cropW, h: cropH } = detection.crop;

  // Render crop (and optional debug overlay)
  const out = document.createElement('canvas');
  out.width = cropW; out.height = cropH;
  const octx = out.getContext('2d');
  octx.drawImage(imageEl, x, y, cropW, cropH, 0, 0, cropW, cropH);

  return {
    canvas: out,
    dimensions: { width: cropW, height: cropH, x, y, originalWidth: iw, originalHeight: ih }
  };
};

const canvasToBlob = (canvas, type = 'image/png', quality = 1.0) =>
  new Promise((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), type, quality);
    } catch {
      resolve(null);
    }
  });

// Main balance function: returns a data URL.
// Note: data URLs can be extremely large for high-res screenshots; prefer balanceImageToObjectUrl in the UI.
export const balanceImage = async (imageEl, options = {}) => {
  const { canvas, dimensions } = await computeBalancedCanvas(imageEl, options);
  if (!canvas) {
    return { dataUrl: imageEl?.src, dimensions };
  }
  return {
    dataUrl: canvas.toDataURL('image/png'),
    dimensions,
  };
};

// Preferred for UI: returns a blob: object URL (much cheaper than base64 for large images).
export const balanceImageToObjectUrl = async (imageEl, options = {}) => {
  const { canvas, dimensions } = await computeBalancedCanvas(imageEl, options);
  if (!canvas) {
    return { objectUrl: null, revokeUrl: null, dimensions };
  }
  const blob = await canvasToBlob(canvas, 'image/png', 1.0);
  if (!blob) {
    // Fallback: still provide something if toBlob fails.
    try {
      const dataUrl = canvas.toDataURL('image/png');
      return { objectUrl: dataUrl, revokeUrl: null, dimensions };
    } catch {
      return { objectUrl: null, revokeUrl: null, dimensions };
    }
  }
  const objectUrl = URL.createObjectURL(blob);
  return { objectUrl, revokeUrl: objectUrl, dimensions };
};

/**
 * Creates a rebalanced image with optional padding around the salient crop.
 */
export const createBalancedImage = async (imageEl, padding = 0, options = {}) => {
  const { dataUrl, dimensions } = await balanceImage(imageEl, options);
  if (!padding) return dataUrl;

  const paddedCanvas = document.createElement('canvas');
  const ctx = paddedCanvas.getContext('2d');
  if (!ctx) throw new Error('Canvas rendering context not available');

  paddedCanvas.width = (dimensions?.width || 0) + (padding * 2);
  paddedCanvas.height = (dimensions?.height || 0) + (padding * 2);

  let bgColor = '#e0e0e0';
  try {
    bgColor = estimateBackgroundCssFromImage(imageEl, {
      analysisMaxDim: options?.analysisMaxDim,
      edgeSize: options?.edgeSize,
      alphaMinBg: options?.alphaMinBg,
    });
  } catch (_) {}
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, paddedCanvas.width, paddedCanvas.height);

  const balancedImage = new Image();
  balancedImage.decoding = 'async';
  balancedImage.src = dataUrl;
  await new Promise((resolve) => { balancedImage.onload = resolve; });
  ctx.drawImage(balancedImage, padding, padding);
  return paddedCanvas.toDataURL('image/png');
};
