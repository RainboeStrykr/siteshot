import { clamp } from '../core/math';
import { hexToRgb, mulberry32, parseCssColorCached, toCanvasRgba } from '../color/color';

const parseAngleToUnitVector = (angleDeg) => {
	const rad = (Number(angleDeg) || 0) * (Math.PI / 180);
	const x = Math.cos(rad);
	const y = Math.sin(rad);
	// Normalize defensively
	const len = Math.hypot(x, y) || 1;
	return { x: x / len, y: y / len };
};

const getCoverRect = (srcW, srcH, dstW, dstH) => {
	if (!srcW || !srcH || !dstW || !dstH) {
		return { x: 0, y: 0, w: dstW, h: dstH };
	}
	const srcRatio = srcW / srcH;
	const dstRatio = dstW / dstH;

	let drawW = dstW;
	let drawH = dstH;
	if (srcRatio > dstRatio) {
		// source is wider -> fit height, crop sides
		drawH = dstH;
		drawW = dstH * srcRatio;
	} else {
		// source is taller -> fit width, crop top/bottom
		drawW = dstW;
		drawH = dstW / srcRatio;
	}
	return {
		x: (dstW - drawW) / 2,
		y: (dstH - drawH) / 2,
		w: drawW,
		h: drawH,
	};
};

const inflateRect = (rect, padPx) => {
	const pad = Math.max(0, Number(padPx) || 0);
	if (!pad) return rect;
	return {
		x: rect.x - pad / 2,
		y: rect.y - pad / 2,
		w: rect.w + pad,
		h: rect.h + pad,
	};
};

const makeCanvas = (w, h) => {
	// Prefer DOM canvas when available.
	// In some WebKit/Tauri contexts, OffscreenCanvas exists but can behave differently
	// (e.g. drawImage interop issues), which can lead to transparent results.
	if (typeof document !== 'undefined' && document?.createElement) {
		const c = document.createElement('canvas');
		c.width = w;
		c.height = h;
		return c;
	}
	if (typeof OffscreenCanvas !== 'undefined') {
		return new OffscreenCanvas(w, h);
	}
	throw new Error('No canvas implementation available');
};

// Cache expensive computations across repeated slider updates.
// WeakMap keeps memory bounded by GC when canvases are dropped.
const fxCacheByBaseCanvas = new WeakMap();
const gaussBoxesCache = new Map();

const boxesForGauss = (sigma, n) => {
	// https://www.peterkovesi.com/matlabfns/#blur
	// Gaussian blur approximation using n box blurs.
	const s0 = Math.max(0, Number(sigma) || 0);
	// Quantize sigma slightly to increase cache hits while remaining visually stable.
	const s = Math.round(s0 * 64) / 64;
	const cacheKey = `${s}|${n}`;
	const cached = gaussBoxesCache.get(cacheKey);
	if (cached) return cached;
	if (!s) return Array.from({ length: n }, () => 1);
	const wIdeal = Math.sqrt((12 * s * s / n) + 1);
	let wl = Math.floor(wIdeal);
	if (wl % 2 === 0) wl--;
	const wu = wl + 2;
	const mIdeal = (12 * s * s - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4);
	const m = Math.round(mIdeal);
	const sizes = [];
	for (let i = 0; i < n; i++) sizes.push(i < m ? wl : wu);
	gaussBoxesCache.set(cacheKey, sizes);
	// Avoid unbounded growth.
	if (gaussBoxesCache.size > 256) {
		try {
			const firstKey = gaussBoxesCache.keys().next().value;
			gaussBoxesCache.delete(firstKey);
		} catch {}
	}
	return sizes;
};

