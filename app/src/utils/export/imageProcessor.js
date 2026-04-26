import {
	blobToDataUrl,
	captureWithDomToImage,
	computeCaptureScale,
	dataUrlToBlob,
	dataUrlToImage,
	getNativeAwareBaseSize,
	withCanvasReplacements,
	withExportImgSrcOverrides,
	withExportMode,
} from './exportDomCapture';

// Clean, DOM-first export pipeline.
// - Captures the export DOM (shadows + watermark included).
// - Preserves ExportModal resolution decisions (targetWidth/targetHeight).
// - Uses integer capture scales for dom-to-image stability.

import { clamp } from '../core/math';

const blobToImage = async (blob) => {
	const url = URL.createObjectURL(blob);
	try {
		const img = await new Promise((resolve, reject) => {
			const el = new Image();
			el.onload = () => resolve(el);
			el.onerror = reject;
			el.src = url;
		});
		return img;
	} finally {
		try {
			URL.revokeObjectURL(url);
		} catch {}
	}
};

const normalizeFormatToMime = (format) => {
	const f = String(format || '').toLowerCase();
	if (f === 'jpg' || f === 'jpeg' || f === 'image/jpg' || f === 'image/jpeg') return 'image/jpeg';
	if (f === 'webp' || f === 'image/webp') return 'image/webp';
	return 'image/png';
};

export const scaleAndEncodeBlob = async (
	srcBlob,
	{ scale = 1, format = 'png', quality = 0.95, targetWidth = null, targetHeight = null } = {}
) => {
	const tw0 = Number(targetWidth);
	const th0 = Number(targetHeight);
	const hasTargetSize0 = Number.isFinite(tw0) && tw0 > 0 && Number.isFinite(th0) && th0 > 0;

	const mime0 = normalizeFormatToMime(format);

	if (!hasTargetSize0 && Math.abs(Number(scale) - 1) < 0.0001 && mime0 === 'image/png') {
		return srcBlob;
	}

	// Fast path: use OffscreenCanvas + createImageBitmap when available (avoids DOM img decode).
	const useOffscreen = typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap !== 'undefined';

	if (useOffscreen) {
		try {
			const bitmap = await createImageBitmap(srcBlob);
			const outW = hasTargetSize0
				? Math.max(1, Math.round(tw0))
				: Math.max(1, Math.round(bitmap.width * Number(scale || 1)));
			const outH = hasTargetSize0
				? Math.max(1, Math.round(th0))
				: Math.max(1, Math.round(bitmap.height * Number(scale || 1)));

			const offscreen = new OffscreenCanvas(outW, outH);
			const ctx = offscreen.getContext('2d');
			if (ctx) {
				ctx.imageSmoothingEnabled = true;
				try { ctx.imageSmoothingQuality = 'high'; } catch {}
				ctx.drawImage(bitmap, 0, 0, outW, outH);
				bitmap.close();
				const q = typeof quality === 'number' ? clamp(quality, 0, 1) : 0.95;
				return await offscreen.convertToBlob({ type: mime0, quality: q });
			}
			bitmap.close();
		} catch {
			// Fall through to DOM-based path.
		}
	}

	const img = await blobToImage(srcBlob);
	const canvas = document.createElement('canvas');

	const outW = hasTargetSize0
		? Math.max(1, Math.round(tw0))
		: Math.max(1, Math.round((img.naturalWidth || img.width || 1) * Number(scale || 1)));
	const outH = hasTargetSize0
		? Math.max(1, Math.round(th0))
		: Math.max(1, Math.round((img.naturalHeight || img.height || 1) * Number(scale || 1)));

	canvas.width = outW;
	canvas.height = outH;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Failed to get 2D context for export encoding');
	ctx.imageSmoothingEnabled = true;
	try {
		ctx.imageSmoothingQuality = 'high';
	} catch {}
	ctx.drawImage(img, 0, 0, outW, outH);

	const mime = mime0;
	const q = typeof quality === 'number' ? clamp(quality, 0, 1) : 0.95;
	return await new Promise((resolve, reject) => {
		canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed to encode canvas'))), mime, q);
	});
};

