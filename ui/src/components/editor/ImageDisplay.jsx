import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classnames from "classnames";
import { createComponentLogger } from '@/utils/core/debugLogger';
import { balanceImage } from '@/utils/image/imageBalance';
import { computeEffectivePaddingPx } from '@/utils/image/paddingPolicy';
import { edgePaletteToGradients, getEdgeColor, getEdgePalette } from '@/utils/image/imageInset';
import { applyBackgroundFxToCanvas, renderBackgroundToCanvas } from '@/utils/image/canvasBackgroundFx';
import { rgbaString } from '@/utils/color/cssColor';
import { computeInsetContentRadiusPx } from '@/utils/image/insetRadius';
import {
  PREVIEW_CORNER_RADIUS_PX,
  buildRadiusStyle,
  getScreenshotRadiusFromOptions,
  snapToHalfPixel,
  snapToDevicePixel,
  boostRgbaAlphaInCssValue,
  normalizeBrowserVariant,
} from '@/utils/image/imageDisplayHelpers';
import {
  getCardShadowPresentationKind,
  getExportBackgroundFrameRadiusPx,
  isExportPresentationReady,
} from '@/utils/export/exportPresentation';
import { loadSafeImage, sampleCanvasEdgePalette } from '@/utils/image/imageDisplayAssets';
export { PREVIEW_CORNER_RADIUS_PX } from '@/utils/image/imageDisplayHelpers';
import { MailIcon, TwitterIcon, VerifiedIcon, YouTubeIcon } from '@/assets/icons.jsx';
import { isAbsoluteFilePath } from '@/utils/platform/pathHelpers';
import { useCanvasAnnotations } from '../overlays/CanvasAnnotations.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import Safari from '../mockups/Safari.jsx';
import WindowsControlIcon from '../mockups/WindowsControlIcon.jsx';

// Create specialized logger for this component
const logger = createComponentLogger('ImageDisplay');
const ACCENT_GRADIENT = '#0b2a6f';
const ACCENT_GRADIENT_VERTICAL = '#0b2a6f';
const BROWSER_BORDER_COLORS = {
  'mac-light': 'rgba(255,255,255,0.88)',
  'mac-dark': 'rgba(22,23,26,0.88)',
  'windows-light': 'rgba(246,248,253,0.92)',
  'windows-dark': 'rgba(32,36,44,0.92)',
  'safari-dark': 'rgba(38,38,38,0.92)',
};
const DEFAULT_BORDER_COLOR = BROWSER_BORDER_COLORS['mac-light'];
const DEFAULT_HUG_SHADOW_PRESET = Object.freeze({
  offsetX: 0,
  offsetY: 10,
  blur: 30,
  spread: 0,
  color: '#000000',
  opacity: 0.5,
});

/**
 * ImageDisplay Component - Renders the screenshot with all styling options applied
 * 
 * @param {Object} props
 * @param {Object} props.options - All styling and display options
 * @param {Object} props.blob - The image blob data
 * @param {Object} props.wrapperRef - Reference to the wrapper element
 */