const boxBlurH = (src, dst, w, h, r) => {
	const iarr = 1 / (r + r + 1);
	for (let y = 0; y < h; y++) {
		let ti = y * w * 4;
		let li = ti;
		let ri = ti + r * 4;
		const fvR = src[ti];
		const fvG = src[ti + 1];
		const fvB = src[ti + 2];
		const fvA = src[ti + 3];
		const lvIndex = ti + (w - 1) * 4;
		const lvR = src[lvIndex];
		const lvG = src[lvIndex + 1];
		const lvB = src[lvIndex + 2];
		const lvA = src[lvIndex + 3];

		let valR = (r + 1) * fvR;
		let valG = (r + 1) * fvG;
		let valB = (r + 1) * fvB;
		let valA = (r + 1) * fvA;
		for (let j = 0; j < r; j++) {
			const idx = ti + j * 4;
			valR += src[idx];
			valG += src[idx + 1];
			valB += src[idx + 2];
			valA += src[idx + 3];
		}

		for (let x = 0; x < w; x++) {
			// add right
			const addIndex = ri;
			const addR = (x + r < w) ? src[addIndex] : lvR;
			const addG = (x + r < w) ? src[addIndex + 1] : lvG;
			const addB = (x + r < w) ? src[addIndex + 2] : lvB;
			const addA = (x + r < w) ? src[addIndex + 3] : lvA;

			// remove left
			const subIndex = li;
			const subR = (x - r >= 0) ? src[subIndex] : fvR;
			const subG = (x - r >= 0) ? src[subIndex + 1] : fvG;
			const subB = (x - r >= 0) ? src[subIndex + 2] : fvB;
			const subA = (x - r >= 0) ? src[subIndex + 3] : fvA;

			valR += addR - subR;
			valG += addG - subG;
			valB += addB - subB;
			valA += addA - subA;

			dst[ti] = Math.round(valR * iarr);
			dst[ti + 1] = Math.round(valG * iarr);
			dst[ti + 2] = Math.round(valB * iarr);
			dst[ti + 3] = Math.round(valA * iarr);

			ti += 4;
			if (x + r < w - 1) ri += 4;
			if (x - r >= 0) li += 4;
		}
	}
};

const boxBlurV = (src, dst, w, h, r) => {
	const iarr = 1 / (r + r + 1);
	for (let x = 0; x < w; x++) {
		let ti = x * 4;
		let li = ti;
		let ri = ti + r * w * 4;
		const fvR = src[ti];
		const fvG = src[ti + 1];
		const fvB = src[ti + 2];
		const fvA = src[ti + 3];
		const lvIndex = (x + (w * (h - 1))) * 4;
		const lvR = src[lvIndex];
		const lvG = src[lvIndex + 1];
		const lvB = src[lvIndex + 2];
		const lvA = src[lvIndex + 3];

		let valR = (r + 1) * fvR;
		let valG = (r + 1) * fvG;
		let valB = (r + 1) * fvB;
		let valA = (r + 1) * fvA;
		for (let j = 0; j < r; j++) {
			const idx = x * 4 + j * w * 4;
			valR += src[idx];
			valG += src[idx + 1];
			valB += src[idx + 2];
			valA += src[idx + 3];
		}

		for (let y = 0; y < h; y++) {
			const addIndex = ri;
			const addR = (y + r < h) ? src[addIndex] : lvR;
			const addG = (y + r < h) ? src[addIndex + 1] : lvG;
			const addB = (y + r < h) ? src[addIndex + 2] : lvB;
			const addA = (y + r < h) ? src[addIndex + 3] : lvA;

			const subIndex = li;
			const subR = (y - r >= 0) ? src[subIndex] : fvR;
			const subG = (y - r >= 0) ? src[subIndex + 1] : fvG;
			const subB = (y - r >= 0) ? src[subIndex + 2] : fvB;
			const subA = (y - r >= 0) ? src[subIndex + 3] : fvA;

			valR += addR - subR;
			valG += addG - subG;
			valB += addB - subB;
			valA += addA - subA;

			dst[ti] = Math.round(valR * iarr);
			dst[ti + 1] = Math.round(valG * iarr);
			dst[ti + 2] = Math.round(valB * iarr);
			dst[ti + 3] = Math.round(valA * iarr);

			ti += w * 4;
			if (y + r < h - 1) ri += w * 4;
			if (y - r >= 0) li += w * 4;
		}
	}
};

const gaussianApproxBlurInPlace = (data, w, h, sigma, tmpBuffer = null) => {
	const s = Math.max(0, Number(sigma) || 0);
	if (!s) return;
	const sizes = boxesForGauss(s, 3);
	const tmp = (tmpBuffer && tmpBuffer.length === data.length) ? tmpBuffer : new Uint8ClampedArray(data.length);
	for (const size of sizes) {
		const r = Math.max(0, ((size - 1) / 2) | 0);
		if (!r) continue;
		boxBlurH(data, tmp, w, h, r);
		boxBlurV(tmp, data, w, h, r);
	}
};