const legacyCopyText = (text) => {
	try {
		if (typeof document === 'undefined') return false;
		const ta = document.createElement('textarea');
		ta.value = String(text || '');
		ta.setAttribute('readonly', 'true');
		ta.style.position = 'fixed';
		ta.style.top = '-1000px';
		ta.style.left = '-1000px';
		document.body.appendChild(ta);
		ta.focus();
		ta.select();
		const ok = !!document.execCommand?.('copy');
		document.body.removeChild(ta);
		return ok;
	} catch {
		return false;
	}
};

const getNativeInvoke = () => {
	try {
		const invoke =
			window?.tauriAPI?.core?.invoke ||
			window?.__TAURI_INTERNALS__?.core?.invoke ||
			window?.__TAURI__?.core?.invoke ||
			null;
		return (typeof invoke === 'function') ? invoke : null;
	} catch {
		return null;
	}
};

const downloadBlob = async (blob, filename) => {
	const isDesktopRuntime =
		(typeof window !== 'undefined') &&
		!!(window?.__SITESHOT_TAURI__ || window?.__TAURI_INTERNALS__ || window?.__TAURI__ || window?.tauriAPI || window?.electronAPI);

	// Tauri macOS uses WKWebView, where `a[download]` is unreliable.
	// Prefer saving via the native backend when available.
	if (window?.tauriAPI?.saveExportedImage) {
		const dataUrl = await blobToDataUrl(blob);
		const res = await window.tauriAPI.saveExportedImage({ dataUrl, fileName: filename });
		// User cancelled the native dialog.
		if (res && res.localCancel) return;
		if (res && res.ok === false) throw new Error(res.error || 'Export failed');
		return;
	}

	if (isDesktopRuntime) {
		throw new Error('Native save API unavailable in desktop runtime');
	}

	// Bridge fallback: some desktop boot paths can expose native invoke before tauriAPI wrapper is ready.
	const nativeInvoke = getNativeInvoke();
	if (nativeInvoke) {
		const dataUrl = await blobToDataUrl(blob);
		const res = await nativeInvoke('exports_save_to_downloads', { args: { dataUrl, fileName: filename } });
		if (res && res.ok === false) throw new Error(res.error || 'Export failed');
		return;
	}

	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	setTimeout(() => URL.revokeObjectURL(url), 0);
};

const cropCanvasToAlphaBounds = (ctx, w, h, { alphaThreshold = 250, minInset = 0 } = {}) => {
	const t = Math.max(0, Math.min(255, Math.round(alphaThreshold)));
	let imgData;
	try {
		imgData = ctx.getImageData(0, 0, w, h);
	} catch {
		return null;
	}

	const data = imgData.data;
	let minX = w,
		minY = h,
		maxX = -1,
		maxY = -1;

	for (let y = 0; y < h; y++) {
		const row = y * w * 4;
		for (let x = 0; x < w; x++) {
			const a = data[row + x * 4 + 3];
			if (a >= t) {
				if (x < minX) minX = x;
				if (y < minY) minY = y;
				if (x > maxX) maxX = x;
				if (y > maxY) maxY = y;
			}
		}
	}

	if (maxX < 0 || maxY < 0) return null;

	minX = Math.max(0, minX - 1);
	minY = Math.max(0, minY - 1);
	maxX = Math.min(w - 1, maxX + 1);
	maxY = Math.min(h - 1, maxY + 1);

	const cropW = Math.max(1, maxX - minX + 1);
	const cropH = Math.max(1, maxY - minY + 1);

	const insetX = Math.min(minX, Math.max(0, w - 1 - maxX));
	const insetY = Math.min(minY, Math.max(0, h - 1 - maxY));
	const inset = Math.min(insetX, insetY);
	if (inset < (Number(minInset) || 0)) return null;

	return { x: minX, y: minY, w: cropW, h: cropH };
};

