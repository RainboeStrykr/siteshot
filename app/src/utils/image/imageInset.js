import { FastAverageColor } from 'fast-average-color';
import { clamp } from '../core/math';
import { rgbToHex } from '../color/color';

// Initialize the fast average color analyzer
const fac = new FastAverageColor();

/**
 * Gets the dominant edge color from an image
 * @param {HTMLImageElement} imageEl - The source image
 * @param {Object} options - Options for color detection
 * @param {number} options.edgeSize - Size of edge to sample (default: 20px)
 * @param {boolean} options.alpha - Include alpha channel (default: true)
 * @returns {string} Hex or rgba color string
 */
export const getEdgeColor = async (imageEl, options = {}) => {
  const edgeSize = options.edgeSize || 20;
  const includeAlpha = options.alpha !== false;
  const minAlpha = typeof options.minAlpha === 'number' ? options.minAlpha : 16;

  try {
    // Ensure image is ready
    if (!imageEl.complete || !imageEl.naturalWidth) {
      await new Promise(res => { imageEl.onload = res; });
    }

    const iw = imageEl.naturalWidth;
    const ih = imageEl.naturalHeight;
    if (!iw || !ih) return '#e0e0e0';

    // Downscale to speed up sampling
    const maxDim = 1024;
    const scale = Math.min(1, maxDim / Math.max(iw, ih));
    const w = Math.max(1, Math.round(iw * scale));
    const h = Math.max(1, Math.round(ih * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(imageEl, 0, 0, w, h);

    const e = Math.max(1, Math.round(edgeSize * scale));

    // Get edge strips
    const top = ctx.getImageData(0, 0, w, e).data;
    const bottom = ctx.getImageData(0, h - e, w, e).data;
    const left = ctx.getImageData(0, 0, e, h).data;
    const right = ctx.getImageData(w - e, 0, e, h).data;

    // Average all edge pixels.
    // Important: many PNG screenshots have transparent padding/shadows.
    // If we naively include fully-transparent pixels, the average drifts toward black/transparent.
    let r = 0, g = 0, b = 0, a = 0;
    let weight = 0;
    const accumulate = (data) => {
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha < minAlpha) continue;
        const wgt = alpha / 255;
        r += data[i] * wgt;
        g += data[i + 1] * wgt;
        b += data[i + 2] * wgt;
        a += alpha;
        weight += wgt;
      }
    };
    accumulate(top); accumulate(bottom); accumulate(left); accumulate(right);

    if (!weight) return '#e0e0e0';
    r /= weight; g /= weight; b /= weight;
    const avgAlpha = Math.round((a / (weight * 255)) * 100) / 100;

    if (includeAlpha) return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${isNaN(avgAlpha) ? 1 : avgAlpha})`;
    return rgbToHex(r, g, b);
  } catch (error) {
    console.error('Error detecting edge color:', error);
    // Fallback to fast-average-color on full image if available
    try {
      const color = await fac.getColorAsync(imageEl, { algorithm: 'dominant', mode: 'precision' });
      return includeAlpha ? color.rgba : color.hex;
    } catch (_) {
      return '#e0e0e0';
    }
  }
};

/**
 * Sample multiple colors along the edges of an image.
 * Returns a palette object with per-edge arrays of hex colors.
 *
 * NOTE: This function uses Canvas and must run in the browser.
 *
 * @param {HTMLImageElement} imageEl
 * @param {Object} options
 * @param {number} options.samples - Number of samples per edge (default: 24)
 * @param {number} options.edgeSize - Thickness (in px) to sample from the edge (default: 20)
 * @param {number} options.minAlpha - Ignore pixels with alpha below this threshold (0-255) (default: 16)
 * @returns {Promise<{top: string[], right: string[], bottom: string[], left: string[]}>}
 */
export const getEdgePalette = async (imageEl, options = {}) => {
  const samples = Math.max(1, Math.round(Number(options.samples) || 24));
  const edgeSize = Math.max(1, Math.round(Number(options.edgeSize) || 20));
  const minAlpha = typeof options.minAlpha === 'number' ? options.minAlpha : 16;

  // Fail-safe: return a neutral palette.
  const fallback = { top: ['#e0e0e0'], right: ['#e0e0e0'], bottom: ['#e0e0e0'], left: ['#e0e0e0'] };

  try {
    if (!imageEl || typeof document === 'undefined') return fallback;

    if (!imageEl.complete || !imageEl.naturalWidth) {
      await new Promise((res) => {
        imageEl.onload = res;
      });
    }

    const iw = imageEl.naturalWidth;
    const ih = imageEl.naturalHeight;
    if (!iw || !ih) return fallback;

    const maxDim = 1024;
    const scale = Math.min(1, maxDim / Math.max(iw, ih));
    const w = Math.max(1, Math.round(iw * scale));
    const h = Math.max(1, Math.round(ih * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(imageEl, 0, 0, w, h);

    const e = Math.max(1, Math.round(edgeSize * scale));
    const { data } = ctx.getImageData(0, 0, w, h);

    const sampleRegionHex = (x0, y0, rw, rh) => {
      let r = 0;
      let g = 0;
      let b = 0;
      let weight = 0;

      const x1 = clamp(x0 + rw, 0, w);
      const y1 = clamp(y0 + rh, 0, h);
      const startX = clamp(x0, 0, w - 1);
      const startY = clamp(y0, 0, h - 1);

      for (let yy = startY; yy < y1; yy += 1) {
        let idx = (yy * w + startX) * 4;
        for (let xx = startX; xx < x1; xx += 1) {
          const a = data[idx + 3];
          if (a >= minAlpha) {
            const wgt = a / 255;
            r += data[idx] * wgt;
            g += data[idx + 1] * wgt;
            b += data[idx + 2] * wgt;
            weight += wgt;
          }
          idx += 4;
        }
      }

      if (!weight) return null;
      return rgbToHex(r / weight, g / weight, b / weight);
    };

    const sampleStops = (n, length) => {
      if (n <= 1) return [Math.floor(length / 2)];
      const out = [];
      for (let i = 0; i < n; i += 1) out.push(Math.round((i * (length - 1)) / (n - 1)));
      return out;
    };

    const topXs = sampleStops(samples, w);
    const leftYs = sampleStops(samples, h);

    const top = [];
    const bottom = [];
    const left = [];
    const right = [];

    for (let i = 0; i < samples; i += 1) {
      const x = topXs[i] ?? 0;
      const y = leftYs[i] ?? 0;

      // For top/bottom: sample e x e region at the edge.
      const topX0 = clamp(x - Math.floor(e / 2), 0, Math.max(0, w - e));
      const leftY0 = clamp(y - Math.floor(e / 2), 0, Math.max(0, h - e));

      const t = sampleRegionHex(topX0, 0, e, e);
      const btm = sampleRegionHex(topX0, Math.max(0, h - e), e, e);
      const l = sampleRegionHex(0, leftY0, e, e);
      const rgt = sampleRegionHex(Math.max(0, w - e), leftY0, e, e);

      // Keep output stable: if a sample is fully transparent, reuse the last valid sample.
      top.push(t || top[top.length - 1] || '#e0e0e0');
      bottom.push(btm || bottom[bottom.length - 1] || '#e0e0e0');
      left.push(l || left[left.length - 1] || '#e0e0e0');
      right.push(rgt || right[right.length - 1] || '#e0e0e0');
    }

    return { top, right, bottom, left };
  } catch (error) {
    console.error('Error detecting edge palette:', error);
    return fallback;
  }
};

/**
 * Convert an edge palette into CSS linear-gradients suitable for use as background layers.
 *
 * @param {{top?: string[], right?: string[], bottom?: string[], left?: string[]}} palette
 * @returns {{top: string, right: string, bottom: string, left: string}}
 */
export const edgePaletteToGradients = (palette = {}) => {
  const safe = (arr) => (Array.isArray(arr) && arr.length ? arr : ['#e0e0e0']);

  const stops = (colors) => {
    const c = safe(colors);
    const denom = Math.max(1, c.length - 1);
    return c.map((col, i) => `${col} ${(i / denom) * 100}%`).join(', ');
  };

  return {
    top: `linear-gradient(90deg, ${stops(palette.top)})`,
    right: `linear-gradient(180deg, ${stops(palette.right)})`,
    bottom: `linear-gradient(90deg, ${stops(palette.bottom)})`,
    left: `linear-gradient(180deg, ${stops(palette.left)})`,
  };
};

/**
 * Create an inset version of the image with proper background color
 * @param {HTMLImageElement} imageEl - Source image element
 * @param {Object} options - Configuration options 
 * @param {number} options.padding - Size of background padding in pixels (default: 80)
 * @param {string} options.color - Custom background color (optional)
 * @param {boolean} options.blur - Add blur effect (default: false)
 * @param {number} options.blurAmount - Blur intensity (default: 20)
 * @returns {string} Data URL of the generated image
 */
export const createInsetImage = async (imageEl, options = {}) => {
  // Default options
  const padding = options.padding || 80;
  const blur = options.blur === true;
  const blurAmount = options.blurAmount || 20;
  
  // Create canvas with padding dimensions
  const canvas = document.createElement('canvas');
  canvas.width = imageEl.naturalWidth + (padding * 2);
  canvas.height = imageEl.naturalHeight + (padding * 2);
  
  const ctx = canvas.getContext('2d');
  
  // Determine background color - use provided color or detect from edges.
  // For inset fills we prefer an opaque color (alpha-free) so transparent PNG edges
  // don't produce a fully-transparent background.
  const bgColor = options.color || await getEdgeColor(imageEl, { alpha: false });
  
  // Fill background with the detected/provided color
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Optional blur effect for more aesthetically pleasing background
  if (blur) {
    // First create a smaller version of the image for the blurred background
    const blurCanvas = document.createElement('canvas');
    const blurCtx = blurCanvas.getContext('2d');
    
    const scaleFactor = 0.3; // Scale down for performance
    blurCanvas.width = imageEl.naturalWidth * scaleFactor;
    blurCanvas.height = imageEl.naturalHeight * scaleFactor;
    
    // Draw the image at reduced size
    blurCtx.drawImage(imageEl, 0, 0, blurCanvas.width, blurCanvas.height);
    
    // Apply blur filter
    blurCtx.filter = `blur(${blurAmount}px)`;
    blurCtx.drawImage(blurCanvas, 0, 0, blurCanvas.width, blurCanvas.height);
    
    // Draw the blurred background, stretched to fill the padding area
    ctx.drawImage(
      blurCanvas, 
      0, 0, blurCanvas.width, blurCanvas.height,
      0, 0, canvas.width, canvas.height
    );
  }
  
  // Draw original image centered
  ctx.drawImage(imageEl, padding, padding);
  
  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height
  };
};