const getFxScratch = (baseCanvas) => {
	const existing = fxCacheByBaseCanvas.get(baseCanvas);
	if (existing) return existing;
	const next = {
		// Downsample/blur scratch
		tmpCanvas: null,
		tctx: null,
		tmpBuf: null,
		// Full-size blurred cache
		blurredCanvas: null,
		blurredCtx: null,
		blurKey: null,
	};
	fxCacheByBaseCanvas.set(baseCanvas, next);
	return next;
};

const drawWithGaussianBlur = (ctx, srcCanvas, dstW, dstH, sigmaPx, scratch = null, quality = 'final') => {
	const sigma = Math.max(0, Number(sigmaPx) || 0);
	if (!sigma) {
		ctx.drawImage(srcCanvas, 0, 0, dstW, dstH);
		return;
	}

	// Performance: blur on a reduced-resolution buffer, then upscale.
	// Keep enough resolution so the blur still looks smooth.
	let factor = clamp(1 / (1 + sigma / 10), 0.12, 1);
	let bw = Math.max(1, Math.round(dstW * factor));
	let bh = Math.max(1, Math.round(dstH * factor));
	// Hard cap to avoid huge getImageData() costs on large canvases.
	// Interactive mode is tuned for slider drags (lower-res preview).
	const maxDim = (quality === 'interactive') ? 650 : 900;
	if (bw > maxDim || bh > maxDim) {
		const s = Math.min(maxDim / bw, maxDim / bh);
		bw = Math.max(1, Math.round(bw * s));
		bh = Math.max(1, Math.round(bh * s));
		factor = Math.max(0.05, factor * s);
	}
	const blurSigma = sigma * factor;

	const s = scratch || { tmpCanvas: null, tctx: null, tmpBuf: null };
	if (!s.tmpCanvas || s.tmpCanvas.width !== bw || s.tmpCanvas.height !== bh) {
		s.tmpCanvas = makeCanvas(bw, bh);
	}
	const tctx = s.tctx || s.tmpCanvas.getContext('2d', { willReadFrequently: true });
	s.tctx = tctx;
	if (!tctx) {
		ctx.drawImage(srcCanvas, 0, 0, dstW, dstH);
		return;
	}

	tctx.setTransform(1, 0, 0, 1, 0, 0);
	tctx.clearRect(0, 0, bw, bh);
	tctx.imageSmoothingEnabled = true;
	tctx.imageSmoothingQuality = 'high';
	tctx.drawImage(srcCanvas, 0, 0, dstW, dstH, 0, 0, bw, bh);

	try {
		const img = tctx.getImageData(0, 0, bw, bh);
		s.tmpBuf = (s.tmpBuf && s.tmpBuf.length === img.data.length) ? s.tmpBuf : new Uint8ClampedArray(img.data.length);
		gaussianApproxBlurInPlace(img.data, bw, bh, blurSigma, s.tmpBuf);
		tctx.putImageData(img, 0, 0);
	} catch {
		// If getImageData fails for any reason, fall back to unblurred.
	}

	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage(s.tmpCanvas, 0, 0, bw, bh, 0, 0, dstW, dstH);
};

