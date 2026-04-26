import domtoimage from 'dom-to-image';

import { clamp } from '../core/math';

const nextAnimationFrame = () =>
	new Promise((resolve) => {
		if (typeof window === 'undefined' || !window.requestAnimationFrame) return resolve();
		window.requestAnimationFrame(() => resolve());
	});

export const blobToDataUrl = (blob) =>
	new Promise((resolve, reject) => {
		try {
			const reader = new FileReader();
			reader.onerror = () => reject(new Error('Failed to read blob'));
			reader.onload = () => resolve(String(reader.result || ''));
			reader.readAsDataURL(blob);
		} catch (e) {
			reject(e);
		}
	});

export const dataUrlToImage = (dataUrl) =>
	new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = dataUrl;
	});

export const dataUrlToBlob = async (dataUrl) => {
	const res = await fetch(dataUrl);
	return await res.blob();
};

const canvasDataUrlCache = new WeakMap();

const getCanvasCacheKey = (canvas) => {
	try {
		return (
			canvas?.getAttribute?.('data-export-img-ready') ||
			canvas?.getAttribute?.('data-bg-render-done') ||
			canvas?.getAttribute?.('data-bg-render-token') ||
			null
		);
	} catch {
		return null;
	}
};

const domToImageFilter = (node) => !(node?.classList && node.classList.contains('transform-overlay'));

const waitForImagesReady = async (root, { timeoutMs = 2500 } = {}) => {
	if (!root || typeof root.querySelectorAll !== 'function') return;
	const imgs = Array.from(root.querySelectorAll('img'));
	if (!imgs.length) return;

	const waitOne = (img) =>
		new Promise((resolve) => {
			if (!img) return resolve();

			const done = () => {
				try {
					img.removeEventListener('load', done);
					img.removeEventListener('error', done);
				} catch {}
				resolve();
			};

			const naturalOk = (Number(img.naturalWidth) || 0) > 0 && (Number(img.naturalHeight) || 0) > 0;
			if (img.complete && naturalOk) return resolve();

			const decode = img.decode?.bind(img);
			if (decode) {
				let settled = false;
				const timeoutId = window?.setTimeout
					? window.setTimeout(() => {
							if (settled) return;
							settled = true;
							resolve();
						}, timeoutMs)
					: null;

				decode()
					.catch(() => {})
					.finally(() => {
						if (settled) return;
						settled = true;
						if (timeoutId) window.clearTimeout(timeoutId);
						resolve();
					});
				return;
			}

			try {
				img.addEventListener('load', done, { once: true });
				img.addEventListener('error', done, { once: true });
			} catch {
				resolve();
				return;
			}

			if (window?.setTimeout) window.setTimeout(done, timeoutMs);
		});

	await Promise.allSettled(imgs.map(waitOne));
};

const waitForFontsReady = async ({ timeoutMs = 2500 } = {}) => {
	try {
		if (typeof document === 'undefined') return;
		const fonts = document.fonts;
		if (!fonts?.ready) return;

		await Promise.race([
			fonts.ready.catch(() => undefined),
			new Promise((resolve) => window.setTimeout(resolve, timeoutMs)),
		]);
	} catch {
		// Best-effort only.
	}
};

const waitForExportReady = async (root, { timeoutMs = 2500 } = {}) => {
	if (!root) return;
	const startedAt = Date.now();

	const isReady = () => {
		try {
			return root.getAttribute?.('data-export-ready') === 'true';
		} catch {
			return false;
		}
	};

	if (isReady()) return;

	return await new Promise((resolve) => {
		let rafId = 0;
		let timeoutId = 0;
		let done = false;
		let observer = null;

		const finish = () => {
			if (done) return;
			done = true;
			try { cancelAnimationFrame(rafId); } catch {}
			try { timeoutId && window.clearTimeout(timeoutId); } catch {}
			try { observer?.disconnect?.(); } catch {}
			resolve();
		};

		const tick = () => {
			if (done) return;
			if (isReady()) return finish();
			if (Date.now() - startedAt > timeoutMs) return finish();
			rafId = requestAnimationFrame(tick);
		};

		try {
			observer = new MutationObserver(() => {
				if (isReady()) finish();
			});
			observer.observe(root, { attributes: true, attributeFilter: ['data-export-ready'] });
		} catch {}

		timeoutId = window.setTimeout(() => {
			rafId = requestAnimationFrame(tick);
		}, 60);
	});
};