export const trimMacOsWindowScreenshotDataUrl = async (dataUrl) => {
	try {
		if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return dataUrl;

		const isPng = dataUrl.startsWith('data:image/png');
		const isWebp = dataUrl.startsWith('data:image/webp');
		if (!isPng && !isWebp) return dataUrl;

		const img = await dataUrlToImage(dataUrl);
		const w = img.naturalWidth || img.width || 0;
		const h = img.naturalHeight || img.height || 0;
		if (!w || !h) return dataUrl;

		const canvas = document.createElement('canvas');
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext('2d', { willReadFrequently: true });
		if (!ctx) return dataUrl;
		ctx.drawImage(img, 0, 0);

		const bounds = cropCanvasToAlphaBounds(ctx, w, h, { alphaThreshold: 250, minInset: 3 });
		if (!bounds) return dataUrl;

		const out = document.createElement('canvas');
		out.width = bounds.w;
		out.height = bounds.h;
		const outCtx = out.getContext('2d');
		if (!outCtx) return dataUrl;
		outCtx.drawImage(canvas, bounds.x, bounds.y, bounds.w, bounds.h, 0, 0, bounds.w, bounds.h);

		return out.toDataURL('image/png');
	} catch {
		return dataUrl;
	}
};

export const trimTransparentEdgeSeamsDataUrl = async (
	dataUrl,
	{ maxTrimPerSide = 2, alphaMax = 0 } = {}
) => {
	try {
		if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return dataUrl;

		const img = await dataUrlToImage(dataUrl);
		const w = img.naturalWidth || img.width || 0;
		const h = img.naturalHeight || img.height || 0;
		if (!w || !h) return dataUrl;

		const canvas = document.createElement('canvas');
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext('2d', { willReadFrequently: true });
		if (!ctx) return dataUrl;
		ctx.drawImage(img, 0, 0);

		let pixels;
		try {
			pixels = ctx.getImageData(0, 0, w, h).data;
		} catch {
			return dataUrl;
		}

		const threshold = Math.max(0, Math.min(255, Math.round(Number(alphaMax) || 0)));
		const maxTrim = Math.max(1, Math.min(8, Math.round(Number(maxTrimPerSide) || 2)));

		const columnIsFullyTransparent = (x) => {
			for (let y = 0; y < h; y++) {
				const a = pixels[(y * w + x) * 4 + 3];
				if (a > threshold) return false;
			}
			return true;
		};

		const rowIsFullyTransparent = (y) => {
			const row = y * w;
			for (let x = 0; x < w; x++) {
				const a = pixels[(row + x) * 4 + 3];
				if (a > threshold) return false;
			}
			return true;
		};

		let trimLeft = 0;
		while (trimLeft < maxTrim && trimLeft < w - 1 && columnIsFullyTransparent(trimLeft)) trimLeft += 1;

		let trimRight = 0;
		while (trimRight < maxTrim && trimRight < w - 1 - trimLeft && columnIsFullyTransparent(w - 1 - trimRight)) trimRight += 1;

		let trimTop = 0;
		while (trimTop < maxTrim && trimTop < h - 1 && rowIsFullyTransparent(trimTop)) trimTop += 1;

		let trimBottom = 0;
		while (trimBottom < maxTrim && trimBottom < h - 1 - trimTop && rowIsFullyTransparent(h - 1 - trimBottom)) trimBottom += 1;

		if (!trimLeft && !trimRight && !trimTop && !trimBottom) return dataUrl;

		const outW = Math.max(1, w - trimLeft - trimRight);
		const outH = Math.max(1, h - trimTop - trimBottom);

		const out = document.createElement('canvas');
		out.width = outW;
		out.height = outH;
		const outCtx = out.getContext('2d');
		if (!outCtx) return dataUrl;
		outCtx.drawImage(canvas, trimLeft, trimTop, outW, outH, 0, 0, outW, outH);

		return out.toDataURL('image/png');
	} catch {
		return dataUrl;
	}
};

const trimTransparentEdgeSeamsBlob = async (blob, opts = {}) => {
	if (!blob) return blob;
	try {
		const sourceDataUrl = await blobToDataUrl(blob);
		const trimmedDataUrl = await trimTransparentEdgeSeamsDataUrl(sourceDataUrl, opts);
		if (!trimmedDataUrl || trimmedDataUrl === sourceDataUrl) return blob;
		return await dataUrlToBlob(trimmedDataUrl);
	} catch {
		return blob;
	}
};