export function applyBackgroundFxToCanvas({
	outCanvas,
	baseCanvas,
	blurPx = 0,
	brightness = 1,
	quality = 'final',
}) {
	if (!outCanvas || !baseCanvas) throw new Error('Missing outCanvas/baseCanvas');
	const w = baseCanvas.width || 1;
	const h = baseCanvas.height || 1;
	if (outCanvas.width !== w) outCanvas.width = w;
	if (outCanvas.height !== h) outCanvas.height = h;
	const ctx = outCanvas.getContext('2d');
	if (!ctx) throw new Error('Failed to get 2D context');

	const blur = clamp(Number(blurPx) || 0, 0, 200);
	const bright = Number.isFinite(Number(brightness)) ? Number(brightness) : 1;

	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.clearRect(0, 0, w, h);

	const shouldAvoidCanvasFilter = (() => {
		// In WKWebView (notably Tauri on macOS), `ctx.filter = 'blur(...)'` may exist
		// but render with no visible effect. Prefer the gaussian blur path there.
		if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
		const ua = String(navigator.userAgent || '');
		const isWebKit = /AppleWebKit\//.test(ua) && !/Chrome\//.test(ua);
		const isTauriShell = !!window.tauriAPI || !!window.__TAURI__;
		return isTauriShell || isWebKit;
	})();

	if (!blur || blur < 0.0001) {
		ctx.drawImage(baseCanvas, 0, 0, w, h);
	} else if (quality === 'interactive' && !shouldAvoidCanvasFilter && 'filter' in ctx) {
		// Fast path for slider drags: blur via canvas context filter (no getImageData).
		// This avoids UI lockups and also avoids canvas-taint pitfalls.
		ctx.save();
		ctx.filter = `blur(${blur}px)`;
		ctx.drawImage(baseCanvas, 0, 0, w, h);
		ctx.restore();
	} else {
		// Blur is the expensive step; cache per base canvas + blur amount.
		// This makes slider drags (brightness changes especially) much cheaper.
		const scratch = getFxScratch(baseCanvas);
		const keyQ = (quality === 'interactive') ? 2 : 8;
		const blurKey = `${w}x${h}|${Math.round(blur * keyQ) / keyQ}`;

		if (!scratch.blurredCanvas || scratch.blurredCanvas.width !== w || scratch.blurredCanvas.height !== h) {
			scratch.blurredCanvas = makeCanvas(w, h);
			scratch.blurredCtx = scratch.blurredCanvas.getContext('2d');
			scratch.blurKey = null;
		}
		const bctx = scratch.blurredCtx;
		if (bctx && scratch.blurKey !== blurKey) {
			bctx.setTransform(1, 0, 0, 1, 0, 0);
			bctx.clearRect(0, 0, w, h);
			drawWithGaussianBlur(bctx, baseCanvas, w, h, blur, scratch, quality);
			scratch.blurKey = blurKey;
		}
		if (scratch.blurredCanvas) {
			ctx.drawImage(scratch.blurredCanvas, 0, 0, w, h);
		} else {
			// Fallback (should be rare): draw directly.
			drawWithGaussianBlur(ctx, baseCanvas, w, h, blur, scratch, quality);
		}
	}

	// Brightness pass (WebKit-friendly). Approximate CSS brightness():
	// - bright < 1: darken using multiply with black
	// - bright > 1: lighten using screen with white
	if (bright !== 1) {
		const b = clamp(bright, 0.25, 3);
		ctx.save();
		if (b < 1) {
			ctx.globalCompositeOperation = 'multiply';
			ctx.fillStyle = `rgba(0, 0, 0, ${clamp(1 - b, 0, 1)})`;
			ctx.fillRect(0, 0, w, h);
		} else {
			const t = clamp((b - 1) / 0.5, 0, 1);
			ctx.globalCompositeOperation = 'screen';
			ctx.fillStyle = `rgba(255, 255, 255, ${clamp(t * 0.4, 0, 0.4)})`;
			ctx.fillRect(0, 0, w, h);
		}
		ctx.restore();
	}
}

/**
 * Renders a background into a canvas.
 *
 * This is used by ImageDisplay to draw the wallpaper/gradient into a canvas
 * so blur + brightness are applied in canvas space (not CSS).
 */