const fetchSrcAsDataUrl = async (src) => {
	if (!src || typeof src !== 'string' || typeof fetch !== 'function') return null;
	try {
		const url = new URL(src, typeof window !== 'undefined' ? window.location.href : undefined);
		const protocol = String(url.protocol || '').toLowerCase();
		const response = (protocol === 'http:' || protocol === 'https:')
			? await fetch(url.toString(), { mode: 'cors', credentials: 'omit' }).catch(() => null)
			: await fetch(url.toString()).catch(() => null);
		if (!response || !response.ok) return null;
		return await blobToDataUrl(await response.blob());
	} catch {
		return null;
	}
};

export const withExportImgSrcOverrides = async (root, fn) => {
	if (!root || typeof root.querySelectorAll !== 'function') return await fn();
	const api = (typeof window !== 'undefined') ? window?.tauriAPI : null;

	const imgs = Array.from(root.querySelectorAll('img'));
	if (!imgs.length) return await fn();

	const overrides = [];
	const isAbsoluteFilePath = (src) => /^([A-Za-z]:[\\/]|\/)/.test(String(src || ''));
	const assetUrlToFilePath = (src) => {
		try {
			const url = new URL(src);
			let pathname = decodeURIComponent(url.pathname || '');
			if (pathname.startsWith('/') && /^[A-Za-z]:/.test(pathname.slice(1))) pathname = pathname.slice(1);
			return pathname || null;
		} catch {
			return null;
		}
	};

	for (const img of imgs) {
		try {
			const attrSrc = img?.getAttribute?.('src') || '';
			const src = attrSrc || img?.currentSrc || img?.src || '';
			if (!src || typeof src !== 'string') continue;
			if (src.startsWith('data:') || src.startsWith('blob:')) continue;
			let filePath = null;
			let dataUrl = null;
			if (src.startsWith('asset:') || src.startsWith('tauri:') || src.startsWith('app:') || src.startsWith('file:')) {
				filePath = assetUrlToFilePath(src);
			} else if (isAbsoluteFilePath(src)) {
				filePath = src;
			}
			if (filePath && api?.readFileAsDataUrl) {
				dataUrl = await api.readFileAsDataUrl({ filePath });
			}
			if ((!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) && !filePath) {
				dataUrl = await fetchSrcAsDataUrl(src);
			}
			if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) continue;
			overrides.push({ img, prevSrc: img.src });
			img.src = dataUrl;
		} catch {}
	}

	try {
		return await fn();
	} finally {
		for (const override of overrides) {
			try { override.img.src = override.prevSrc; } catch {}
		}
	}
};

export const getNativeAwareBaseSize = (root) => {
	const cssW = Math.max(1, Math.round(Number(root?.offsetWidth) || 1));
	const cssH = Math.max(1, Math.round(Number(root?.offsetHeight) || 1));
	const css = { w: cssW, h: cssH };

	if (!root || typeof root.querySelector !== 'function') return css;

	const img = root.querySelector('img[data-siteshot-source="1"]') || root.querySelector('img');
	if (!img) return css;

	const naturalW = Number(img.naturalWidth) || 0;
	const naturalH = Number(img.naturalHeight) || 0;
	const renderedW = Number(img.offsetWidth) || 0;
	const renderedH = Number(img.offsetHeight) || 0;

	const wRatio = naturalW > 0 && renderedW > 0 ? naturalW / renderedW : 0;
	const hRatio = naturalH > 0 && renderedH > 0 ? naturalH / renderedH : 0;
	const ratio = Math.max(wRatio, hRatio);
	if (!Number.isFinite(ratio) || ratio <= 0) return css;

	return {
		w: Math.max(1, Math.round(cssW * ratio)),
		h: Math.max(1, Math.round(cssH * ratio)),
	};
};

export const computeCaptureScale = (element, { targetWidth, targetHeight } = {}) => {
	const baseW = Math.max(1, Math.round(Number(element?.offsetWidth) || 1));
	const baseH = Math.max(1, Math.round(Number(element?.offsetHeight) || 1));

	const tw = Number(targetWidth);
	const th = Number(targetHeight);
	const hasTargetSize = Number.isFinite(tw) && tw > 0 && Number.isFinite(th) && th > 0;

	let desired;
	if (hasTargetSize) {
		desired = Math.max(tw / baseW, th / baseH);
	} else {
		const nativeBase = getNativeAwareBaseSize(element);
		desired = Math.max(nativeBase.w / baseW, nativeBase.h / baseH);
	}
	const clamped = clamp(desired, 1, 6);
	const quantized = Math.round(clamped * 64) / 64;
	return Math.max(1, quantized);
};