export const shouldShowBrowserWarning = () => false;

export const createExportableSnapshot = async (element, options = {}) => {
	if (!element) throw new Error('Element to capture is undefined or null');

	const exportScale = computeCaptureScale(element, {
		targetWidth: options?.targetWidth,
		targetHeight: options?.targetHeight,
	});

	const backgroundType = options?.editorOptions?.backgroundType;
	const bgcolor =
		backgroundType === 'transparent'
			? null
			: (options?.backgroundColor ?? getComputedStyle(element).backgroundColor ?? null);

	const capturedBlob = await withExportMode(element, exportScale, async () => {
		// WKWebView + dom-to-image can intermittently fail to serialize <canvas> nodes.
		// If there are visible canvases in the export tree (which includes the screenshot/wallpaper render),
		// always use the safe canvas->img replacement path to avoid blank exports.
		const hasVisibleCanvas = (() => {
			try {
				const list = Array.from(element.querySelectorAll?.('canvas') || []);
				for (const canvas of list) {
					const cs = window.getComputedStyle ? window.getComputedStyle(canvas) : null;
					const hidden = cs && (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0);
					if (!hidden) return true;
				}
				return false;
			} catch {
				return true;
			}
		})();

		const capture = async () => {
			if (!hasVisibleCanvas) {
				return await captureWithDomToImage(element, { captureScale: exportScale, bgcolor });
			}

			return await withCanvasReplacements(element, async () => {
				return await captureWithDomToImage(element, { captureScale: exportScale, bgcolor });
			});
		};

		return await withExportImgSrcOverrides(element, capture);
	}, { omitWatermark: !!options?.omitWatermark });

	let exportBlob = await trimTransparentEdgeSeamsBlob(capturedBlob, { maxTrimPerSide: 2, alphaMax: 0 });
	return exportBlob;
};

export const snapshotCreator = (element) => createExportableSnapshot(element);

export const copyImage = async (wrapperRef, blob, editorOptions = null) => {
	if (!blob?.src || !wrapperRef?.current) throw new Error('Nothing to copy');

	const root = wrapperRef.current;
	const wrapperStyle = getComputedStyle(root);

	// Compute native-image-aware target dimensions so the copy resolution is
	// independent of the current window / CSS layout size.
	const nativeBase = getNativeAwareBaseSize(root);
	const clipboardTargetW = nativeBase.w;
	const clipboardTargetH = nativeBase.h;

	const copyBlob = await createExportableSnapshot(root, {
		backgroundColor: wrapperStyle.backgroundColor,
		editorOptions,
		targetWidth: clipboardTargetW,
		targetHeight: clipboardTargetH,
	});

	let lastError = null;
	const isDesktopRuntime =
		(typeof window !== 'undefined') &&
		!!(window?.__SITESHOT_TAURI__ || window?.__TAURI_INTERNALS__ || window?.__TAURI__ || window?.tauriAPI || window?.electronAPI);

	if (window?.tauriAPI?.writeClipboardImage) {
		try {
			const dataUrl = await blobToDataUrl(copyBlob);
			await window.tauriAPI.writeClipboardImage(dataUrl);
			return;
		} catch (e) {
			lastError = e;
			if (isDesktopRuntime) {
				throw (e instanceof Error ? e : new Error(String(e || 'Native clipboard write failed')));
			}
		}
	}

	// Bridge fallback: direct native invoke for desktop runtimes where tauriAPI wrapper isn't available yet.
	const nativeInvoke = getNativeInvoke();
	if (nativeInvoke) {
		try {
			const dataUrl = await blobToDataUrl(copyBlob);
			await nativeInvoke('clipboard_write_image_data_url', { args: { dataUrl } });
			return;
		} catch (e) {
			lastError = e;
			if (isDesktopRuntime) {
				throw (e instanceof Error ? e : new Error(String(e || 'Native clipboard write failed')));
			}
		}
	}

	if (isDesktopRuntime) {
		throw (lastError instanceof Error ? lastError : new Error('Native clipboard API unavailable in desktop runtime'));
	}

	const canWriteClipboardImage =
		!!navigator.clipboard?.write &&
		typeof ClipboardItem !== 'undefined' &&
		(typeof ClipboardItem?.supports !== 'function' || ClipboardItem.supports('image/png')) &&
		(typeof window === 'undefined' || window.isSecureContext !== false);

	if (canWriteClipboardImage) {
		try {
			await navigator.clipboard.write([new ClipboardItem({ 'image/png': copyBlob })]);
			return;
		} catch (e) {
			lastError = lastError || e;
		}
	}

	// Browser fallback for non-secure contexts: copy a data URL string so users still get output.
	// (Image clipboard writes require secure context by platform policy.)
	try {
		const dataUrl = await blobToDataUrl(copyBlob);
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(dataUrl);
			return;
		}
		if (legacyCopyText(dataUrl)) {
			return;
		}
	} catch (e) {
		lastError = lastError || e;
	}

	console.error('copyImage failed:', lastError);
	throw (lastError instanceof Error ? lastError : new Error(String(lastError || 'Copy failed')));
};