export async function renderBackgroundToCanvas({
	outCanvas,
	widthCssPx,
	heightCssPx,
	renderScale = 1,
	background,
	blurPx = 0,
	brightness = 1,
	wallpaperImage = null,
}) {
	if (!outCanvas) throw new Error('Missing outCanvas');

	const width = Math.max(1, Math.round(Number(widthCssPx) || 1));
	const height = Math.max(1, Math.round(Number(heightCssPx) || 1));
	const scale = Math.max(1, Number(renderScale) || 1);
	const canvasW = Math.max(1, Math.round(width * scale));
	const canvasH = Math.max(1, Math.round(height * scale));

	if (outCanvas.width !== canvasW) outCanvas.width = canvasW;
	if (outCanvas.height !== canvasH) outCanvas.height = canvasH;

	const ctx = outCanvas.getContext('2d');
	if (!ctx) throw new Error('Failed to get 2D context');

	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.clearRect(0, 0, canvasW, canvasH);

	// Render the unfiltered background into a base canvas first.
	const baseCanvas = makeCanvas(canvasW, canvasH);
	const baseCtx = baseCanvas.getContext('2d');
	if (!baseCtx) throw new Error('Failed to get 2D context');
	baseCtx.setTransform(1, 0, 0, 1, 0, 0);
	baseCtx.clearRect(0, 0, canvasW, canvasH);

	// Work in device pixels for crispness.
	const blur = clamp(Number(blurPx) || 0, 0, 200);
	const bright = Number.isFinite(Number(brightness)) ? Number(brightness) : 1;

	const type = background?.type || 'gradient';

	if (type === 'wallpaper') {
		if (wallpaperImage && (wallpaperImage.naturalWidth || wallpaperImage.width)) {
			const srcW = wallpaperImage.naturalWidth || wallpaperImage.width;
			const srcH = wallpaperImage.naturalHeight || wallpaperImage.height;
			const r = getCoverRect(srcW, srcH, canvasW, canvasH);
			// Avoid artificial zoom when blur increases (WebKit may ignore blur filters).
			baseCtx.drawImage(wallpaperImage, r.x, r.y, r.w, r.h);
		} else {
			// No image available: keep transparent.
		}
	} else if (type === 'blobGradient') {
		const cfg = background?.config || {};
		const colorsRaw = Array.isArray(cfg.colors) ? cfg.colors : [];
		const colors = colorsRaw.filter(Boolean).slice(0, 8);
		const seed = Number.isFinite(Number(cfg.seed)) ? Number(cfg.seed) : 1;
		const blobCount = clamp(Number(cfg.blobCount) || 6, 2, 12);
		const intensity = clamp(Number(cfg.intensity) || 0.9, 0, 1);
		const baseMode = String(cfg.baseMode || cfg.base || 'dark'); // 'dark' | 'light'
		const blend = String(cfg.blend || (baseMode === 'light' ? 'multiply' : 'screen'));
		const cornerBias = clamp(Number(cfg.cornerBias) || 0.42, 0, 1);

		const baseA = String(cfg.baseA || cfg.baseColorA || (baseMode === 'light' ? '#ffffff' : '#05060A'));
		const baseB = String(cfg.baseB || cfg.baseColorB || (baseMode === 'light' ? '#f3f4f6' : '#111827'));
		const c2 = colors[0] || '#8b5cf6';
		const c3 = colors[1] || colors[0] || '#ec4899';

		// Blob gradients are inherently soft; cap internal render scale for speed.
		const internalScale = Math.min(scale, 1.25);
		const iw = Math.max(1, Math.round(width * internalScale));
		const ih = Math.max(1, Math.round(height * internalScale));
		const tmp = makeCanvas(iw, ih);
		const tctx = tmp.getContext('2d');
		if (!tctx) throw new Error('Failed to get 2D context');

		// Base wash
		{
			const angleDeg = Number(cfg.angleDeg) || 135;
			const { x: ux, y: uy } = parseAngleToUnitVector(angleDeg);
			const cx = iw / 2;
			const cy = ih / 2;
			const half = Math.hypot(iw, ih) / 2;
			const grad = tctx.createLinearGradient(cx - ux * half, cy - uy * half, cx + ux * half, cy + uy * half);
			grad.addColorStop(0, baseA);
			grad.addColorStop(1, baseB);
			tctx.fillStyle = grad;
			tctx.fillRect(0, 0, iw, ih);
		}

		const rand = mulberry32(seed);
		const minDim = Math.min(iw, ih);
		const baseR = minDim * (0.44 + rand() * 0.18);
		const blobBlurPx = clamp(Number(cfg.blobBlurPx) || (minDim * 0.055), 0, 140);

		tctx.save();
		tctx.globalCompositeOperation = (blend === 'multiply' || blend === 'overlay' || blend === 'screen' || blend === 'lighter')
			? blend
			: (baseMode === 'light' ? 'multiply' : 'screen');
		// Add extra softness (low-res + blur = smooth like the reference).
		tctx.filter = blobBlurPx > 0 ? `blur(${blobBlurPx}px)` : 'none';
		for (let i = 0; i < blobCount; i++) {
			// Occasionally anchor blobs off-canvas corners so they "start" from edges.
			const useCorner = rand() < cornerBias;
			let px = iw * (0.08 + rand() * 0.84);
			let py = ih * (0.08 + rand() * 0.84);
			if (useCorner) {
				const corner = Math.floor(rand() * 4);
				const ox = (corner === 0 || corner === 2) ? -0.10 : 1.10;
				const oy = (corner === 0 || corner === 1) ? -0.10 : 1.10;
				px = iw * (ox + rand() * 0.18);
				py = ih * (oy + rand() * 0.18);
			}

			const r = baseR * (0.9 + rand() * 1.15);
			const col = colors[i % colors.length] || (i % 2 === 0 ? c2 : c3);
			const alphaBase = baseMode === 'light'
				? intensity * (0.42 + rand() * 0.22)
				: intensity * (0.78 + rand() * 0.22);

			// Build an irregular "blob" from multiple lobes (elliptical gradients).
			const lobes = 3 + Math.floor(rand() * 4);
			for (let j = 0; j < lobes; j++) {
				const ang = rand() * Math.PI * 2;
				const off = (0.10 + rand() * 0.22) * r;
				const lx = px + Math.cos(ang) * off;
				const ly = py + Math.sin(ang) * off;
				const rot = rand() * Math.PI * 2;
				const sx = 0.65 + rand() * 0.85;
				const sy = 0.65 + rand() * 0.85;
				const rr = r * (0.55 + rand() * 0.6);

				tctx.save();
				tctx.translate(lx, ly);
				tctx.rotate(rot);
				tctx.scale(sx, sy);
				const g = tctx.createRadialGradient(0, 0, 0, 0, 0, rr);
				g.addColorStop(0, toCanvasRgba(col, alphaBase));
				g.addColorStop(1, toCanvasRgba(col, 0));
				tctx.fillStyle = g;
				tctx.fillRect(-rr, -rr, rr * 2, rr * 2);
				tctx.restore();
			}
		}
		tctx.restore();
		tctx.filter = 'none';

		// Scale up to base canvas (blur applied in a separate pass).
		baseCtx.save();
		baseCtx.imageSmoothingEnabled = true;
		baseCtx.imageSmoothingQuality = 'high';
		baseCtx.drawImage(tmp, 0, 0, canvasW, canvasH);
		baseCtx.restore();
	} else {
		const angleDeg = Number(background?.angleDeg) || 135;
		const { x: ux, y: uy } = parseAngleToUnitVector(angleDeg);
		const cx = canvasW / 2;
		const cy = canvasH / 2;
		const half = Math.hypot(canvasW, canvasH) / 2;

		const x0 = cx - ux * half;
		const y0 = cy - uy * half;
		const x1 = cx + ux * half;
		const y1 = cy + uy * half;

		const grad = baseCtx.createLinearGradient(x0, y0, x1, y1);
		grad.addColorStop(0, toCanvasRgba(background?.colorStart || 'transparent', 1));
		grad.addColorStop(1, toCanvasRgba(background?.colorEnd || 'transparent', 1));
		baseCtx.fillStyle = grad;
		baseCtx.fillRect(0, 0, canvasW, canvasH);
	}

	// Blur pass (reliable across WebKit): downscale then upscale.
	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.clearRect(0, 0, canvasW, canvasH);
	drawWithGaussianBlur(ctx, baseCanvas, canvasW, canvasH, blur * scale);
	ctx.restore();

	// Brightness pass (WebKit-friendly). Approximate CSS brightness():
	// - bright < 1: darken using multiply with black
	// - bright > 1: lighten using screen with white
	if (bright !== 1) {
		const b = clamp(bright, 0.25, 3);
		ctx.save();
		if (b < 1) {
			// 0.5 -> alpha 0.5
			ctx.globalCompositeOperation = 'multiply';
			ctx.fillStyle = `rgba(0, 0, 0, ${clamp(1 - b, 0, 1)})`;
			ctx.fillRect(0, 0, canvasW, canvasH);
		} else {
			// 1.5 -> alpha ~0.4 (avoid blowing out whites)
			const t = clamp((b - 1) / 0.5, 0, 1);
			ctx.globalCompositeOperation = 'screen';
			ctx.fillStyle = `rgba(255, 255, 255, ${clamp(t * 0.4, 0, 0.4)})`;
			ctx.fillRect(0, 0, canvasW, canvasH);
		}
		ctx.restore();
	}
}