export const withExportMode = async (element, exportScale, fn, { omitWatermark = false } = {}) => {
	if (!element) throw new Error('Missing export root');

	try {
		element.setAttribute?.('data-exporting', 'true');
		element.setAttribute?.('data-export-scale', String(Math.max(1, exportScale)));
		element.setAttribute?.('data-export-shadow-mode', 'drop-shadow');
		if (omitWatermark) element.setAttribute?.('data-export-omit-watermark', 'true');
		element.setAttribute?.('data-export-ready', 'false');
	} catch {}

	try {
		await nextAnimationFrame();
		await Promise.all([
			waitForFontsReady({ timeoutMs: 1500 }),
			waitForImagesReady(element, { timeoutMs: 1500 }),
			waitForExportReady(element, { timeoutMs: 1500 }),
		]);

		try {
			const exportDebugEnabled = (() => {
				try {
					return (
						window?.localStorage?.getItem('debug.enabled') === '1' &&
						window?.localStorage?.getItem('debug.export') === '1'
					);
				} catch {
					return false;
				}
			})();
			if (exportDebugEnabled) {
				const shadowEl = element.querySelector?.('.siteshot-card-shadow');
				const computedStyle = shadowEl && window.getComputedStyle ? window.getComputedStyle(shadowEl) : null;
				const rootRect = element.getBoundingClientRect?.();
				const shadowRect = shadowEl?.getBoundingClientRect?.();
				console.log('[EXPORT]', {
					exportScale,
					root: rootRect ? { w: Math.round(rootRect.width), h: Math.round(rootRect.height) } : null,
					shadowBox: shadowRect ? { x: Math.round(shadowRect.x), y: Math.round(shadowRect.y), w: Math.round(shadowRect.width), h: Math.round(shadowRect.height) } : null,
					boxShadow: computedStyle?.boxShadow,
					filter: computedStyle?.filter,
					overflowRoot: window.getComputedStyle ? window.getComputedStyle(element).overflow : null,
				});
			}
		} catch {}

		return await fn();
	} finally {
		try {
			element.removeAttribute?.('data-exporting');
			element.removeAttribute?.('data-export-scale');
			element.removeAttribute?.('data-export-shadow-mode');
			element.removeAttribute?.('data-export-omit-watermark');
			element.removeAttribute?.('data-export-ready');
		} catch {}
	}
};

export const captureWithDomToImage = async (element, { captureScale = 1, bgcolor = null } = {}) => {
	const baseW = Math.max(1, Math.round(Number(element?.offsetWidth) || 1));
	const baseH = Math.max(1, Math.round(Number(element?.offsetHeight) || 1));
	const sRaw = Number(captureScale) || 1;
	const s = clamp(sRaw, 1, 6);

	const buildOpts = (scale) => ({
		filter: domToImageFilter,
		cacheBust: true,
		bgcolor: bgcolor ?? undefined,
		width: Math.max(1, Math.round(baseW * scale)),
		height: Math.max(1, Math.round(baseH * scale)),
		style: {
			transform: `scale(${scale})`,
			transformOrigin: 'top left',
		},
	});

	const captureViaSvgRasterization = async (scale) => {
		const svgDataUrl = await domtoimage.toSvg(element, buildOpts(scale));
		if (!svgDataUrl || typeof svgDataUrl !== 'string') {
			throw new Error('Failed to serialize export SVG');
		}

		const img = await dataUrlToImage(svgDataUrl);
		const outW = Math.max(1, Math.round(baseW * scale));
		const outH = Math.max(1, Math.round(baseH * scale));

		const canvas = document.createElement('canvas');
		canvas.width = outW;
		canvas.height = outH;
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Failed to get 2D context for SVG rasterization');
		ctx.imageSmoothingEnabled = true;
		try {
			ctx.imageSmoothingQuality = 'high';
		} catch {}
		ctx.drawImage(img, 0, 0, outW, outH);

		return await new Promise((resolve, reject) => {
			canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Failed to encode SVG rasterized export'))), 'image/png');
		});
	};

	try {
		const out = await domtoimage.toBlob(element, buildOpts(s));
		if (!out) throw new Error('Failed to capture export blob');
		return out;
	} catch (e) {
		const sInt = Math.max(1, Math.ceil(s));

		if (Math.abs(sInt - s) > 1e-6) {
			try {
				const outInt = await domtoimage.toBlob(element, buildOpts(sInt));
				if (outInt) return outInt;
			} catch {}
		}

		try {
			return await captureViaSvgRasterization(s);
		} catch {
			if (Math.abs(sInt - s) > 1e-6) {
				return await captureViaSvgRasterization(sInt);
			}
			throw e;
		}
	}
};