export const processFileUpload = (event, setBlob) => {
	const items =
		(event?.clipboardData || event?.originalEvent?.clipboardData)?.items ||
		event?.target?.files ||
		event?.dataTransfer?.files;

	for (const index in items) {
		const item = items[index];
		if (item?.kind === 'file' || item?.type?.includes('image')) {
			const file = item?.kind ? item.getAsFile() : item;
			const reader = new FileReader();
			reader.onload = (e) => setBlob({ src: e.target.result, w: 0, h: 0 });
			reader.readAsDataURL(file);
			break;
		}
	}
};

export const saveImageAdvanced = async (wrapperRef, blob, opts = {}, editorOptions = null) => {
	if (!blob?.src || !wrapperRef?.current) return;

	const {
		scale = 1,
		format = 'png',
		quality = 0.95,
		fileName = `siteshot-${new Date().toISOString()}`,
		targetWidth,
		targetHeight,
	} = opts;

	const root = wrapperRef.current;
	const wrapperStyle = getComputedStyle(root);

	const tw = Number(targetWidth);
	const th = Number(targetHeight);
	const hasTargetSize = Number.isFinite(tw) && tw > 0 && Number.isFinite(th) && th > 0;

	try {
		// Single capture pass — watermark stays in DOM (no omit/reapply overhead).
		const baseBlob = await createExportableSnapshot(root, {
			backgroundColor: wrapperStyle.backgroundColor,
			editorOptions,
			...(hasTargetSize ? { targetWidth: tw, targetHeight: th } : null),
			omitWatermark: false,
		});

		// If the capture already matches the target size+format, skip re-encoding.
		const needsReEncode = hasTargetSize
			? false // createExportableSnapshot already captured at target dims
			: (Math.abs(Number(scale) - 1) > 0.001 || format !== 'png');

		const finalBlob = needsReEncode
			? await scaleAndEncodeBlob(baseBlob, {
					scale: Number(scale) || 1,
					format,
					quality,
				})
			: (format !== 'png'
				? await scaleAndEncodeBlob(baseBlob, {
						scale: 1,
						format,
						quality,
						...(hasTargetSize ? { targetWidth: tw, targetHeight: th } : null),
					})
				: baseBlob);

		const ext = String(format).toLowerCase() === 'jpeg' ? 'jpg' : String(format).toLowerCase();
		await downloadBlob(finalBlob, `${fileName}.${ext}`);
	} catch (error) {
		console.error('saveImageAdvanced failed:', error);
		try {
			window.dispatchEvent(new CustomEvent('toast:show', {
				detail: {
					kind: 'error',
					message: String(error?.message || error || 'Export failed'),
				},
			}));
		} catch {}
		throw error;
	}
};

// Retained for backward compatibility.
export const saveImage = async (wrapperRef, blob) => {
	await saveImageAdvanced(wrapperRef, blob, { format: 'png', quality: 1 });
};