const ImageDisplay = ({ options, blob, wrapperRef, exportRef, activeTool, onRequestDeselectTool, onAutoDetect, insetColor, onEdgeColorDetected, onTransformChange, onLayoutMetrics, shapeMode, annotationActionsRef }) => {
  const { theme: appTheme } = useTheme();
  const imageRef = useRef(null);
  const exportImageCanvasRef = useRef(null);
  const bgCanvasRef = useRef(null);
  const bgFxCanvasRef = useRef(null);
  const [bgCanvasSize, setBgCanvasSize] = useState({ width: 0, height: 0 });
  const exportingRef = useRef(false);
  const exportScaleRef = useRef(1);
  const exportImageDrawRafRef = useRef(0);
  const [exportScale, setExportScale] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const previewCanvasReadyRef = useRef(false);
  const [previewCanvasReady, setPreviewCanvasReady] = useState(false);
  const canRustFx = typeof window !== 'undefined' && !!window?.tauriAPI?.applyBackgroundFx;

  // For interactive preview and export we bake background FX into canvas pixels.
  const cardRef = useRef(null);
  const wallpaperCacheRef = useRef({ src: null, img: null, revokeUrl: null });
  const bgBaseCacheRef = useRef({ key: null, canvas: null });
  const lastAutoDetectRef = useRef({ src: null, w: null, h: null });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [balanced, setBalanced] = useState(null); // dataUrl of balanced crop
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });
  const onTransformChangeRef = useRef(onTransformChange);
  const positionRotateRef = useRef(options?.position?.rotate || 0);
  onTransformChangeRef.current = onTransformChange;
  positionRotateRef.current = options?.position?.rotate || 0;
  const [edgeColor, setEdgeColor] = useState(null);
  const [edgePalette, setEdgePalette] = useState(null);
  const [hugShadowPreset, setHugShadowPreset] = useState(DEFAULT_HUG_SHADOW_PRESET);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const invoke = window?.tauriAPI?.core?.invoke
          || window?.__TAURI__?.core?.invoke
          || window?.__TAURI_INTERNALS__?.core?.invoke;
        if (typeof invoke !== 'function') return;

        const preset = await invoke('ui_shadow_hug_preset');
        if (cancelled || !preset || typeof preset !== 'object') return;

        setHugShadowPreset({
          offsetX: Number.isFinite(Number(preset.offset_x)) ? Number(preset.offset_x) : DEFAULT_HUG_SHADOW_PRESET.offsetX,
          offsetY: Number.isFinite(Number(preset.offset_y)) ? Number(preset.offset_y) : DEFAULT_HUG_SHADOW_PRESET.offsetY,
          blur: Number.isFinite(Number(preset.blur)) ? Number(preset.blur) : DEFAULT_HUG_SHADOW_PRESET.blur,
          spread: Number.isFinite(Number(preset.spread)) ? Number(preset.spread) : DEFAULT_HUG_SHADOW_PRESET.spread,
          color: typeof preset.color === 'string' && preset.color ? preset.color : DEFAULT_HUG_SHADOW_PRESET.color,
          opacity: Number.isFinite(Number(preset.opacity)) ? Number(preset.opacity) : DEFAULT_HUG_SHADOW_PRESET.opacity,
        });
      } catch {
      }
    };

    run();
    return () => { cancelled = true; };
  }, []);

  // Derive effective inset/border color from detected edge color (fallback to prop if provided)
  // Keep this available early so shadow styles can use it.
  const shouldTintEdges = useMemo(() => {
    const insetPx = Math.max(0, Number(options?.inset?.padding) || 0);
    const borderPx = Math.max(0, Number(options?.borderWidth) || 0);
    return insetPx > 0 || borderPx > 0;
  }, [options?.borderWidth, options?.inset?.padding]);

  const effectiveInsetColor = useMemo(() => {
    // Using the averaged edge color everywhere can look like an unwanted 1px outline.
    // Only tint when we actually need a visible inset/border surface.
    if (!shouldTintEdges) return insetColor || 'transparent';
    return edgeColor || insetColor || 'transparent';
  }, [edgeColor, insetColor, shouldTintEdges]);

  const watermarkHostRef = useRef(null);
  const watermarkElRef = useRef(null);
  const [insideWatermarkCorner, setInsideWatermarkCorner] = useState('bottom-right');

  const { annotationLayer, selectionOverlays, outerCaptureHandlers, clearAllAnnotations } = useCanvasAnnotations({
    activeTool,
    onRequestDeselectTool,
    bgCanvasSize,
    isExporting,
    exportScale,
    penColor: options?.pen?.color,
    shapeMode: shapeMode || 'rect',
  });

  // Expose annotation actions to parent via ref so the annotation bar can reset annotations
  // without having to lift all state out of the canvas annotations hook.
  useEffect(() => {
    if (annotationActionsRef) {
      annotationActionsRef.current = { clearAllAnnotations };
    }
    return () => {
      if (annotationActionsRef) annotationActionsRef.current = null;
    };
  }, [annotationActionsRef, clearAllAnnotations]);

  const setExportReadyAttr = useCallback((ready) => {
    const el = exportRef?.current;
    if (!el) return;
    try {
      if (ready) el.setAttribute('data-export-ready', 'true');
      else el.setAttribute('data-export-ready', 'false');
    } catch {}
  }, [exportRef]);

  // Compute browser bar metrics so we can overlay it without affecting layout scaling
  const browserBarVariant = options?.browserBar;
  const browserFrameScale = options?.browserFrame?.scale;

  const browserBarMetrics = useMemo(() => {
    let variant = normalizeBrowserVariant(browserBarVariant || 'hidden');
    if (!variant || variant === 'hidden') {
      return { enabled: false, scale: 1, height: 0, paddingY: 0, type: null, theme: null, variant: 'hidden' };
    }

    const scale = browserFrameScale || 1;
    const theme = variant.endsWith('dark') ? 'dark' : 'light';

    if (variant.startsWith('windows')) {
      const paddingY = 6 * scale;
      const height = Math.round(30 * scale + paddingY * 2);
      return { enabled: true, scale, paddingY, circleH: 0, height, type: 'windows', theme, variant };
    }

    if (variant.startsWith('mac')) {
      const paddingY = 10 * scale;
      const circleH = 12 * scale;
      const height = Math.round(circleH + paddingY * 2);
      return { enabled: true, scale, paddingY, circleH, height, type: 'mac', theme, variant };
    }

    if (variant.startsWith('safari')) {
      const height = Math.round(52 * scale);
      return { enabled: true, scale, paddingY: 0, circleH: 0, height, type: 'safari', theme: 'dark', variant };
    }

    return { enabled: false, scale: 1, height: 0, paddingY: 0, type: null, theme: null, variant };
  }, [browserBarVariant, browserFrameScale]);

  const screenshotRadius = useMemo(() => {
    return getScreenshotRadiusFromOptions(options);
  }, [options?.cornerRadius, options?.rounded]);

  const useCanvasPreview = screenshotRadius > 0;

  const shouldUseCanvasNow = isExporting || (useCanvasPreview && previewCanvasReady);

  // If the source image changes, the preview canvas must be redrawn before we can rely on it.
  useEffect(() => {
    previewCanvasReadyRef.current = false;
    setPreviewCanvasReady(false);
  }, [blob?.src, balanced?.src, useCanvasPreview]);

  const drawExportImageCanvas = useCallback(() => {
    const canvas = exportImageCanvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    if (typeof canvas.getContext !== 'function') return;

    const naturalW = Number(img.naturalWidth) || 0;
    const naturalH = Number(img.naturalHeight) || 0;
    const cssW = Math.max(1, Math.round(Number(img.offsetWidth) || Number(img.clientWidth) || 0));
    const cssH = Math.max(1, Math.round(Number(img.offsetHeight) || Number(img.clientHeight) || 0));
    if (!naturalW || !naturalH || !cssW || !cssH) return;

    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
    const s = exportingRef.current
      ? Math.max(1, dpr, Number(exportScaleRef.current) || 1)
      : (useCanvasPreview ? Math.max(1, dpr) : 1);
    const pw = Math.max(1, Math.round(cssW * s));
    const ph = Math.max(1, Math.round(cssH * s));

    if (canvas.width !== pw) canvas.width = pw;
    if (canvas.height !== ph) canvas.height = ph;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, pw, ph);
    ctx.imageSmoothingEnabled = true;
    try { ctx.imageSmoothingQuality = 'high'; } catch {}

    const insetPx = Math.max(0, options?.inset?.padding || 0);
    const base = Math.min(layout.displayWidth || 0, layout.displayHeight || 0);
    const insetScale = (!base || insetPx <= 0)
      ? 1
      : Math.max(0.1, (base - insetPx * 2) / base);
    const radius = snapToDevicePixel(
      computeInsetContentRadiusPx({
        screenshotRadiusPx: screenshotRadius,
        insetScale,
      })
    ) * s;
    const clipTop = browserBarMetrics.enabled ? 0 : radius;
    const clipRadius = radius > 0 ? {
      tl: clipTop,
      tr: clipTop,
      br: radius,
      bl: radius,
    } : null;

    const clipRoundedRect = (ctx2d, x, y, w, h, r) => {
      const tl = Math.max(0, Math.min(r.tl || 0, Math.min(w, h) / 2));
      const tr = Math.max(0, Math.min(r.tr || 0, Math.min(w, h) / 2));
      const br = Math.max(0, Math.min(r.br || 0, Math.min(w, h) / 2));
      const bl = Math.max(0, Math.min(r.bl || 0, Math.min(w, h) / 2));
      ctx2d.beginPath();
      ctx2d.moveTo(x + tl, y);
      ctx2d.lineTo(x + w - tr, y);
      if (tr) ctx2d.quadraticCurveTo(x + w, y, x + w, y + tr);
      else ctx2d.lineTo(x + w, y);
      ctx2d.lineTo(x + w, y + h - br);
      if (br) ctx2d.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
      else ctx2d.lineTo(x + w, y + h);
      ctx2d.lineTo(x + bl, y + h);
      if (bl) ctx2d.quadraticCurveTo(x, y + h, x, y + h - bl);
      else ctx2d.lineTo(x, y + h);
      ctx2d.lineTo(x, y + tl);
      if (tl) ctx2d.quadraticCurveTo(x, y, x + tl, y);
      else ctx2d.lineTo(x, y);
      ctx2d.closePath();
      ctx2d.clip();
    };

    // Replicate object-fit: contain.
    const scale = Math.min(pw / naturalW, ph / naturalH);
    const dw = Math.max(1, Math.round(naturalW * scale));
    const dh = Math.max(1, Math.round(naturalH * scale));
    const dx = Math.round((pw - dw) / 2);
    const dy = Math.round((ph - dh) / 2);
    const overdraw = 0.5;

    try {
      if (clipRadius) {
        ctx.save();
        clipRoundedRect(ctx, 0, 0, pw, ph, clipRadius);
      }
      // Fill inset/background color first so letterbox areas (object-fit:contain letterboxing)
      // are solid rather than transparent. This prevents a seam between the image edges and
      // the card background color.
      const fillColor = (typeof window !== 'undefined' && imageRef.current)
        ? (window.getComputedStyle(imageRef.current.parentElement)?.backgroundColor || 'transparent')
        : 'transparent';
      if (!exportingRef.current && fillColor && fillColor !== 'transparent' && fillColor !== 'rgba(0, 0, 0, 0)') {
        ctx.fillStyle = fillColor;
        ctx.fillRect(0, 0, pw, ph);
      }
      ctx.drawImage(img, dx - overdraw, dy - overdraw, dw + overdraw * 2, dh + overdraw * 2);
      if (clipRadius) ctx.restore();
      try {
        canvas.setAttribute('data-export-img-ready', `${s}:${pw}x${ph}`);
      } catch {}
      if (!previewCanvasReadyRef.current) {
        previewCanvasReadyRef.current = true;
        setPreviewCanvasReady(true);
      }
    } catch {
      // Best-effort: if draw fails, keep canvas transparent.
    }
  }, [
    browserBarMetrics.enabled,
    browserBarMetrics.height,
    containerSize.width,
    containerSize.height,
    dimensions.width,
    dimensions.height,
    options.paddingSize,
    options?.aspectMode,
    options?.inset?.padding,
    screenshotRadius,
    useCanvasPreview,
  ]);

  const scheduleExportImageCanvasDraw = useCallback(() => {
    cancelAnimationFrame(exportImageDrawRafRef.current);
    exportImageDrawRafRef.current = requestAnimationFrame(() => {
      drawExportImageCanvas();
      // Draw twice to catch late decode/paint on WebKit.
      exportImageDrawRafRef.current = requestAnimationFrame(drawExportImageCanvas);
    });
  }, [drawExportImageCanvas]);

  // Keep a live measurement of the exported area so the background canvas matches it.
  useEffect(() => {
    const el = exportRef?.current;
    if (!el) return;
    let rafId = 0;
    const update = () => {
      // Use layout pixels (not transformed visual pixels) so export resolution
      // isn't affected by viewport fit scaling.
      const w = Math.max(1, Math.round(el.offsetWidth || 0));
      const h = Math.max(1, Math.round(el.offsetHeight || 0));
      setBgCanvasSize((prev) => (prev.width === w && prev.height === h) ? prev : { width: w, height: h });
    };

    if (typeof ResizeObserver === 'undefined') {
      update();
      window.addEventListener('resize', update);
      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', update);
      };
    }

    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(update);
    });
    ro.observe(el);
    update();

    // Observe export toggles so we can render at the correct capture scale.
    const mo = new MutationObserver(() => {
      const exporting = el.getAttribute('data-exporting') === 'true';
      const nextScale = Math.max(1, Number(el.getAttribute('data-export-scale')) || 1);
      if (exportingRef.current !== exporting) {
        exportingRef.current = exporting;
        setIsExporting(exporting);
        if (exporting) {
          // Reset readiness markers for this export.
          setExportReadyAttr(false);
          try { exportImageCanvasRef.current?.removeAttribute('data-export-img-ready'); } catch {}
          try { bgCanvasRef.current?.removeAttribute('data-bg-render-done'); } catch {}
        } else {
          try { el.removeAttribute('data-export-ready'); } catch {}
          try { exportImageCanvasRef.current?.removeAttribute('data-export-img-ready'); } catch {}
          try { bgCanvasRef.current?.removeAttribute('data-bg-render-done'); } catch {}
        }
        update();
      }

      exportScaleRef.current = nextScale;
      setExportScale((prev) => (Math.abs(prev - nextScale) < 0.001 ? prev : nextScale));

      if (exporting) {
        scheduleExportImageCanvasDraw();
      }
    });
    mo.observe(el, { attributes: true, attributeFilter: ['data-exporting', 'data-export-scale'] });

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      mo.disconnect();
    };
  }, [exportRef, scheduleExportImageCanvasDraw]);

  // When exporting, wait until the background canvas and export image canvas have actually rendered,
  // then signal export readiness for the dom-to-image pipeline.
  useEffect(() => {
    if (!isExporting) return;

    let cancelled = false;
    const startedAt = Date.now();
    const maxMs = 2500;
    let rafId = 0;

    const tick = () => {
      if (cancelled) return;

      const el = exportRef?.current;
      const bg = bgCanvasRef.current;
      const exp = exportImageCanvasRef.current;

      const bgToken = bg?.getAttribute?.('data-bg-render-token') || '';
      const bgDone = bg?.getAttribute?.('data-bg-render-done') || '';
      const bgReady = !!bgToken && bgDone === bgToken;

      const expReady = !!exp?.getAttribute?.('data-export-img-ready');
      const bgFrame = el?.querySelector?.('[data-siteshot-bg-frame="1"]') || null;
      const shadowEl = el?.querySelector?.('.siteshot-card-shadow') || null;
      const presentationReady = isExportPresentationReady({
        isExporting,
        shadowKind: shadowEl?.getAttribute?.('data-export-shadow-kind') || 'none',
        backgroundFrameRadiusPx: Number(bgFrame?.getAttribute?.('data-export-frame-radius') || 0),
      });

      if (el && bgReady && expReady && presentationReady) {
        setExportReadyAttr(true);
        return;
      }

      if (Date.now() - startedAt > maxMs) {
        // Best-effort: allow export to proceed even if a canvas render failed.
        setExportReadyAttr(true);
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    setExportReadyAttr(false);
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [isExporting, exportRef, setExportReadyAttr]);



  // watch container size (replace window resize listener with ResizeObserver so aspect ratio changes trigger recalculation)
  useEffect(() => {
    if (!wrapperRef?.current) return;
    const el = wrapperRef.current;
    let lastW = -1, lastH = -1;
    let rafId = 0;
    const measure = () => {
      const r0 = el.getBoundingClientRect();
      const w0 = Math.round(r0.width), h0 = Math.round(r0.height);
      if (w0 === lastW && h0 === lastH) return;
      lastW = w0; lastH = h0;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setContainerSize({ width: w0, height: h0 }));
    };

    if (typeof ResizeObserver === 'undefined') {
      measure();
      window.addEventListener('resize', measure);
      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', measure);
      };
    }

    const ro = new ResizeObserver((entries) => {
      const entry = entries && entries[0];
      const rect = entry?.contentRect || el.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (w === lastW && h === lastH) return; // no change
      lastW = w; lastH = h;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setContainerSize({ width: w, height: h }));
    });
    ro.observe(el);
    measure();
    return () => { cancelAnimationFrame(rafId); ro.disconnect(); };
  }, [wrapperRef]);
  
  // force re-measure when aspect ratio option changes (guard to avoid redundant setState)
  useEffect(() => {
    if (wrapperRef?.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const w = Math.round(rect.width), h = Math.round(rect.height);
      setContainerSize((prev) => (prev.width === w && prev.height === h) ? prev : { width: w, height: h });
    }
  }, [options.aspectRatio, options.aspectMode, options?.aspectCustom?.w, options?.aspectCustom?.h, options?.aspectAuto?.w, options?.aspectAuto?.h, wrapperRef]);

  // If the underlying image changes while exporting, redraw the export canvas.
  useEffect(() => {
    if (!exportingRef.current) return;
    scheduleExportImageCanvasDraw();
  }, [blob?.src, balanced?.src, scheduleExportImageCanvasDraw]);

  useEffect(() => {
    return () => cancelAnimationFrame(exportImageDrawRafRef.current);
  }, []);
  
  // track image intrinsic size
  useEffect(() => {
    if (imageRef.current && imageRef.current.complete && imageRef.current.naturalWidth) {
      const d = { width: imageRef.current.naturalWidth, height: imageRef.current.naturalHeight };
      if (dimensions.width !== d.width || dimensions.height !== d.height) {
        setDimensions(d);
      }
      if (options.aspectMode === 'auto' && onAutoDetect && d.width && d.height) {
        const last = lastAutoDetectRef.current;
        if (last.src !== blob.src || last.w !== d.width || last.h !== d.height) {
          lastAutoDetectRef.current = { src: blob.src, w: d.width, h: d.height };
          onAutoDetect(d.width, d.height);
        }
      }
      logger.dimensions('image', d);
    }
  }, [blob.src, options.aspectMode, onAutoDetect, dimensions.width, dimensions.height]);
  
  const layout = useMemo(() => {
    const rawPadding = options.paddingSize || 0;
    const positivePaddingBase = Math.max(rawPadding, 0);
    const negPadding = Math.min(rawPadding, 0);
    const { width: cw, height: ch } = containerSize;
    const { width: iw, height: ih } = dimensions;
    const positivePadding = computeEffectivePaddingPx({
      paddingPx: positivePaddingBase,
      aspectMode: options?.aspectMode,
      imageWidth: iw,
      imageHeight: ih,
    });

    if (!cw || !iw || !ih) {
      return { displayWidth: 0, displayHeight: 0, padding: positivePadding, scaleZoom: 1, rawPadding };
    }

    const barH = browserBarMetrics.enabled ? browserBarMetrics.height : 0;
    const zoomFactor = negPadding < 0 ? 1 + Math.min(Math.abs(negPadding) / 100, 3) : 1;

    // Auto aspect mode: width-driven sizing only to avoid ResizeObserver feedback loops.
    // The wrapper has no fixed aspect-ratio CSS, so its height is determined by its content.
    // This guarantees equal pixel padding on all four sides around the screenshot card.
    const isAuto = options?.aspectMode === 'auto' || !options?.aspectMode;
    if (isAuto) {
      const baseW = Math.max(cw - positivePadding * 2, 1);
      const baseH = baseW * ih / iw;
      const displayWidth = Math.max(1, snapToDevicePixel(baseW * zoomFactor));
      const displayHeight = Math.max(1, snapToDevicePixel(baseH * zoomFactor));
      return { displayWidth, displayHeight, padding: positivePadding, scaleZoom: zoomFactor, rawPadding };
    }

    if (!ch) {
      return { displayWidth: 0, displayHeight: 0, padding: positivePadding, scaleZoom: 1, rawPadding };
    }
    const availW = Math.max(cw - positivePadding * 2, 0);
    const availH = Math.max(ch - positivePadding * 2 - barH, 0);
    const r = ih / iw;

    // Determine limiting axis, compute that dimension first (integer), derive the other to maintain ratio
    const scaleW = availW / iw;
    const scaleH = availH / ih;
    const limitByW = scaleW <= scaleH;

    // Preserve fractional CSS sizes to avoid 1px gaps caused by rounding aspect ratios.
    // These show up as thin seams when the container ratio is off by a tiny amount.
    let baseW, baseH;
    if (limitByW) {
      baseW = availW;
      baseH = baseW * r;
      // Guard against floating drift.
      if (baseH > availH) {
        baseH = availH;
        baseW = baseH / r;
      }
    } else {
      baseH = availH;
      baseW = baseH / r;
      if (baseW > availW) {
        baseW = availW;
        baseH = baseW * r;
      }
    }

    // Apply zoom for negative padding (zoom in)
    const displayWidth = Math.max(1, snapToDevicePixel(baseW * zoomFactor));
    const displayHeight = Math.max(1, snapToDevicePixel(baseH * zoomFactor));

    return { displayWidth, displayHeight, padding: positivePadding, scaleZoom: zoomFactor, rawPadding };
  }, [options.paddingSize, options.aspectMode, containerSize, dimensions, browserBarMetrics]);

  // Compute inset scale so the image scales from center, simulating an inner padding
  const insetScale = useMemo(() => {
    const insetPx = Math.max(0, options?.inset?.padding || 0);
    const base = Math.min(layout.displayWidth || 0, layout.displayHeight || 0);
    if (!base || insetPx <= 0) return 1;
    const scaled = (base - insetPx * 2) / base;
    // Clamp to avoid negative or too tiny scales
    return Math.max(0.1, scaled);
  }, [options?.inset?.padding, layout.displayWidth, layout.displayHeight]);

  // Derive explicit inner size to avoid fractional transform rounding
  const insetInnerSize = useMemo(() => {
    // Avoid rounding here; rounding reintroduces aspect drift that can produce 1px seams.
    const w = (layout.displayWidth || 0) * insetScale;
    const h = (layout.displayHeight || 0) * insetScale;
    return { width: snapToDevicePixel(w || 0), height: snapToDevicePixel(h || 0) };
  }, [layout.displayWidth, layout.displayHeight, insetScale]);

  // Calculate styles for shadow (memoized — only recalculates when shadow options change)
  const shadowStyles = useMemo(() => {
    if (options?.advancedShadow?.enabled) {
      const { offsetX = 0, offsetY = 10, blur = 30, spread = 0, color = "#000000", opacity = 0.5 } = options.advancedShadow;

      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);

      const rgba = `rgba(${r}, ${g}, ${b}, ${opacity})`;

      return {
        boxShadow: `${offsetX}px ${offsetY}px ${blur}px ${spread}px ${rgba}`,
        // Fallback for contexts where box-shadow gets clipped by overflow/masking.
        filter: `drop-shadow(${offsetX}px ${offsetY}px ${blur}px ${rgba})`,
      };
    }

    switch(options.shadow) {
      case "Heavy":
        return {
          boxShadow: `0px 50px 90px 20px rgba(0, 0, 0, 0.7)`,
            filter: `drop-shadow(0px 50px 90px rgba(0, 0, 0, 0.7))`,
        };
      case "Ambient":
        // Edge-hugging ambient shadow tinted by the screenshot's detected edge color.
        // Uses a dedicated multi-colored glow layer (derived from edge pixels).
        {
          return {
            boxShadow: 'none',
            filter: 'none',
          };
        }
      case "Hug":
      {
        const { offsetX, offsetY, blur, spread, color, opacity } = hugShadowPreset;
        const r = parseInt(String(color).slice(1, 3), 16);
        const g = parseInt(String(color).slice(3, 5), 16);
        const b = parseInt(String(color).slice(5, 7), 16);
        const rgba = `rgba(${Number.isFinite(r) ? r : 0}, ${Number.isFinite(g) ? g : 0}, ${Number.isFinite(b) ? b : 0}, ${opacity})`;
        return {
          boxShadow: `${offsetX}px ${offsetY}px ${blur}px ${spread}px ${rgba}`,
          filter: `drop-shadow(${offsetX}px ${offsetY}px ${blur}px ${rgba})`,
        };
      }
      case "Hug (Default)": // Keep this for backward compatibility
      {
        const { offsetX, offsetY, blur, spread, color, opacity } = hugShadowPreset;
        const r = parseInt(String(color).slice(1, 3), 16);
        const g = parseInt(String(color).slice(3, 5), 16);
        const b = parseInt(String(color).slice(5, 7), 16);
        const rgba = `rgba(${Number.isFinite(r) ? r : 0}, ${Number.isFinite(g) ? g : 0}, ${Number.isFinite(b) ? b : 0}, ${opacity})`;
        return {
          boxShadow: `${offsetX}px ${offsetY}px ${blur}px ${spread}px ${rgba}`,
          filter: `drop-shadow(${offsetX}px ${offsetY}px ${blur}px ${rgba})`,
        };
      }
      case "Realistic":
        return {
          boxShadow: "25px 40px 60px 8px rgba(0, 0, 0, 0.7)",
            filter: `drop-shadow(25px 40px 60px rgba(0, 0, 0, 0.7))`,
        };
      case "None":
      default:
        return {
          boxShadow: "none",
          filter: 'none',
        };
    }
  }, [options?.shadow, options?.advancedShadow, hugShadowPreset]);

  // Card radius styles need to be computed before any memo that references them.
  const cardRadiusStyle = useMemo(() => buildRadiusStyle(screenshotRadius, false), [screenshotRadius]);
  const innerContentRadius = useMemo(() => {
    const px = computeInsetContentRadiusPx({
      screenshotRadiusPx: screenshotRadius,
      insetScale,
    });
    return snapToDevicePixel(px);
  }, [screenshotRadius, insetScale]);
  const contentRadiusStyle = useMemo(
    () => buildRadiusStyle(innerContentRadius, browserBarMetrics.enabled),
    [innerContentRadius, browserBarMetrics.enabled]
  );
  const screenshotContentRadiusStyle = useMemo(() => {
    const radiusPx = Math.max(0, innerContentRadius);
    if (!browserBarMetrics.enabled) {
      return { borderRadius: `${radiusPx}px` };
    }
    return {
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      borderBottomLeftRadius: `${radiusPx}px`,
      borderBottomRightRadius: `${radiusPx}px`,
    };
  }, [innerContentRadius, browserBarMetrics.enabled]);
  const exportBackgroundRadius = useMemo(
    () => getExportBackgroundFrameRadiusPx({ isExporting, previewRadiusPx: PREVIEW_CORNER_RADIUS_PX }),
    [isExporting]
  );
  const screenshotAmbientGlowStyle = useMemo(() => {
    if (isExporting) return null;
    if (options?.shadow !== 'Ambient') return null;

    const thicknessPx = 56;
    const blurPx = 24;

    if (edgePalette?.top?.length || edgePalette?.right?.length || edgePalette?.bottom?.length || edgePalette?.left?.length) {
      const gradients = edgePaletteToGradients(edgePalette);
      return {
        position: 'absolute',
        inset: `-${thicknessPx / 2}px`,
        zIndex: 0,
        pointerEvents: 'none',
        borderRadius: `${Math.max(0, screenshotRadius) + thicknessPx / 2}px`,
        backgroundImage: [
          gradients.top,
          gradients.right,
          gradients.bottom,
          gradients.left,
        ].join(', '),
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'top left, top right, bottom left, top left',
        backgroundSize: `100% ${thicknessPx}px, ${thicknessPx}px 100%, 100% ${thicknessPx}px, ${thicknessPx}px 100%`,
        filter: `blur(${blurPx}px) saturate(1.28)`,
        opacity: 0.45,
        transform: 'translateZ(0)',
      };
    }

    if (!edgeColor || edgeColor === 'transparent') return null;

    return {
      position: 'absolute',
      inset: `-${thicknessPx / 2}px`,
      zIndex: 0,
      pointerEvents: 'none',
      borderRadius: `${Math.max(0, screenshotRadius) + thicknessPx / 2}px`,
      boxShadow: `0 0 ${Math.round(blurPx * 2)}px ${Math.round(thicknessPx / 3)}px ${edgeColor}`,
      opacity: 0.34,
      transform: 'translateZ(0)',
    };
  }, [isExporting, options?.shadow, edgePalette, edgeColor, screenshotRadius]);
  // Preview uses box-shadow; export uses drop-shadow (dom-to-image needs filter-based shadows).
  const effectiveCardShadowStyles = isExporting
    ? {
        boxShadow: 'none',
        filter: shadowStyles?.filter || 'none',
      }
    : {
        boxShadow: shadowStyles?.boxShadow || 'none',
        filter: 'none',
      };
  const shadowPresentationKind = useMemo(
    () => getCardShadowPresentationKind({ isExporting, shadowStyles }),
    [isExporting, shadowStyles]
  );

  // Inline browser bar (pushes image content downward inside rounded wrapper) plus integrates watermark when enabled
  const renderBrowserBar = () => {
    if (!browserBarMetrics.enabled) return null;
    const { scale, paddingY, height, type, theme } = browserBarMetrics;

    if (type === 'safari') {
      const safariUrl = String(options?.browserUrl || '').trim();
      return (
        <div
          style={{
            height,
            transform: 'translateZ(0)',
            willChange: 'transform',
            overflow: 'hidden',
          }}
        >
          <Safari url={safariUrl} uiScale={scale} enableControls className="w-full h-full rounded-b-none" />
        </div>
      );
    }

    if (type === 'windows') {
      const baseBg = theme === 'dark'
        ? 'rgba(32,36,44,0.92)'
        : 'rgba(246,248,253,0.92)';
      const baseFg = theme === 'dark'
        ? 'rgba(255,255,255,0.85)'
        : 'rgba(15,18,27,0.80)';
      const hoverBase = theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/10';
      const closeHover = theme === 'dark' ? 'hover:bg-[#E81123]' : 'hover:bg-[#F1707A]';
      const buttonText = theme === 'dark' ? 'text-white/80' : 'text-slate-900/80';

      const controls = [
        { variant: 'minimize', title: 'Minimize', hover: hoverBase },
        { variant: 'maximize', title: 'Maximize', hover: hoverBase },
        { variant: 'close', title: 'Close', hover: closeHover }
      ];

      const gapPx = Math.max(4, Math.round(6 * scale));
      const buttonW = Math.round(32 * scale);
      const buttonH = Math.round(24 * scale);
      const iconPx = Math.round(14 * scale);
      const rightPadPx = Math.max(6, Math.round(8 * scale));
      const leftPadPx = Math.max(10, Math.round(12 * scale));

      const separatorColor = theme === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(15,18,27,0.08)';

      return (
        <div
          className="flex items-center w-full rounded-b-none"
          style={{
            padding: `${paddingY}px ${rightPadPx}px ${paddingY}px ${leftPadPx}px`,
            height,
            boxSizing: 'border-box',
            // Avoid layout-affecting borders (can create 1px bottom seams when combined
            // with fixed heights + transforms). Use an inset shadow instead.
            boxShadow: `inset 0 -1px 0 ${separatorColor}`,
            backgroundColor: baseBg,
            color: baseFg,
            transform: 'translateZ(0)',
            willChange: 'transform',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
          }}
        >
          <div className="ml-auto flex items-center justify-end" style={{ gap: gapPx, width: '100%' }}>
            {controls.map(({ variant, title, hover }) => (
              <button
                key={variant}
                type="button"
                className={`transition-colors ${buttonText} ${hover}`}
                title={title}
                aria-label={title}
                style={{ width: buttonW, height: buttonH, display: 'grid', placeItems: 'center', borderRadius: 4 }}
              >
                <WindowsControlIcon variant={variant} size={iconPx} />
              </button>
            ))}
          </div>
        </div>
      );
    }

    const baseBg = theme === 'dark' ? 'rgba(40,40,48,0.9)' : 'rgba(255,255,255,0.85)';
    const baseFg = theme === 'dark' ? 'rgba(255,255,255,0.85)' : 'rgba(15,18,27,0.80)';
    const dotColors = theme === 'dark'
      ? ['#f87171', '#facc15', '#34d399']
      : ['#fb7185', '#fde047', '#4ade80'];
    const macPad = Math.max(10, Math.round(20 * scale));
    return (
      <div
        className="flex items-center w-full rounded-b-none"
        style={{
          padding: `${paddingY}px ${macPad}px`,
          height,
          boxSizing: 'border-box',
          backgroundColor: baseBg,
          color: baseFg,
          transform: 'translateZ(0)',
          willChange: 'transform',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
        }}
      >
        <div className="flex items-center" style={{ gap: 8, transform: `scale(${scale})`, transformOrigin: 'left center' }}>
          {dotColors.map((color, idx) => (
            <span
              key={idx}
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                borderRadius: 9999,
                backgroundColor: color,
              }}
            />
          ))}
        </div>
        <div className="flex-1" />
      </div>
    );
  };

  // Derive effective aspect class or custom style
  const aspectWrapperProps = useMemo(() => {
    if (options.aspectMode === 'preset') {
      const ratio = (() => {
        const v = String(options.aspectRatio || '');
        if (v === 'aspect-square') return '1 / 1';
        if (v === 'aspect-video') return '16 / 9';
        const m = v.match(/aspect-\[(\d+)\/(\d+)\]/);
        if (m) return `${m[1]} / ${m[2]}`;
        return null;
      })();
      return ratio
        ? { className: '', style: { aspectRatio: ratio } }
        : { className: options.aspectRatio, style: {} };
    }
    if (options.aspectMode === 'auto') {
      // No fixed aspect-ratio: the wrapper resizes naturally with the card + padding content.
      // This prevents the ResizeObserver feedback loop and enables truly equal padding on all sides.
      return { className: '', style: {} };
    }
    const { w, h } = options.aspectCustom || { w: 1, h: 1 };
    return { className: '', style: { aspectRatio: `${w} / ${h}` } };
  }, [options.aspectMode, options.aspectRatio, options.aspectCustom, options.aspectAuto]);

  // Compute transform origin relative to inner screenshot box center including browser bar offset
  const screenshotBoxCenter = useMemo(() => {
    const barH = browserBarMetrics.enabled ? browserBarMetrics.height : 0;
    const h = layout.displayHeight + barH;
    const y = h / 2; // center inclusive of bar
    return { x: 0.5, y }; // x as percentage, y in px for fine control
  }, [layout.displayHeight, browserBarMetrics]);

  // Compute transform CSS for position and tilt
  const transformStyle = useMemo(() => {
    const tx = snapToHalfPixel(options.position?.x || 0);
    const ty = snapToHalfPixel(options.position?.y || 0);
    const rz = options.position?.rotate || 0;
    const rx = options.tilt?.x || 0;
    const ry = options.tilt?.y || 0;
    // Avoid creating a 3D rendering context when no tilt is applied.
    // WebKit + dom-to-image foreignObject capture is particularly fragile with
    // `perspective()` even when rotations are 0, and can produce blank/black
    // image content in exports.
    const hasTilt = Math.abs(rx) > 0.0001 || Math.abs(ry) > 0.0001;
    if (!hasTilt) {
      return `translate3d(${tx}px, ${ty}px, 0) rotateZ(${rz}deg)`;
    }
    return `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translate3d(${tx}px, ${ty}px, 0) rotateZ(${rz}deg)`;
  }, [options.position?.x, options.position?.y, options.position?.rotate, options.tilt?.x, options.tilt?.y]);

  // Detect averaged edge color when the image is available
  useEffect(() => {
    setEdgeColor(null);
    setEdgePalette(null);
    let disposed = false;
    const run = async () => {
      try {
        const img = imageRef.current;
        if (!img || !img.naturalWidth) return;
        const col = await getEdgeColor(img, { alpha: false });
        if (!disposed) {
          setEdgeColor(col);
          onEdgeColorDetected && onEdgeColorDetected(col);
        }

        // Keep screenshot ambient palette behavior tied to Ambient shadow mode.
        if (options?.shadow === 'Ambient') {
          const pal = await getEdgePalette(img, { samples: 28, edgeSize: 20, minAlpha: 16 });
          if (!disposed) {
            setEdgePalette(pal);
          }
        }
      } catch (_) {}
    };
    run();
    return () => { disposed = true; };
  }, [blob?.src, options?.shadow]);

  const screenshotBorder = useMemo(() => {
    const rawWidth = Math.max(0, Number(options?.borderWidth) || 0);
    const width = Math.round(rawWidth);
    if (!width) return null;
    const variant = normalizeBrowserVariant(browserBarVariant || 'hidden');
    const customColor = typeof options?.borderColor === 'string' ? options.borderColor.trim() : '';
    const color = customColor || BROWSER_BORDER_COLORS[variant] || DEFAULT_BORDER_COLOR;
    const theme = color === DEFAULT_BORDER_COLOR ? 'light' : (variant && variant.endsWith('dark') ? 'dark' : 'light');
    return { width, color, theme, variant };
  }, [options?.borderWidth, options?.borderColor, browserBarVariant]);

  // Cosmetic radius for wallpaper display (not affecting export)
  const cosmeticRadius = useMemo(() => {
    return Math.max(PREVIEW_CORNER_RADIUS_PX, screenshotRadius);
  }, [screenshotRadius]);

  // The screenshot card itself should remain fully rounded.
  // Only the image content under a browser bar should have flattened top corners.

  // Recompute balanced version when enabled or image changes
  useEffect(() => {
    let cancelled = false;
    let cleanupUrl = null;
    const run = async () => {
      try {
        if (!options?.balance?.enabled || !blob?.src) {
          setBalanced(null);
          return;
        }

        // Important: drop any previous balanced output immediately so a new image
        // never temporarily renders the old balanced crop.
        setBalanced(null);
        const baseSrc = blob.src;

        logger.balance('trigger', {
          enabled: true,
          srcType: typeof blob?.src,
          srcPrefix: typeof blob?.src === 'string' ? blob.src.slice(0, 24) : null,
        });

        // Prefer the already-loaded <img> element to avoid CORS/taint issues
        let sourceEl = null;
        if (imageRef.current && imageRef.current.complete && imageRef.current.naturalWidth) {
          sourceEl = imageRef.current;
        } else {
          const { img, revokeUrl } = await loadSafeImage(blob.src);
          cleanupUrl = revokeUrl;
          sourceEl = img;
        }

        // Auto Layout / Balance
        const { dataUrl, dimensions: d } = await balanceImage(sourceEl, {});
        if (!cancelled) {
          setBalanced({ baseSrc, src: dataUrl, w: d.width, h: d.height });
        }
      } catch (e) {
        logger.error('balance', e);
        if (!cancelled) setBalanced(null);
      }
    };
    run();
    return () => { cancelled = true; if (cleanupUrl) URL.revokeObjectURL(cleanupUrl); };
  }, [blob.src, options?.balance?.enabled]);

  const effectiveImageSrc = (balanced && balanced.baseSrc === blob?.src && balanced.src)
    ? balanced.src
    : blob?.src;

  // Keep preview canvas in sync to avoid missing pixels on rounded corners.
  useEffect(() => {
    if (!useCanvasPreview || isExporting) return;
    scheduleExportImageCanvasDraw();
  }, [useCanvasPreview, isExporting, scheduleExportImageCanvasDraw, layout.displayWidth, layout.displayHeight, insetInnerSize.width, insetInnerSize.height, effectiveImageSrc]);

  const barHForOverflow = browserBarMetrics.enabled ? browserBarMetrics.height : 0;
  const contentOverflows = (layout.displayHeight + barHForOverflow + (layout.padding || 0) * 2) > ((containerSize.height || 0) + 1);
  const paddedFrameWidth = Math.max(1, (layout.displayWidth || 0) + (layout.padding || 0) * 2);
  const paddedFrameHeight = Math.max(1, (layout.displayHeight || 0) + barHForOverflow + (layout.padding || 0) * 2);

  const canDragScreenshot = !activeTool;

  const watermarkPosition = options?.watermark?.position || 'inside';
  const isWatermarkInside = watermarkPosition === 'inside';
  const watermarkOffsetX = Number.isFinite(Number(options?.watermark?.offsetX)) ? Number(options?.watermark?.offsetX) : 0;
  const watermarkOffsetY = Number.isFinite(Number(options?.watermark?.offsetY)) ? Number(options?.watermark?.offsetY) : 0;
  const watermarkPrefix = (() => {
    const raw = options?.watermark?.prefix;
    if (raw === 'twitter' || raw === 'mail' || raw === 'youtube' || raw === 'none') return raw;
    return options?.watermark?.showTwitter ? 'twitter' : 'none';
  })();

  // If the screenshot is moved such that an inside watermark corner would be clipped by the export root,
  // pick another inside corner that remains visible.
  useEffect(() => {
    if (!options?.watermark?.enabled) return;
    if (!isWatermarkInside) return;

    let rafId = 0;

    const update = () => {
      const root = exportRef?.current;
      const host = watermarkHostRef.current;
      const el = watermarkElRef.current;
      if (!root || !host || !el) return;

      const rootRect = root.getBoundingClientRect();
      const hostRect = host.getBoundingClientRect();
      const w = Math.max(1, Math.round(el.offsetWidth || 0));
      const h = Math.max(1, Math.round(el.offsetHeight || 0));
      if (!w || !h) return;

      const pad = 12;
      const order = ['bottom-right', 'top-right', 'bottom-left', 'top-left'];

      const fits = (corner) => {
        const x0 = corner.endsWith('right')
          ? (hostRect.right - pad - w)
          : (hostRect.left + pad);
        const y0 = corner.startsWith('top')
          ? (hostRect.top + pad)
          : (hostRect.bottom - pad - h);

        const x = x0 + watermarkOffsetX;
        const y = y0 + watermarkOffsetY;

        // Ensure the watermark box is fully inside the export root.
        return (
          x >= rootRect.left + 1 &&
          y >= rootRect.top + 1 &&
          (x + w) <= rootRect.right - 1 &&
          (y + h) <= rootRect.bottom - 1
        );
      };

      const next = order.find(fits) || 'bottom-right';
      setInsideWatermarkCorner((prev) => (prev === next ? prev : next));
    };

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [
    options?.watermark?.enabled,
    watermarkPosition,
    isWatermarkInside,
    options?.watermark?.text,
    options?.watermark?.showTwitter,
    options?.watermark?.showVerified,
    options?.watermark?.prefix,
    options?.watermark?.offsetX,
    options?.watermark?.offsetY,
    options.position?.x,
    options.position?.y,
    options.position?.rotate,
    options.tilt?.x,
    options.tilt?.y,
    layout.displayWidth,
    layout.displayHeight,
    browserBarMetrics.enabled,
    browserBarMetrics.height,
    exportRef,
  ]);

  const WatermarkPill = React.useCallback(
    ({ attachRef = false } = {}) => {
      // Keep watermark styling consistent across themes.
      const bg = 'rgba(15,17,21,0.35)';
      const fg = '#ffffff';
      const border = '1px solid rgba(255,255,255,0.10)';

      return (
        <div
          ref={attachRef ? watermarkElRef : undefined}
          className="relative text-[10px] md:text-[11px] font-medium tracking-wide px-2 py-1 rounded-md flex items-center gap-1.5 shadow-lg whitespace-nowrap"
          style={{ color: fg }}
          data-watermark="1"
        >
          <div
            aria-hidden="true"
            className="absolute rounded-md"
            style={{
              top: -6,
              left: -6,
              right: -6,
              bottom: -6,
              background: bg,
              filter: 'blur(6px)',
              transform: 'translateZ(0)',
              opacity: 0.95,
            }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-md"
            style={{ background: bg, border }}
          />

          <div className="relative z-10 flex items-center gap-1">
            {watermarkPrefix !== 'none' && (
              <span
                className="inline-flex flex-shrink-0 items-center justify-center"
                aria-hidden="true"
                style={{
                  opacity: 0.92,
                  /* YouTube's filled rect occupies ~58% of its viewBox height,
                     so scale it up so its pixel content matches text cap-height.
                     Mail envelope: ~67% fill. Others are fine at 1em. */
                  width: watermarkPrefix === 'youtube' ? '1.7em' : '1em',
                  height: watermarkPrefix === 'youtube' ? '1.7em' : '1em',
                }}
              >
                {watermarkPrefix === 'twitter' ? <TwitterIcon /> : null}
                {watermarkPrefix === 'mail' ? <MailIcon /> : null}
                {watermarkPrefix === 'youtube' ? <YouTubeIcon /> : null}
              </span>
            )}
            <span style={{ opacity: 0.92 }}>
              {(typeof options?.watermark?.text === 'string' && options.watermark.text.length)
                ? options.watermark.text
                : 'Made with SiteShot'}
            </span>
            {options?.watermark?.showVerified && (
              <span
                className="inline-flex flex-shrink-0 items-center justify-center"
                aria-hidden="true"
                style={{ opacity: 0.92, width: '1em', height: '1em' }}
              >
                <VerifiedIcon />
              </span>
            )}
          </div>
        </div>
      );
    },
    [appTheme, options?.watermark?.showVerified, options?.watermark?.text, watermarkPrefix]
  );

  // Canvas-relative outside watermark: all non-inside positions except
  // "below screenshot" (center-bottom), which intentionally follows the card.
  const renderOutsideWatermark = () => {
    if (!options?.watermark?.enabled) return null;
    if (isWatermarkInside) return null;

    const inset = 12;
    const pos = watermarkPosition;

    // "Below screenshot" follows the card transform — handled by renderBelowCardWatermark.
    if (pos === 'center-bottom') return null;

    const style = (() => {
      switch (pos) {
        case 'center-top':
          return {
            top: `${inset}px`,
            left: '50%',
            transform: `translateX(-50%) translate(${watermarkOffsetX}px, ${watermarkOffsetY}px)`,
          };
        case 'bottom-left':
          return {
            bottom: `${inset}px`,
            left: `${inset}px`,
            transform: `translate(${watermarkOffsetX}px, ${watermarkOffsetY}px)`,
          };
        case 'bottom-right':
          return {
            bottom: `${inset}px`,
            right: `${inset}px`,
            transform: `translate(${watermarkOffsetX}px, ${watermarkOffsetY}px)`,
          };
        case 'top-left':
          return {
            top: `${inset}px`,
            left: `${inset}px`,
            transform: `translate(${watermarkOffsetX}px, ${watermarkOffsetY}px)`,
          };
        case 'top-right':
          return {
            top: `${inset}px`,
            right: `${inset}px`,
            transform: `translate(${watermarkOffsetX}px, ${watermarkOffsetY}px)`,
          };
        default:
          return {
            bottom: `${inset}px`,
            right: `${inset}px`,
            transform: `translate(${watermarkOffsetX}px, ${watermarkOffsetY}px)`,
          };
      }
    })();

    return (
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 80 }}>
        <div className="absolute flex items-end" style={style}>
          <WatermarkPill />
        </div>
      </div>
    );
  };

  // Card-relative watermark for "below screenshot": follows the card's position/transform
  // so it stays anchored just below the screenshot card even when the card is dragged.
  const renderBelowCardWatermark = () => {
    if (!options?.watermark?.enabled) return null;
    if (isWatermarkInside) return null;

    const pos = watermarkPosition;
    if (pos !== 'center-bottom') return null;

    const barH = browserBarMetrics.enabled ? browserBarMetrics.height : 0;
    const cardH = (layout.displayHeight || 0) + barH;
    const cardW = layout.displayWidth || 0;
    const gap = 12;

    const style = (() => {
      return {
        top: `calc(100% + ${gap}px)`,
        left: '50%',
        transform: `translateX(-50%) translate(${watermarkOffsetX}px, ${watermarkOffsetY}px)`,
      };
    })();

    return (
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 80 }}>
        <div className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: 'none' }}>
          <div
            className="relative"
            style={{
              width: cardW || undefined,
              height: cardH || undefined,
              transform: transformStyle,
              transformOrigin: `${screenshotBoxCenter.x * 100}% ${screenshotBoxCenter.y}px`,
              overflow: 'visible',
            }}
          >
            <div className="absolute flex items-start" style={style}>
              <WatermarkPill />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTopInsideWatermark = () => {
    if (!options?.watermark?.enabled) return null;
    if (!isWatermarkInside) return null;
    const barH = browserBarMetrics.enabled ? browserBarMetrics.height : 0;
    const height = (layout.displayHeight || 0) + barH;

    return (
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 80 }}>
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="relative"
            style={{
              width: layout.displayWidth || undefined,
              height: height || undefined,
              transform: transformStyle,
              transformOrigin: `${screenshotBoxCenter.x * 100}% ${screenshotBoxCenter.y}px`,
            }}
          >
            <div
              className="absolute"
              style={(() => {
                const pad = 12;
                switch (insideWatermarkCorner) {
                  case 'top-left':
                    return { top: pad, left: pad, transform: `translate(${watermarkOffsetX}px, ${watermarkOffsetY}px)` };
                  case 'top-right':
                    return { top: pad, right: pad, transform: `translate(${watermarkOffsetX}px, ${watermarkOffsetY}px)` };
                  case 'bottom-left':
                    return { bottom: pad, left: pad, transform: `translate(${watermarkOffsetX}px, ${watermarkOffsetY}px)` };
                  case 'bottom-right':
                  default:
                    return { bottom: pad, right: pad, transform: `translate(${watermarkOffsetX}px, ${watermarkOffsetY}px)` };
                }
              })()}
            >
              <WatermarkPill attachRef />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Report current screenshot-card dimensions so presets can store proportional transforms.
  useEffect(() => {
    const cardWidth = Math.round(layout.displayWidth || 0);
    const cardHeight = Math.round((layout.displayHeight || 0) + (browserBarMetrics.enabled ? browserBarMetrics.height : 0));
    onLayoutMetrics && onLayoutMetrics({ cardWidth, cardHeight });
  }, [layout.displayWidth, layout.displayHeight, browserBarMetrics.enabled, browserBarMetrics.height, onLayoutMetrics]);

  // Pointer/drag to move
  const onPointerDownMove = (e) => {
    if (!canDragScreenshot) return;
    if (!layout.displayWidth) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: options.position?.x || 0,
      y: options.position?.y || 0,
      startX: e.clientX,
      startY: e.clientY
    };
    e.stopPropagation();
    e.preventDefault();
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    const s = dragStartRef.current;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    let nx = s.x + dx;
    let ny = s.y + dy;
    if (Math.abs(nx) < 5) nx = 0;
    if (Math.abs(ny) < 5) ny = 0;
    const cb = onTransformChangeRef.current;
    cb && cb({ x: nx, y: ny, rotate: positionRotateRef.current });
    e.preventDefault();
  };

  const onPointerUp = () => {
    setIsDragging(false);
  };

  // Wire global pointer listeners — only re-subscribe when isDragging toggles
  useEffect(() => {
    if (!isDragging) return;
    const move = (ev) => {
      const s = dragStartRef.current;
      const dx = ev.clientX - s.startX;
      const dy = ev.clientY - s.startY;
      let nx = s.x + dx;
      let ny = s.y + dy;
      if (Math.abs(nx) < 5) nx = 0;
      if (Math.abs(ny) < 5) ny = 0;
      const cb = onTransformChangeRef.current;
      cb && cb({ x: nx, y: ny, rotate: positionRotateRef.current });
      ev.preventDefault();
    };
    const up = () => setIsDragging(false);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [isDragging]);

  const applyFxWithRust = useCallback(async ({ baseCanvas, blurPx = 0, brightness = 1 }) => {
    if (!baseCanvas || typeof baseCanvas.toBlob !== 'function') return null;
    if (!window?.tauriAPI?.applyBackgroundFx) return null;

    const blob = await new Promise((resolve) => {
      try {
        baseCanvas.toBlob((b) => resolve(b), 'image/png');
      } catch {
        resolve(null);
      }
    });
    if (!blob) return null;

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const res = await window.tauriAPI.applyBackgroundFx({ bytes, blurPx, brightness });
    const assetUrl = res?.assetUrl || (res?.filePath ? window.tauriAPI.filePathToAssetUrl?.(res.filePath) : null) || res?.filePath;
    if (!assetUrl) return null;

    const { img, revokeUrl } = await loadSafeImage(assetUrl);
    return { img, revokeUrl };
  }, []);

  // Render background (gradient or wallpaper) into a canvas.
  // Export: bake blur/brightness into pixels.
  // Preview: apply blur/brightness via SVG filter (WebKit canvas ctx.filter blur can be unreliable).
  useEffect(() => {
    let cancelled = false;
    const token = (Date.now() + Math.random()) + '';

    const run = async () => {
      const canvas = bgCanvasRef.current;
      if (!canvas) return;
      const { width, height } = bgCanvasSize;
      if (!width || !height) return;

      // Mark this render as the latest before any async work begins.
      // Older async renders will bail out if a newer token is present.
      canvas.setAttribute('data-bg-render-token', token);

      const blur = Math.max(0, Number(options?.fx?.blur) || 0);
      const brightness = Number.isFinite(Number(options?.fx?.brightness)) ? Number(options?.fx?.brightness) : 1;

      const shouldApplyFx = options?.backgroundType !== 'transparent' && (blur > 0.0001 || Math.abs(brightness - 1) > 0.0001);
      // Preview/export parity: bake blur/brightness into canvas pixels in both modes.
      // This avoids preview-only SVG filter edge artifacts (1px seam-like lines).
      const shouldBakeFxInCanvas = shouldApplyFx;
      const canUseRustFx = exportingRef.current && canRustFx;

      const isWallpaper = options?.backgroundType === 'wallpaper' && options?.wallpaper;
      const isTransparent = options?.backgroundType === 'transparent';
      const isBlobGradient = options?.backgroundType === 'blobGradient';
      const gradientAngleDeg = Number.isFinite(Number(options?.customTheme?.angleDeg))
        ? Number(options?.customTheme?.angleDeg)
        : 135;
      const background = isWallpaper
        ? { type: 'wallpaper' }
        : isTransparent
          ? { type: 'transparent' }
        : isBlobGradient
          ? { type: 'blobGradient', config: options?.blobGradient || {} }
          : {
              type: 'gradient',
              angleDeg: gradientAngleDeg,
              colorStart: options?.customTheme?.colorStart || 'transparent',
              colorEnd: options?.customTheme?.colorEnd || 'transparent'
            };

      // Match dom-to-image export scaling (it applies an internal transform scale).
      const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
      const renderScale = exportingRef.current ? Math.max(1, exportScale) : Math.max(1, dpr);

      const ensureLatest = () => {
        if (cancelled) return false;
        if (canvas.getAttribute('data-bg-render-token') !== token) return false;
        return true;
      };

    // Debounce preview updates slightly so slider drags can't brick the UI.
    // Export must remain immediate for correctness.
    if (!exportingRef.current) {
      await new Promise((resolve) => setTimeout(resolve, 40));
      if (!ensureLatest()) return;
    }

      let wallpaperImage = null;
      if (isWallpaper) {
        try {

          // For wallpapers selected from the OS or from desktop custom files, we often store a
          // stable file path in options. WebViews cannot load raw file paths directly, so
          // rehydrate to an asset URL (preview) or a temp raster asset (export) here.
          const candidatePath = options?.wallpaperPath || options?.wallpaper;
          const filePath = isAbsoluteFilePath(candidatePath) ? candidatePath : null;
          const srcKey = filePath || options.wallpaper;

          const cache = wallpaperCacheRef.current;
          if (cache.src !== srcKey || !cache.img) {
            if (cache.revokeUrl) {
              try { URL.revokeObjectURL(cache.revokeUrl); } catch {}
            }
            wallpaperCacheRef.current = { src: null, img: null, revokeUrl: null };

            let loadSrc = options.wallpaper;
            if (filePath && typeof window !== 'undefined' && window?.tauriAPI) {
              const lower = String(filePath).toLowerCase();
              const isHeicLike = lower.endsWith('.heic') || lower.endsWith('.heif');
              const isVideoLike = lower.endsWith('.mov') || lower.endsWith('.mp4') || lower.endsWith('.m4v');

              const cap = 4096;
              const targetMaxDim = Math.min(
                cap,
                Math.max(512, Math.ceil(Math.max(width, height) * renderScale))
              );

              // Export correctness: avoid tainted canvases by ensuring wallpaper pixels come from a
              // same-origin source (data: URL). `asset://` images drawn into a canvas can taint it,
              // causing dom-to-image to throw SecurityError: "The operation is insecure.".
              if (exportingRef.current && typeof window.tauriAPI.readFileAsDataUrl === 'function') {
                if (isHeicLike || isVideoLike) {
                  // For HEIC/HEIF and video wallpapers, rasterize first (via read_file_as_asset)
                  // then read the output PNG as a data URL.
                  if (typeof window.tauriAPI.readFileAsAssetInfo === 'function') {
                    const info = await window.tauriAPI.readFileAsAssetInfo({ filePath, maxDim: targetMaxDim });
                    loadSrc = await window.tauriAPI.readFileAsDataUrl({ filePath: info.filePath });
                  } else if (typeof window.tauriAPI.readFileAsAssetUrl === 'function') {
                    // Best-effort fallback (may taint on some WebViews).
                    loadSrc = await window.tauriAPI.readFileAsAssetUrl({ filePath, maxDim: targetMaxDim });
                  }
                } else {
                  loadSrc = await window.tauriAPI.readFileAsDataUrl({ filePath, maxDim: targetMaxDim });
                }
              } else {
                // Preview should be instant for common formats.
                // But HEIC/HEIF and video wallpapers can't reliably be decoded by the webview, so
                // use the rasterized asset path even in preview.
                if (!exportingRef.current && !isHeicLike && !isVideoLike && typeof window.tauriAPI.filePathToAssetUrl === 'function') {
                  loadSrc = window.tauriAPI.filePathToAssetUrl(filePath);
                } else if (typeof window.tauriAPI.readFileAsAssetUrl === 'function') {
                  loadSrc = await window.tauriAPI.readFileAsAssetUrl({ filePath, maxDim: targetMaxDim });
                } else if (!exportingRef.current && typeof window.tauriAPI.filePathToAssetUrl === 'function') {
                  loadSrc = window.tauriAPI.filePathToAssetUrl(filePath);
                }
              }
            }

            const { img, revokeUrl } = await loadSafeImage(loadSrc);
            wallpaperCacheRef.current = { src: srcKey, img, revokeUrl };
          }
          wallpaperImage = wallpaperCacheRef.current.img;
        } catch (e) {
          wallpaperImage = null;
        }
      }

      if (background.type === 'transparent') {
        // Clear to true transparency.
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        try {
          if (canvas.getAttribute('data-bg-render-token') === token) {
            canvas.setAttribute('data-bg-render-done', token);
          }
        } catch {}
        return;
      }

      // If the user selected a wallpaper but we couldn't load it yet, don't flash transparent.
      // Keep the last successfully-rendered background until we have pixels to draw.
      if (!exportingRef.current && background.type === 'wallpaper' && !wallpaperImage) {
        return;
      }

      try {
        // Cache base (unfiltered) background so blur/brightness adjustments are fast.
        if (!bgBaseCacheRef.current) {
          bgBaseCacheRef.current = { key: null, canvas: null };
        }

        const bgKey = (() => {
          // IMPORTANT: preview and export MUST NOT share cached base canvases.
          // Preview may draw wallpapers via `asset://` URLs which can taint the canvas.
          // Export requires a same-origin/data URL source to keep dom-to-image happy.
          const mode = exportingRef.current ? 'export' : 'preview';
          const base = `${width}x${height}@${renderScale}|${background.type}|mode:${mode}`;
          if (background.type === 'wallpaper') {
            return `${base}|${String(options?.wallpaperPath || options?.wallpaper || '')}`;
          }
          if (background.type === 'blobGradient') {
            try {
              return `${base}|${JSON.stringify(options?.blobGradient || {})}`;
            } catch {
              return `${base}|blob`;
            }
          }
          return `${base}|${String(background.angleDeg || 135)}|${String(background.colorStart || '')}|${String(background.colorEnd || '')}`;
        })();

        const cache = bgBaseCacheRef.current;
        let baseCanvas = cache.canvas;
        if (!baseCanvas || cache.key !== bgKey) {
          baseCanvas = document.createElement('canvas');
          await renderBackgroundToCanvas({
            outCanvas: baseCanvas,
            widthCssPx: width,
            heightCssPx: height,
            renderScale,
            background,
            blurPx: 0,
            brightness: 1,
            wallpaperImage,
          });
          bgBaseCacheRef.current = { key: bgKey, canvas: baseCanvas };
        }

        if (!ensureLatest()) return;

        let tmp = baseCanvas;
        if (shouldBakeFxInCanvas) {
          try {
            const blurPx = blur * renderScale;
            const bright = brightness;

            if (canUseRustFx) {
              const rustFx = await applyFxWithRust({ baseCanvas, blurPx, brightness: bright });
              if (rustFx?.img) {
                if (!bgFxCanvasRef.current) bgFxCanvasRef.current = document.createElement('canvas');
                tmp = bgFxCanvasRef.current;
                if (tmp.width !== baseCanvas.width) tmp.width = baseCanvas.width;
                if (tmp.height !== baseCanvas.height) tmp.height = baseCanvas.height;
                const tctx = tmp.getContext('2d');
                if (tctx) {
                  tctx.setTransform(1, 0, 0, 1, 0, 0);
                  tctx.clearRect(0, 0, tmp.width, tmp.height);
                  tctx.drawImage(rustFx.img, 0, 0, tmp.width, tmp.height);
                }
                try { rustFx.revokeUrl && URL.revokeObjectURL(rustFx.revokeUrl); } catch {}
              } else {
                tmp = baseCanvas;
              }
            } else {
              if (!bgFxCanvasRef.current) bgFxCanvasRef.current = document.createElement('canvas');
              tmp = bgFxCanvasRef.current;
              applyBackgroundFxToCanvas({
                outCanvas: tmp,
                baseCanvas,
                blurPx,
                brightness: bright,
                quality: 'final'
              });
            }
          } catch {
            tmp = baseCanvas;
          }
        } else {
          // Free heavy FX buffers during preview to help GC.
          bgFxCanvasRef.current = null;
        }

        if (cancelled) return;

        // Defensive: ensure we're still rendering the latest requested background.
        if (canvas.getAttribute('data-bg-render-token') !== token) return;

        // Ensure the visible canvas matches the rendered pixel size.
        // Without this, the browser will stretch a default 300x150 canvas to fit,
        // making wallpapers appear zoomed and blur look broken.
        if (canvas.width !== tmp.width) canvas.width = tmp.width;
        if (canvas.height !== tmp.height) canvas.height = tmp.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        // Draw atomically without a clear (avoids a transparent frame on some WebKit/Tauri builds).
        const prevOp = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = 'copy';
        ctx.drawImage(tmp, 0, 0);
        ctx.globalCompositeOperation = prevOp;
        try {
          if (canvas.getAttribute('data-bg-render-token') === token) {
            canvas.setAttribute('data-bg-render-done', token);
          }
        } catch {}
      } catch (e) {
        // Fail silently; fallback will be transparent.
      }
    };

    run();
    return () => { cancelled = true; };
  }, [
    bgCanvasSize.width,
    bgCanvasSize.height,
    options?.backgroundType,
    options?.blobGradient,
    options?.wallpaper,
    options?.wallpaperSource,
    options?.wallpaperPath,
    options?.customTheme?.colorStart,
    options?.customTheme?.colorEnd,
    options?.customTheme?.angleDeg,
    options?.fx?.blur,
    options?.fx?.brightness,
    options?.fx?.vignette,
    applyFxWithRust,
    exportScale,
    canRustFx,
  ]);

  // Cleanup cached wallpaper object URLs.
  useEffect(() => {
    return () => {
      const cache = wallpaperCacheRef.current;
      if (cache?.revokeUrl) {
        try { URL.revokeObjectURL(cache.revokeUrl); } catch {}
      }
    };
  }, []);

  return (
    <div className="relative" style={{ overflow: 'visible' }}>
      {/* UI-only mask and shadow wrapper to round wallpaper and cast canvas shadow (not included in export) */}
      <div
        style={{
          overflow: 'visible',
          borderRadius: `${Math.max(0, cosmeticRadius)}px`,
        }}
      >
        <div style={{
          overflow: 'visible',
          borderRadius: `${Math.max(0, cosmeticRadius)}px`,
          // Fix transparent seams at rounded corners on macOS WebKit / WKWebView.
          // The combination of overflow:hidden + border-radius can show 1px transparent
          // seams at antialiased edges. Promoting to a compositing layer avoids this.
          transform: 'translateZ(0)',
          willChange: 'transform',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
          isolation: 'isolate',
        }}>
          <div
            ref={exportRef}
            style={{
              position: 'relative',
              display: 'block',
              width: '100%',
              boxSizing: 'border-box',
              // Avoid filter/z-index oddities (notably in WebKit/Tauri) by isolating stacking.
              isolation: 'isolate',
              // Keep this visible so card drop-shadows can render.
              // Individual layers (bg/noise/content) manage their own clipping.
              overflow: 'visible',
              borderRadius: 0,
              // Prevent subpixel transparent corner seams on all platforms.
              transform: 'translateZ(0)',
              WebkitBackfaceVisibility: 'hidden',
              backfaceVisibility: 'hidden',
            }}
            className={classnames('relative', {
              'transition-all duration-200 ease-in-out': !isExporting,
              'transition-none': isExporting,
            })}
            data-zoom={layout.scaleZoom}
            {...outerCaptureHandlers}
          >
          {/* Background layer (blur + brightness baked into canvas pixels) */}
          <div
            data-siteshot-bg-layer="1"
            data-siteshot-bg-frame="1"
            data-export-frame-radius={String(exportBackgroundRadius)}
            className="absolute inset-0"
            style={{ overflow: 'hidden', borderRadius: `${exportBackgroundRadius}px`, zIndex: 0, pointerEvents: 'none' }}
          >
            <canvas
              ref={bgCanvasRef}
              data-siteshot-bg-canvas="1"
              aria-hidden="true"
              className="absolute inset-0 w-full h-full"
              style={{
                display: 'block',
                // Keep it on the compositor, but we're not relying on CSS filters.
                transform: 'translateZ(0)',
                // Overdraw to prevent 1px transparent seams at the edges.
                top: -2,
                left: -2,
                right: -2,
                bottom: -2,
                width: 'calc(100% + 4px)',
                height: 'calc(100% + 4px)',
                filter: 'none',
              }}
            />

            {/* Background vignette overlay (exportable; stays behind screenshot/overlays) */}
            {(() => {
              if (options?.backgroundType === 'transparent') return null;
              const vignette = Math.min(1, Math.max(0, Number(options?.fx?.vignette) || 0));
              if (!vignette) return null;
              // Rectangular vignette: darken edges based on the frame bounds.
              // Use stacked linear gradients so it scales with any aspect ratio.
              const edge = 0.85;
              const fade = 42; // percent of each edge used for the fade
              return (
                <div
                  data-siteshot-bg-layer="1"
                  className="absolute pointer-events-none"
                  style={{
                    // dom-to-image has had issues with the `inset` shorthand and fractional scaling,
                    // which can leave 1px transparent seams on edges in exports. Anchor explicitly
                    // and slightly overdraw.
                    top: -2,
                    left: -2,
                    right: -2,
                    bottom: -2,
                    borderRadius: `${exportBackgroundRadius}px`,
                    backgroundImage: [
                      `linear-gradient(to right, rgba(0,0,0,${edge}) 0%, rgba(0,0,0,0) ${fade}%)`,
                      `linear-gradient(to left, rgba(0,0,0,${edge}) 0%, rgba(0,0,0,0) ${fade}%)`,
                      `linear-gradient(to bottom, rgba(0,0,0,${edge}) 0%, rgba(0,0,0,0) ${fade}%)`,
                      `linear-gradient(to top, rgba(0,0,0,${edge}) 0%, rgba(0,0,0,0) ${fade}%)`,
                    ].join(', '),
                    opacity: vignette,
                    transform: 'translateZ(0)'
                  }}
                />
              );
            })()}
          </div>

          {/* Background noise overlay should cover the whole export area */}
          {options?.backgroundType !== 'transparent' && options?.fx?.noise && (
            <div
              data-siteshot-bg-layer="1"
              className="absolute bg-repeat opacity-[0.15] pointer-events-none"
              style={{
                backgroundImage: 'url("/noise.svg")',
                // Overdraw to prevent 1px seams on WebKit/dom-to-image fractional scaling.
                top: -2,
                left: -2,
                right: -2,
                bottom: -2,
                borderRadius: `${exportBackgroundRadius}px`,
                transform: 'translateZ(0)',
              }}
            />
          )}

          {annotationLayer}
          {selectionOverlays}

          {renderOutsideWatermark()}
          {renderBelowCardWatermark()}
          {renderTopInsideWatermark()}

          {/* Aspect frame measured for layout & scaling */}
          <div
            ref={wrapperRef}
            className={classnames('relative w-full flex justify-center', contentOverflows ? 'items-start' : 'items-center', aspectWrapperProps.className)}
            style={{ ...(aspectWrapperProps.style || {}), zIndex: 10 }}
          >
            <div
              className="relative flex items-center justify-center"
              style={{
                padding: layout.padding,
                boxSizing: 'border-box',
                width: paddedFrameWidth,
                height: paddedFrameHeight,
                zIndex: 10,
              }}
            >
              {/* Drag center guides (render outside the transformed card so they don't move while dragging) */}
              {canDragScreenshot && isDragging && (
                <>
                  {/* Faint always-visible crosshair while dragging — vertical */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      top: 0,
                      bottom: 0,
                      left: '50%',
                      width: 1,
                      transform: 'translateX(-50%)',
                      background: appTheme === 'dark'
                        ? 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.15) 20%, rgba(255,255,255,0.15) 80%, rgba(255,255,255,0) 100%)'
                        : 'linear-gradient(to bottom, rgba(15,18,27,0) 0%, rgba(15,18,27,0.1) 20%, rgba(15,18,27,0.1) 80%, rgba(15,18,27,0) 100%)',
                      zIndex: 60,
                    }}
                  />
                  {/* Faint always-visible crosshair while dragging — horizontal */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: 0,
                      right: 0,
                      top: '50%',
                      height: 1,
                      transform: 'translateY(-50%)',
                      background: appTheme === 'dark'
                        ? 'linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.15) 20%, rgba(255,255,255,0.15) 80%, rgba(255,255,255,0) 100%)'
                        : 'linear-gradient(to right, rgba(15,18,27,0) 0%, rgba(15,18,27,0.1) 20%, rgba(15,18,27,0.1) 80%, rgba(15,18,27,0) 100%)',
                      zIndex: 60,
                    }}
                  />
                </>
              )}
              <div
                style={{
                  transform: transformStyle,
                  willChange: 'transform',
                  transformOrigin: `${screenshotBoxCenter.x*100}% ${screenshotBoxCenter.y}px`,
                  zIndex: 1,
                }}
                ref={cardRef}
                className={classnames('relative', canDragScreenshot ? 'cursor-move' : '')}
                onPointerDown={onPointerDownMove}
                onDragStart={(e) => {
                  // Block native HTML drag behavior (e.g., dragging the image element out of the app).
                  // This keeps the app's own drag-to-move interactions consistent.
                  e.preventDefault();
                }}
              >
                {/* Screenshot card (rounded by option; carries its own shadow). */}
                {/* Keep the border as a ring, but add an underlay of the same color to eliminate tiny
                    antialiased/transparent gaps that can appear around the ring on export. */}
                <div
                    className="relative"
                  style={{
                    width: layout.displayWidth || undefined,
                    height: ((layout.displayHeight || 0) + (browserBarMetrics.enabled ? browserBarMetrics.height : 0)) || undefined,
                  }}
                >
                  {screenshotAmbientGlowStyle && <div aria-hidden="true" style={screenshotAmbientGlowStyle} />}
                  <div
                    className="relative siteshot-card-shadow"
                    data-export-shadow-kind={shadowPresentationKind}
                    style={{
                      width: '100%',
                      height: '100%',
                      ...cardRadiusStyle,
                      ...effectiveCardShadowStyles,
                    }}
                  >
                    {/* Underlay to eliminate tiny unfilled pixels in rounded corners (independent of border width). */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 pointer-events-none siteshot-card-underlay"
                      style={{
                        backgroundColor: effectiveInsetColor,
                        borderRadius: `${Math.max(0, screenshotRadius)}px`,
                        zIndex: 0,
                      }}
                    />
                    <div
                      className="relative overflow-hidden flex flex-col siteshot-card-clip"
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: effectiveInsetColor,
                        zIndex: 1,
                        ...cardRadiusStyle,
                        // WKWebView can show 1px transparent seams on rounded + overflow hidden elements
                        // when they are inside transformed parents (padding/scale changes make it worse).
                        transform: 'translateZ(0)',
                        willChange: 'transform',
                        WebkitBackfaceVisibility: 'hidden',
                        backfaceVisibility: 'hidden',
                        WebkitMaskImage: 'none',
                        // Border ring is rendered as a top overlay so it isn't visually tinted by the shadow.
                        boxShadow: 'none',
                      }}
                    >
                      {renderBrowserBar()}
                      <div
                        className="relative"
                        style={{
                          marginTop: 0,
                          height: layout.displayHeight,
                          overflow: 'hidden',
                          backgroundColor: effectiveInsetColor,
                        }}
                      >
                        {/* Inside watermark is rendered above annotations in a top overlay. */}
                        {options?.watermark?.enabled && isWatermarkInside && (
                          <div ref={watermarkHostRef} className="pointer-events-none absolute inset-0" />
                        )}

                        <div className="w-full h-full flex items-center justify-center" style={{ lineHeight: 0, backgroundColor: effectiveInsetColor }}>
                          <div
                            className="relative"
                            style={{
                              width: insetInnerSize.width || '100%',
                              height: insetInnerSize.height || '100%',
                              boxSizing: 'border-box',
                              transition: 'background-color 0.25s ease',
                              backgroundColor: effectiveInsetColor,
                              overflow: 'hidden',
                              ...screenshotContentRadiusStyle,
                              // Clip inner inset content to its own scaled radius so changing
                              // corner radius and inset cannot reveal square underlayers.
                            }}
                          >
                            <div
                              className="w-full h-full"
                              style={{
                                boxSizing: 'border-box',
                                backgroundColor: effectiveInsetColor,
                                ...screenshotContentRadiusStyle,
                              }}
                            >
                              <img
                                src={effectiveImageSrc}
                                ref={imageRef}
                                data-siteshot-source="1"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'contain',
                                  objectPosition: 'center center',
                                  transition: 'opacity 0.25s ease',
                                  // Reduce WebKit subpixel seams when the screenshot is inside transformed/rounded parents.
                                  transform: 'translateZ(0)',
                                  willChange: 'transform',
                                  WebkitBackfaceVisibility: 'hidden',
                                  backfaceVisibility: 'hidden',
                                  transformOrigin: 'center center',
                                  display: 'block',
                                  border: 'none',
                                  outline: 'none',
                                  // Hide the <img> during export and only after the preview canvas has drawn.
                                  opacity: shouldUseCanvasNow ? 0 : 1,
                                  ...screenshotContentRadiusStyle
                                }}
                                className={classnames('transition-all duration-200 ease-in-out relative z-10')}
                                onLoad={async (e) => {
                                  try {
                                    const newImgWidth = e.target.naturalWidth;
                                    const newImgHeight = e.target.naturalHeight;
                                    const newDimensions = { width: newImgWidth, height: newImgHeight };
                                    if (dimensions.width !== newImgWidth || dimensions.height !== newImgHeight) {
                                      setDimensions(newDimensions);
                                    }
                                    if (useCanvasPreview && !isExporting) {
                                      scheduleExportImageCanvasDraw();
                                    }
                                    if (options.aspectMode === 'auto' && onAutoDetect && newImgWidth && newImgHeight) {
                                      const last = lastAutoDetectRef.current;
                                      if (last.src !== blob.src || last.w !== newImgWidth || last.h !== newImgHeight) {
                                        lastAutoDetectRef.current = { src: blob.src, w: newImgWidth, h: newImgHeight };
                                        onAutoDetect(newImgWidth, newImgHeight);
                                      }
                                    }
                                    try {
                                      const col = await getEdgeColor(e.target, { alpha: false });
                                      setEdgeColor(col);
                                      onEdgeColorDetected && onEdgeColorDetected(col);
                                    } catch {}
                                    logger.dimensions('image-onload', { ...newDimensions });
                                  } catch (err) { logger.error('image-onload', err); }
                                }}
                              />

                              {/* Export-only deterministic snapshot for dom-to-image */}
                              <canvas
                                ref={exportImageCanvasRef}
                                data-siteshot-export-canvas="1"
                                aria-hidden="true"
                                className="absolute inset-0 w-full h-full"
                                style={{
                                  display: shouldUseCanvasNow ? 'block' : 'none',
                                  pointerEvents: 'none',
                                  backgroundColor: effectiveInsetColor,
                                  ...screenshotContentRadiusStyle,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Border overlay: sits OUTSIDE the shadow wrapper so it never interacts with it.
                      Uses a real CSS border with negative insets so shadow is not applied to the border. */}
                  {screenshotBorder?.width ? (
                    <div
                      aria-hidden="true"
                      className="absolute pointer-events-none siteshot-card-border"
                      style={{
                        top: -screenshotBorder.width,
                        left: -screenshotBorder.width,
                        right: -screenshotBorder.width,
                        bottom: -screenshotBorder.width,
                        border: `${Math.max(0, screenshotBorder.width)}px solid ${screenshotBorder.color}`,
                        borderRadius: `${Math.max(0, screenshotRadius + screenshotBorder.width)}px`,
                        boxShadow: 'none',
                        zIndex: 5,
                      }}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageDisplay;