export const withCanvasReplacements = async (root, fn) => {
	if (!root || typeof root.querySelectorAll !== 'function') return await fn();
	const canvases = Array.from(root.querySelectorAll('canvas'));
	if (!canvases.length) return await fn();

	const replacements = [];
	let visibleCanvasCount = 0;
	let dataUrlFailCount = 0;
	let replacedCount = 0;

	const exportCanvas = root.querySelector?.('canvas[data-siteshot-export-canvas="1"]') || null;
	const sourceImg = root.querySelector?.('img[data-siteshot-source="1"]') || null;
	let imgFallback = null;
	try { root.setAttribute?.('data-export-canvas-replacements', '0'); } catch {}
	for (const canvas of canvases) {
		try {
			const computedStyle = window.getComputedStyle ? window.getComputedStyle(canvas) : null;
			const hidden = computedStyle && (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || Number(computedStyle.opacity) === 0);
			if (hidden) continue;
			visibleCanvasCount += 1;

			let dataUrl = '';
			const cacheKey = getCanvasCacheKey(canvas);
			const cached = cacheKey ? canvasDataUrlCache.get(canvas) : null;
			if (cached && cached.key === cacheKey && cached.dataUrl) {
				dataUrl = cached.dataUrl;
			} else {
				try {
					dataUrl = canvas.toDataURL('image/png');
					if (cacheKey && dataUrl) {
						canvasDataUrlCache.set(canvas, { key: cacheKey, dataUrl });
					}
				} catch {
					dataUrlFailCount += 1;
					const prevDisplay = canvas.style.display;
					canvas.style.display = 'none';
					replacements.push({ canvas, img: null, prevDisplay, tainted: true });
					replacedCount += 1;
					continue;
				}
			}
			if (!dataUrl || !dataUrl.startsWith('data:image/')) continue;

			const img = document.createElement('img');
			img.decoding = 'sync';
			img.loading = 'eager';
			img.src = dataUrl;
			img.className = canvas.className || '';
			img.style.cssText = canvas.style.cssText || '';
			try { img.style.transform = 'none'; } catch {}
			try { img.style.willChange = 'auto'; } catch {}
			img.setAttribute('aria-hidden', 'true');
			img.setAttribute('data-export-canvas-replacement', '1');

			canvas.parentNode?.insertBefore?.(img, canvas);

			const prevDisplay = canvas.style.display;
			canvas.style.display = 'none';
			replacements.push({ canvas, img, prevDisplay });
			replacedCount += 1;
		} catch {
			// Ignore individual failures; proceed with best-effort.
		}
	}

	try {
		root.setAttribute?.(
			'data-export-canvas-replacements',
			`${replacedCount}/${visibleCanvasCount}|fail:${dataUrlFailCount}`
		);
	} catch {}

	const exportCanvasReplaced = !!(exportCanvas && replacements.some((replacement) => replacement.canvas === exportCanvas));
	if (exportCanvas && sourceImg && !exportCanvasReplaced) {
		try {
			imgFallback = {
				exportCanvas,
				sourceImg,
				prevCanvasDisplay: exportCanvas.style.display,
				prevImgOpacity: sourceImg.style.opacity,
				prevImgVisibility: sourceImg.style.visibility,
			};
			exportCanvas.style.display = 'none';
			sourceImg.style.opacity = '1';
			sourceImg.style.visibility = 'visible';
			sourceImg.setAttribute('data-export-img-fallback', 'true');
		} catch {
			imgFallback = null;
		}
	}

	try {
		await nextAnimationFrame();
		return await fn();
	} finally {
		if (imgFallback) {
			try { imgFallback.exportCanvas.style.display = imgFallback.prevCanvasDisplay; } catch {}
			try { imgFallback.sourceImg.style.opacity = imgFallback.prevImgOpacity; } catch {}
			try { imgFallback.sourceImg.style.visibility = imgFallback.prevImgVisibility; } catch {}
			try { imgFallback.sourceImg.removeAttribute('data-export-img-fallback'); } catch {}
		}
		for (const replacement of replacements) {
			try { replacement.img?.remove?.(); } catch {}
			try { replacement.canvas.style.display = replacement.prevDisplay; } catch {}
		}
	}
};
