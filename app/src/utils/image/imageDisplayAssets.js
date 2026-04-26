const rgbaToHex = (r = 0, g = 0, b = 0) => {
  const toHex = (value) => Math.max(0, Math.min(255, Number(value) || 0)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const sampleCanvasEdgePalette = (canvas, { samples = 24, edgeSize = 16 } = {}) => {
  const fallback = {
    top: ['#3a3a3a'],
    right: ['#3a3a3a'],
    bottom: ['#3a3a3a'],
    left: ['#3a3a3a'],
  };
  try {
    if (!canvas) return fallback;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return fallback;

    const width = Math.max(1, Math.floor(canvas.width || 0));
    const height = Math.max(1, Math.floor(canvas.height || 0));
    if (width < 2 || height < 2) return fallback;

    const edge = Math.max(1, Math.min(edgeSize, Math.floor(Math.min(width, height) / 3)));
    const top = [];
    const right = [];
    const bottom = [];
    const left = [];

    const sampleRegionHex = (x0, y0, regionWidth, regionHeight) => {
      try {
        const x = Math.max(0, Math.min(width - 1, Math.floor(x0)));
        const y = Math.max(0, Math.min(height - 1, Math.floor(y0)));
        const sampleWidth = Math.max(1, Math.min(width - x, Math.floor(regionWidth)));
        const sampleHeight = Math.max(1, Math.min(height - y, Math.floor(regionHeight)));
        const data = ctx.getImageData(x, y, sampleWidth, sampleHeight).data;
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let sumA = 0;
        for (let index = 0; index < data.length; index += 4) {
          const alpha = data[index + 3] / 255;
          sumR += data[index] * alpha;
          sumG += data[index + 1] * alpha;
          sumB += data[index + 2] * alpha;
          sumA += alpha;
        }
        if (sumA <= 0.0001) return null;
        return rgbaToHex(sumR / sumA, sumG / sumA, sumB / sumA);
      } catch {
        return null;
      }
    };

    for (let index = 0; index < samples; index += 1) {
      const tx = Math.round((index / Math.max(1, samples - 1)) * (width - 1));
      const ty = Math.round((index / Math.max(1, samples - 1)) * (height - 1));

      const topColor = sampleRegionHex(Math.max(0, tx - Math.floor(edge / 2)), 0, edge, edge);
      const bottomColor = sampleRegionHex(Math.max(0, tx - Math.floor(edge / 2)), Math.max(0, height - edge), edge, edge);
      const leftColor = sampleRegionHex(0, Math.max(0, ty - Math.floor(edge / 2)), edge, edge);
      const rightColor = sampleRegionHex(Math.max(0, width - edge), Math.max(0, ty - Math.floor(edge / 2)), edge, edge);

      top.push(topColor || top[top.length - 1] || '#3a3a3a');
      bottom.push(bottomColor || bottom[bottom.length - 1] || '#3a3a3a');
      left.push(leftColor || left[left.length - 1] || '#3a3a3a');
      right.push(rightColor || right[right.length - 1] || '#3a3a3a');
    }

    return { top, right, bottom, left };
  } catch {
    return fallback;
  }
};

export const loadSafeImage = async (src) => {
  return new Promise(async (resolve, reject) => {
    try {
      const normalizeSrc = (value) => {
        if (!value || typeof value !== 'string') return value;
        if (/^(data:|blob:)/i.test(value)) return value;

        let normalized = value;
        for (let index = 0; index < 3; index += 1) {
          const next = normalized.replace(/%25([0-9a-fA-F]{2})/g, '%$1');
          if (next === normalized) break;
          normalized = next;
        }

        return normalized.includes(' ') ? normalized.replace(/ /g, '%20') : normalized;
      };

      const rawSrc = typeof src === 'string' ? src : '';
      const normalizedRawSrc = normalizeSrc(rawSrc) || rawSrc;
      const isHttp = /^https?:\/\//i.test(normalizedRawSrc);
      const schemeMatch = rawSrc.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
      const scheme = schemeMatch ? schemeMatch[1].toLowerCase() : null;
      const shouldFetchFirst = isHttp || scheme === 'tauri' || scheme === 'asset' || scheme === 'app';

      let useSrc = normalizeSrc(src);
      let revokeUrl = null;

      if (shouldFetchFirst) {
        try {
          const response = isHttp
            ? await fetch(normalizedRawSrc, { mode: 'cors', credentials: 'omit' }).catch(() => null)
            : await fetch(normalizedRawSrc).catch(() => null);
          if (response && response.ok) {
            const blob = await response.blob();
            useSrc = URL.createObjectURL(blob);
            revokeUrl = useSrc;
          }
        } catch {
          useSrc = normalizedRawSrc;
        }
      }

      const img = new Image();
      img.decoding = 'async';
      if (isHttp && !revokeUrl) {
        img.crossOrigin = 'anonymous';
      }

      let triedFetchFallback = false;

      img.onload = () => resolve({ img, revokeUrl });
      img.onerror = async (error) => {
        const canFetchFallback = !triedFetchFallback && !isHttp && !!rawSrc && (scheme === 'tauri' || scheme === 'asset' || scheme === 'app');
        if (!canFetchFallback || typeof fetch !== 'function') {
          reject(error);
          return;
        }

        triedFetchFallback = true;
        try {
          const response = await fetch(normalizedRawSrc).catch(() => null);
          if (!response || !response.ok) throw error;
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          revokeUrl = blobUrl;
          img.src = blobUrl;
        } catch (err) {
          reject(err);
        }
      };

      img.src = useSrc;
    } catch (error) {
      reject(error);
    }
  });
};