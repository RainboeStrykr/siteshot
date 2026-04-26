import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import getStroke from 'perfect-freehand';
import { clamp } from '@/utils/core/math';

// const TIKTOK_FONT_STACK = 'TikTok Sans, TikTokText, Proxima Nova, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif';
const TIKTOK_FONT_STACK = 'ui-rounded, "SF Pro Rounded", "SF Pro Text", "Segoe UI Variable", "Segoe UI", Ubuntu, Cantarell, system-ui, -apple-system, BlinkMacSystemFont, Roboto, Helvetica Neue, Arial, sans-serif';

// ── perfect-freehand helpers ──
// Convert perfect-freehand outline points to a single SVG-style path that we
// draw as a filled shape (gives natural pressure / taper look).
function getSvgPathFromStrokePoints(points) {
  if (!points.length) return '';
  const max = points.length - 1;
  const avg = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = `M ${points[0][0].toFixed(2)},${points[0][1].toFixed(2)} `;
  for (let i = 0; i < max; i++) {
    const mid = avg(points[i], points[i + 1]);
    d += `Q ${points[i][0].toFixed(2)},${points[i][1].toFixed(2)} ${mid[0].toFixed(2)},${mid[1].toFixed(2)} `;
  }
  d += `L ${points[max][0].toFixed(2)},${points[max][1].toFixed(2)} Z`;
  return d;
}

// Solid arrowhead: filled triangle flush with the shaft end.
// The back edge is slightly concave ("nocked") for a polished look similar to Xnapper/Cleanshot.
function drawArrowhead(ctx, fromX, fromY, toX, toY, headLength) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const headAngle = Math.PI / 5.4;
  // Nock depth: how far the back center dips inward (concave notch).
  const nockDepth = headLength * 0.25;
  const tipX = toX;
  const tipY = toY;
  const leftX = toX - headLength * Math.cos(angle - headAngle);
  const leftY = toY - headLength * Math.sin(angle - headAngle);
  const rightX = toX - headLength * Math.cos(angle + headAngle);
  const rightY = toY - headLength * Math.sin(angle + headAngle);
  // The nock point sits slightly forward from the base center.
  const nockX = toX - (headLength - nockDepth) * Math.cos(angle);
  const nockY = toY - (headLength - nockDepth) * Math.sin(angle);

  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(leftX, leftY);
  ctx.lineTo(nockX, nockY);
  ctx.lineTo(rightX, rightY);
  ctx.closePath();
  ctx.fill();
}

export function useCanvasAnnotations({ activeTool, onRequestDeselectTool, bgCanvasSize, isExporting, exportScale = 1, penColor, shapeMode = 'rect' }) {
  const annotationCanvasRef = useRef(null);

  const textHighlightColor = penColor || '#000000';
  const counterColor = penColor || '#7c3aed';

  // Cache expensive text layout computations (measureText + wrapping).
  // WeakMap keeps memory bounded as text objects are removed.
  const textLayoutCacheRef = useRef(new WeakMap());

  const drawStateRef = useRef({ drawing: false, pointerId: null, strokeIndex: -1 });
  const [textEditor, setTextEditor] = useState(null);
  const textDragRef = useRef({ dragging: false, pointerId: null, offsetX: 0, offsetY: 0 });
  const textMoveRef = useRef({ dragging: false, pointerId: null, textIndex: -1, offsetX: 0, offsetY: 0 });
  const [selectedTextIndex, setSelectedTextIndex] = useState(-1);
  const [textSelectionNonce, setTextSelectionNonce] = useState(0);
  const textResizeRef = useRef({
    resizing: false,
    pointerId: null,
    textIndex: -1,
    mode: null,
    startX: 0,
    startY: 0,
    startBox: null,
    startText: null,
  });
  const [selectedStrokeIndex, setSelectedStrokeIndex] = useState(-1);
  const [strokeSelectionNonce, setStrokeSelectionNonce] = useState(0);

  const prevIsExportingRef = useRef(false);

  const redrawRafRef = useRef(0);
  const textNonceRafRef = useRef(0);
  const strokeNonceRafRef = useRef(0);
  const penPathSeqRef = useRef(0);

  const scheduleTextSelectionUpdate = useCallback(() => {
    if (typeof window === 'undefined' || !window.requestAnimationFrame) {
      setTextSelectionNonce((n) => n + 1);
      return;
    }
    if (textNonceRafRef.current) return;
    textNonceRafRef.current = requestAnimationFrame(() => {
      textNonceRafRef.current = 0;
      setTextSelectionNonce((n) => n + 1);
    });
  }, []);

  const scheduleStrokeSelectionUpdate = useCallback(() => {
    if (typeof window === 'undefined' || !window.requestAnimationFrame) {
      setStrokeSelectionNonce((n) => n + 1);
      return;
    }
    if (strokeNonceRafRef.current) return;
    strokeNonceRafRef.current = requestAnimationFrame(() => {
      strokeNonceRafRef.current = 0;
      setStrokeSelectionNonce((n) => n + 1);
    });
  }, []);

  const computePenPathViaRust = useCallback(async (outlinePoints) => {
    if (!Array.isArray(outlinePoints) || outlinePoints.length === 0) return '';
    try {
      if (typeof window === 'undefined') return '';
      const invoke = window?.__TAURI__?.core?.invoke || window?.__TAURI_INTERNALS__?.invoke || null;
      if (!invoke) return '';
      const points = outlinePoints
        .map((p) => ({ x: Number(p?.[0]), y: Number(p?.[1]) }))
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
      if (!points.length) return '';
      const pathStr = await invoke('annotation_pen_outline_path', { args: { points } });
      return typeof pathStr === 'string' ? pathStr : '';
    } catch {
      return '';
    }
  }, []);

  // Stored normalized annotations (crisp at any canvas size / export scale).
  const annotationsRef = useRef({ strokes: [], texts: [] });

  const isEditableEventTarget = (target) => {
    const el = target;
    if (!el) return false;
    const tag = String(el.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    if (el.isContentEditable) return true;
    return false;
  };

  const sizeAnnotationCanvas = useCallback(() => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;

    const widthCss = Math.max(1, Math.round(bgCanvasSize?.width || 0));
    const heightCss = Math.max(1, Math.round(bgCanvasSize?.height || 0));
    if (!widthCss || !heightCss) return;

    const dpr = (typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1);
    const captureScale = Math.max(1, Number(exportScale) || 1);
    const renderScale = isExporting ? Math.max(1, dpr, captureScale) : Math.max(1, dpr);
    const targetW = Math.max(1, Math.round(widthCss * renderScale));
    const targetH = Math.max(1, Math.round(heightCss * renderScale));

    if (canvas.width === targetW && canvas.height === targetH) return;

    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }, [bgCanvasSize?.height, bgCanvasSize?.width, isExporting, exportScale]);

  const wrapSingleLine = useCallback((ctx, line, maxWidthPx) => {
    const s = String(line ?? '');
    if (!maxWidthPx || !isFinite(maxWidthPx)) return [s];
    if (!s) return [''];

    const out = [];
    const words = s.trim().length ? s.split(/\s+/) : [''];
    let current = '';

    const pushCurrent = () => {
      out.push(current);
      current = '';
    };

    const breakLongToken = (token) => {
      const pieces = [];
      let rest = token;
      while (rest.length) {
        let lo = 1;
        let hi = rest.length;
        let best = 1;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          const part = rest.slice(0, mid);
          const w = ctx.measureText(part).width;
          if (w <= maxWidthPx) {
            best = mid;
            lo = mid + 1;
          } else {
            hi = mid - 1;
          }
        }
        pieces.push(rest.slice(0, best));
        rest = rest.slice(best);
      }
      return pieces;
    };

    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidthPx) {
        current = next;
        continue;
      }

      if (current) pushCurrent();

      if (ctx.measureText(word).width <= maxWidthPx) {
        current = word;
        continue;
      }

      const broken = breakLongToken(word);
      for (let i = 0; i < broken.length; i += 1) {
        const chunk = broken[i];
        if (i === broken.length - 1) {
          current = chunk;
        } else {
          out.push(chunk);
        }
      }
    }

    if (current || !out.length) out.push(current);
    return out;
  }, []);

  const computeTextLayout = useCallback((ctx, canvas, t) => {
    if (!ctx || !canvas || !t) return null;

    const text = String(t?.value || '').trimEnd();
    if (!text.trim()) return null;

    // Cached layout fast-path.
    try {
      const key = [
        canvas.width,
        canvas.height,
        text,
        Number(t.fontSizeRel) || 0,
        Number(t.padXRel) || 0,
        Number(t.padYRel) || 0,
        (typeof t.boxWNorm === 'number' ? t.boxWNorm : 'auto'),
        t.forceCircle ? 'circle' : '',
      ].join('|');

      const perText = textLayoutCacheRef.current.get(t);
      const cached = perText?.get?.(key);
      if (cached) return cached;

      // Fall through to compute, then store.
      const minDimPx = Math.max(1, Math.min(canvas.width, canvas.height));

      const fontSize = Math.max(10, Math.round((t.fontSizeRel || 0) * minDimPx));
      const fontWeight = 800;
      const lineH = Math.round(fontSize * 1.12);
      const padX = Math.round((t.padXRel || 0) * minDimPx);
      const padY = Math.round((t.padYRel || 0) * minDimPx);

      const boxWFromUser = (typeof t.boxWNorm === 'number' && isFinite(t.boxWNorm) && t.boxWNorm > 0)
        ? Math.max(60, Math.round(t.boxWNorm * canvas.width))
        : null;

      const contentMaxW = boxWFromUser ? Math.max(20, boxWFromUser - padX * 2) : null;

      ctx.save();
      ctx.font = `${fontWeight} ${fontSize}px ${TIKTOK_FONT_STACK}`;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';

      const hardLines = text.split(/\r?\n/);
      const lines = [];
      for (const hl of hardLines) {
        const wrapped = wrapSingleLine(ctx, hl, contentMaxW);
        for (const w of wrapped) lines.push(w);
      }
      if (!lines.length) lines.push('');

      let maxLineW = 0;
      for (const line of lines) {
        const w = ctx.measureText(line).width;
        if (w > maxLineW) maxLineW = w;
      }

      let computedBoxW = Math.round(maxLineW + padX * 2);
      let boxW = boxWFromUser ? Math.min(canvas.width, boxWFromUser) : computedBoxW;
      let boxH = Math.round(lines.length * lineH + padY * 2);

      // Force circle: make boxW === boxH and re-center padding
      let adjPadX = padX;
      let adjPadY = padY;
      if (t.forceCircle) {
        const dim = Math.max(boxW, boxH);
        adjPadX = Math.round((dim - maxLineW) / 2);
        adjPadY = Math.round((dim - lines.length * lineH) / 2);
        boxW = dim;
        boxH = dim;
      }

      ctx.restore();

      const layout = { lines, boxW, boxH, fontSize, fontWeight, lineH, padX: adjPadX, padY: adjPadY, minDimPx };
      const nextMap = perText instanceof Map ? perText : new Map();
      nextMap.set(key, layout);
      if (!perText) textLayoutCacheRef.current.set(t, nextMap);
      return layout;
    } catch {
      // Ignore cache failures and fall back to the original computation.
    }

    const minDimPx = Math.max(1, Math.min(canvas.width, canvas.height));

    const fontSize = Math.max(10, Math.round((t.fontSizeRel || 0) * minDimPx));
    const fontWeight = 800;
    const lineH = Math.round(fontSize * 1.12);
    const padX = Math.round((t.padXRel || 0) * minDimPx);
    const padY = Math.round((t.padYRel || 0) * minDimPx);

    const boxWFromUser = (typeof t.boxWNorm === 'number' && isFinite(t.boxWNorm) && t.boxWNorm > 0)
      ? Math.max(60, Math.round(t.boxWNorm * canvas.width))
      : null;

    const contentMaxW = boxWFromUser ? Math.max(20, boxWFromUser - padX * 2) : null;

    ctx.save();
    ctx.font = `${fontWeight} ${fontSize}px ${TIKTOK_FONT_STACK}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    const hardLines = text.split(/\r?\n/);
    const lines = [];
    for (const hl of hardLines) {
      const wrapped = wrapSingleLine(ctx, hl, contentMaxW);
      for (const w of wrapped) lines.push(w);
    }
    if (!lines.length) lines.push('');

    let maxLineW = 0;
    for (const line of lines) {
      const w = ctx.measureText(line).width;
      if (w > maxLineW) maxLineW = w;
    }

    let computedBoxW = Math.round(maxLineW + padX * 2);
    let boxW = boxWFromUser ? Math.min(canvas.width, boxWFromUser) : computedBoxW;
    let boxH = Math.round(lines.length * lineH + padY * 2);

    // Force circle: make boxW === boxH and re-center padding
    let adjPadX = padX;
    let adjPadY = padY;
    if (t.forceCircle) {
      const dim = Math.max(boxW, boxH);
      adjPadX = Math.round((dim - maxLineW) / 2);
      adjPadY = Math.round((dim - lines.length * lineH) / 2);
      boxW = dim;
      boxH = dim;
    }

    ctx.restore();

    return { lines, boxW, boxH, fontSize, fontWeight, lineH, padX: adjPadX, padY: adjPadY, minDimPx };
  }, [wrapSingleLine]);

  const drawRoundRect = (ctx, x, y, w, h, r) => {
    const radius = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  };

  const redrawAnnotations = useCallback(() => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const minDimPx = Math.max(1, Math.min(canvas.width, canvas.height));

    // Strokes (pen, arrow, rect)
    for (const stroke of annotationsRef.current.strokes) {
      const strokeType = stroke?.type || 'pen';
      const pts = Array.isArray(stroke?.points) ? stroke.points : [];
      if (pts.length < 1) continue;

      const lineWidth = Math.max(1, Math.round((stroke.widthRel || 0) * minDimPx));
      const color = stroke.color || '#ffffff';
      const alpha = typeof stroke.alpha === 'number' ? stroke.alpha : 1;

      ctx.save();
      ctx.globalAlpha = alpha;

      if (strokeType === 'arrow') {
        // Arrow: thick shaft + filled arrowhead, with a white outline drawn underneath.
        // This matches the Cleanshot/Xnapper style: bold colored arrow with white border.
        if (pts.length >= 2) {
          const x1 = pts[0].x * canvas.width;
          const y1 = pts[0].y * canvas.height;
          const x2 = pts[pts.length - 1].x * canvas.width;
          const y2 = pts[pts.length - 1].y * canvas.height;

          const headLength = Math.max(40, lineWidth * 10);
          const angle = Math.atan2(y2 - y1, x2 - x1);
          // Shaft ends at the arrowhead nock.
          const shaftEndX = x2 - (headLength * 0.62) * Math.cos(angle);
          const shaftEndY = y2 - (headLength * 0.62) * Math.sin(angle);

          // --- White outline pass (drawn first, behind) ---
          const outlineWidth = Math.max(3, lineWidth * 0.55);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = 'rgba(255,255,255,0.92)';
          ctx.lineWidth = lineWidth + outlineWidth * 2;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(shaftEndX, shaftEndY);
          ctx.stroke();

          // Arrowhead outline: stroke a slightly expanded arrowhead path
          const headAngle = Math.PI / 5.4;
          const nockDepth = headLength * 0.25;
          const leftX = x2 - headLength * Math.cos(angle - headAngle);
          const leftY = y2 - headLength * Math.sin(angle - headAngle);
          const rightX = x2 - headLength * Math.cos(angle + headAngle);
          const rightY = y2 - headLength * Math.sin(angle + headAngle);
          const nockX = x2 - (headLength - nockDepth) * Math.cos(angle);
          const nockY = y2 - (headLength - nockDepth) * Math.sin(angle);
          ctx.strokeStyle = 'rgba(255,255,255,0.92)';
          ctx.lineWidth = outlineWidth * 2;
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(x2, y2);
          ctx.lineTo(leftX, leftY);
          ctx.lineTo(nockX, nockY);
          ctx.lineTo(rightX, rightY);
          ctx.closePath();
          ctx.stroke();

          // --- Colored fill pass (drawn on top) ---
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = color;
          ctx.lineWidth = lineWidth;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(shaftEndX, shaftEndY);
          ctx.stroke();

          ctx.fillStyle = color;
          drawArrowhead(ctx, x1, y1, x2, y2, headLength);
        }
      } else if (strokeType === 'rect') {
        // Rectangle: draw from first point to last point
        if (pts.length >= 2) {
          const x1 = pts[0].x * canvas.width;
          const y1 = pts[0].y * canvas.height;
          const x2 = pts[pts.length - 1].x * canvas.width;
          const y2 = pts[pts.length - 1].y * canvas.height;

          const rx = Math.min(x1, x2);
          const ry = Math.min(y1, y2);
          const rw = Math.abs(x2 - x1);
          const rh = Math.abs(y2 - y1);

          ctx.strokeStyle = color;
          ctx.lineWidth = lineWidth;
          ctx.lineJoin = 'round';

          // Rounded corner radius proportional to line width
          const cornerRadius = Math.max(0, Math.min(lineWidth * 1.5, rw / 3, rh / 3));
          drawRoundRect(ctx, rx, ry, rw, rh, cornerRadius);
          ctx.stroke();
        }
      } else if (strokeType === 'ellipse') {
        // Ellipse: draw from first point to last point
        if (pts.length >= 2) {
          const x1 = pts[0].x * canvas.width;
          const y1 = pts[0].y * canvas.height;
          const x2 = pts[pts.length - 1].x * canvas.width;
          const y2 = pts[pts.length - 1].y * canvas.height;

          const cx = (x1 + x2) / 2;
          const cy = (y1 + y2) / 2;
          const radiusX = Math.abs(x2 - x1) / 2;
          const radiusY = Math.abs(y2 - y1) / 2;

          ctx.strokeStyle = color;
          ctx.lineWidth = lineWidth;
          ctx.beginPath();
          ctx.ellipse(cx, cy, Math.max(1, radiusX), Math.max(1, radiusY), 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else {
        // Pen: use perfect-freehand for natural-looking strokes
        const pixelPoints = pts.map((p) => [p.x * canvas.width, p.y * canvas.height, 0.5]);

        if (pixelPoints.length === 1) {
          // Single dot
          const cx = pixelPoints[0][0];
          const cy = pixelPoints[0][1];
          ctx.beginPath();
          ctx.arc(cx, cy, lineWidth / 2, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        } else {
          // Use perfect-freehand to get natural outline
          const outlinePoints = getStroke(pixelPoints, {
            size: lineWidth * 2,
            thinning: 0.5,
            smoothing: 0.5,
            streamline: 0.5,
            simulatePressure: true,
            start: { taper: 0, cap: true },
            end: { taper: 0, cap: true },
          });

          if (outlinePoints.length > 0) {
            // Fill the outline path
            const pathStr = stroke.pathStr || getSvgPathFromStrokePoints(outlinePoints);
            const path2d = new Path2D(pathStr);
            ctx.fillStyle = color;
            ctx.fill(path2d);
          }
        }
      }

      ctx.restore();
    }

    // Texts
    for (const t of annotationsRef.current.texts) {
      const layout = computeTextLayout(ctx, canvas, t);
      if (!layout) continue;

      const x = (t.xNorm || 0) * canvas.width;
      const y = (t.yNorm || 0) * canvas.height;

      const radius = Math.round((t.radiusRel || 0) * minDimPx);
      const boxX = Math.round(x);
      const boxY = Math.round(y);
      const boxW = layout.boxW;
      const boxH = layout.boxH;

      ctx.save();
      ctx.font = `${layout.fontWeight} ${layout.fontSize}px ${TIKTOK_FONT_STACK}`;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';

      const bg = String(t?.bgColor || '') || textHighlightColor || '#000000';
      const fg = String(t?.textColor || '') || '#ffffff';
      const strokeCol = String(t?.textStrokeColor || '') || '#000000';

      ctx.fillStyle = bg;
      drawRoundRect(ctx, boxX, boxY, boxW, boxH, radius);
      ctx.fill();

      const isCounter = t.forceCircle === true;
      // Counters always get a black outline so they're readable on any fill color.
      // Regular text uses the stored strokeCol.
      const effectiveStrokeCol = isCounter ? 'rgba(0,0,0,0.75)' : strokeCol;
      // Stroke width: counters use ~12% of font size for a clean outline; text uses stored value.
      const effectiveStrokeWidth = isCounter
        ? Math.max(2, Math.round(layout.fontSize * 0.22))
        : Math.max(2, Math.round((t.strokeWidthRel || 0) * minDimPx));

      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.strokeStyle = effectiveStrokeCol;
      ctx.fillStyle = fg;
      ctx.lineWidth = effectiveStrokeWidth;

      layout.lines.forEach((line, i) => {
        const tx = t.forceCircle ? Math.round(boxX + (boxW / 2)) : (boxX + layout.padX);
        const ty = t.forceCircle
          ? Math.round(boxY + ((boxH - (layout.lines.length * layout.lineH)) / 2) + i * layout.lineH)
          : (boxY + layout.padY + i * layout.lineH);
        if (t.forceCircle) {
          ctx.textAlign = 'center';
        }
        if (line && line.length) {
          ctx.strokeText(line, tx, ty);
          ctx.fillText(line, tx, ty);
        }
      });
      ctx.restore();
    }
  }, [computeTextLayout, textHighlightColor]);

  const scheduleRedraw = useCallback(() => {
    if (typeof window === 'undefined' || !window.requestAnimationFrame) {
      redrawAnnotations();
      return;
    }
    try { cancelAnimationFrame(redrawRafRef.current); } catch {}
    redrawRafRef.current = requestAnimationFrame(() => redrawAnnotations());
  }, [redrawAnnotations]);

  // Resize => canvas bitmap updates => redraw.
  useEffect(() => {
    sizeAnnotationCanvas();
    textLayoutCacheRef.current = new WeakMap();
    redrawAnnotations();
  }, [bgCanvasSize?.width, bgCanvasSize?.height, isExporting, redrawAnnotations, sizeAnnotationCanvas]);

  useEffect(() => {
    return () => {
      try { cancelAnimationFrame(redrawRafRef.current); } catch {}
      try { textNonceRafRef.current && cancelAnimationFrame(textNonceRafRef.current); } catch {}
      try { strokeNonceRafRef.current && cancelAnimationFrame(strokeNonceRafRef.current); } catch {}
      redrawRafRef.current = 0;
      textNonceRafRef.current = 0;
      strokeNonceRafRef.current = 0;
    };
  }, []);

  const clientToCanvasPoint = useCallback((clientX, clientY) => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    // Use visual (post-transform) rect for converting client→relative,
    // but use layout dimensions (pre-transform) for the scale factor so
    // the returned canvas-pixel coords are consistent with canvas.width/height
    // which is based on offsetWidth * dpr, not visual width * dpr.
    const layoutW = canvas.offsetWidth || 1;
    const layoutH = canvas.offsetHeight || 1;
    const scaleX = canvas.width / layoutW;
    const scaleY = canvas.height / layoutH;
    // How much the visual rect differs from layout due to CSS transforms (e.g. fitScale)
    const visualScaleX = rect.width / layoutW;
    const visualScaleY = rect.height / layoutH;
    // Convert client → layout-space offset, then to canvas pixels
    const x = ((clientX - rect.left) / visualScaleX) * scaleX;
    const y = ((clientY - rect.top) / visualScaleY) * scaleY;
    return { x, y, rect, scaleX, scaleY, layoutW, layoutH };
  }, []);

  const getTextBoxPx = useCallback((ctx, canvas, t) => {
    if (!ctx || !canvas || !t) return null;

    const layout = computeTextLayout(ctx, canvas, t);
    if (!layout) return null;

    const x = (t.xNorm || 0) * canvas.width;
    const y = (t.yNorm || 0) * canvas.height;
    return {
      boxX: Math.round(x),
      boxY: Math.round(y),
      boxW: layout.boxW,
      boxH: layout.boxH,
    };
  }, [computeTextLayout]);

  const distPointToSegmentSq = useCallback((px, py, ax, ay, bx, by) => {
    const abx = bx - ax;
    const aby = by - ay;
    const apx = px - ax;
    const apy = py - ay;
    const abLenSq = abx * abx + aby * aby;
    if (abLenSq <= 1e-9) {
      const dx = px - ax;
      const dy = py - ay;
      return dx * dx + dy * dy;
    }
    let t = (apx * abx + apy * aby) / abLenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * abx;
    const cy = ay + t * aby;
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy;
  }, []);

  const isStrokeHit = useCallback((canvas, stroke, px, py, extraRadiusPx = 0) => {
    if (!canvas || !stroke) return false;
    const pts = Array.isArray(stroke?.points) ? stroke.points : [];
    if (pts.length < 1) return false;

    const minDimPx = Math.max(1, Math.min(canvas.width, canvas.height));
    const lineWidth = Math.max(1, Math.round((stroke.widthRel || 0) * minDimPx));
    const thresh = Math.max(8, Math.round(lineWidth / 2) + 8 + Math.max(0, extraRadiusPx || 0));
    const threshSq = thresh * thresh;

    const strokeType = String(stroke?.type || 'pen');
    if ((strokeType === 'rect' || strokeType === 'ellipse') && pts.length >= 2) {
      const x1 = (pts[0]?.x || 0) * canvas.width;
      const y1 = (pts[0]?.y || 0) * canvas.height;
      const x2 = (pts[pts.length - 1]?.x || 0) * canvas.width;
      const y2 = (pts[pts.length - 1]?.y || 0) * canvas.height;

      const left = Math.min(x1, x2);
      const top = Math.min(y1, y2);
      const width = Math.max(1, Math.abs(x2 - x1));
      const height = Math.max(1, Math.abs(y2 - y1));
      const right = left + width;
      const bottom = top + height;

      if (strokeType === 'rect') {
        if (px < left - thresh || px > right + thresh || py < top - thresh || py > bottom + thresh) {
          return false;
        }

        const inside = px >= left && px <= right && py >= top && py <= bottom;
        if (inside) {
          const dL = Math.abs(px - left);
          const dR = Math.abs(px - right);
          const dT = Math.abs(py - top);
          const dB = Math.abs(py - bottom);
          const edgeDist = Math.min(dL, dR, dT, dB);
          if (edgeDist <= thresh) return true;
          // Allow selecting from inside too (much easier UX for thin strokes).
          return true;
        }

        const edgeDistances = [
          distPointToSegmentSq(px, py, left, top, right, top),
          distPointToSegmentSq(px, py, right, top, right, bottom),
          distPointToSegmentSq(px, py, right, bottom, left, bottom),
          distPointToSegmentSq(px, py, left, bottom, left, top),
        ];
        return edgeDistances.some((dSq) => dSq <= threshSq);
      }

      // Ellipse
      const cx = left + width / 2;
      const cy = top + height / 2;
      const rx = Math.max(1, width / 2);
      const ry = Math.max(1, height / 2);

      const dx = px - cx;
      const dy = py - cy;
      const norm = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
      const edgeBand = thresh / Math.max(1, Math.min(rx, ry));

      if (norm <= 1) {
        if (norm >= Math.max(0, 1 - edgeBand)) return true;
        // Same UX principle as rectangles: interior click also selects shape.
        return true;
      }

      return norm <= Math.pow(1 + edgeBand, 2);
    }

    const p0 = pts[0];
    const ax0 = (p0.x || 0) * canvas.width;
    const ay0 = (p0.y || 0) * canvas.height;
    if (pts.length === 1) {
      const dx = px - ax0;
      const dy = py - ay0;
      return (dx * dx + dy * dy) <= threshSq;
    }

    for (let i = 1; i < pts.length; i += 1) {
      const a = pts[i - 1];
      const b = pts[i];
      const ax = (a.x || 0) * canvas.width;
      const ay = (a.y || 0) * canvas.height;
      const bx = (b.x || 0) * canvas.width;
      const by = (b.y || 0) * canvas.height;
      const dSq = distPointToSegmentSq(px, py, ax, ay, bx, by);
      if (dSq <= threshSq) return true;
    }
    return false;
  }, [distPointToSegmentSq]);

  const getStrokeBoundsPx = useCallback((canvas, stroke) => {
    if (!canvas || !stroke) return null;
    const pts = Array.isArray(stroke?.points) ? stroke.points : [];
    if (pts.length < 1) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      const x = (p.x || 0) * canvas.width;
      const y = (p.y || 0) * canvas.height;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }

    const minDimPx = Math.max(1, Math.min(canvas.width, canvas.height));
    const lineWidth = Math.max(1, Math.round((stroke.widthRel || 0) * minDimPx));
    const pad = Math.max(10, Math.round(lineWidth / 2) + 8);

    return {
      boxX: Math.round(Math.max(0, minX - pad)),
      boxY: Math.round(Math.max(0, minY - pad)),
      boxW: Math.round(Math.min(canvas.width, maxX + pad) - Math.max(0, minX - pad)),
      boxH: Math.round(Math.min(canvas.height, maxY + pad) - Math.max(0, minY - pad)),
    };
  }, []);

  const commitTextToCanvas = useCallback((value, xNormIn, yNormIn, baseText = null) => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return false;
    const text = String(value || '').trimEnd();
    if (!text.trim()) return false;

    const xNorm = typeof xNormIn === 'number' && isFinite(xNormIn) ? Math.max(0, Math.min(1, xNormIn)) : 0;
    const yNorm = typeof yNormIn === 'number' && isFinite(yNormIn) ? Math.max(0, Math.min(1, yNormIn)) : 0;

    // Use layout dimensions (pre-transform) for sizing defaults, NOT visual rect
    const layoutW = canvas.offsetWidth || 1;
    const layoutH = canvas.offsetHeight || 1;
    const minDimCss = Math.max(1, Math.min(layoutW, layoutH));

    const base = baseText && typeof baseText === 'object' ? baseText : null;

    const defaultBg = (base?.bgColor != null) ? String(base.bgColor) : String(textHighlightColor || '#000000');
    const defaultText = (base?.textColor != null) ? String(base.textColor) : '#ffffff';
    const defaultStroke = (base?.textStrokeColor != null) ? String(base.textStrokeColor) : '#000000';

    annotationsRef.current.texts.push({
      xNorm,
      yNorm,
      value: text,
      boxWNorm: typeof base?.boxWNorm === 'number' ? base.boxWNorm : null,
      fontSizeRel: typeof base?.fontSizeRel === 'number' ? base.fontSizeRel : (36 / minDimCss),
      padXRel: typeof base?.padXRel === 'number' ? base.padXRel : (14 / minDimCss),
      padYRel: typeof base?.padYRel === 'number' ? base.padYRel : (8 / minDimCss),
      radiusRel: typeof base?.radiusRel === 'number' ? base.radiusRel : (10 / minDimCss),
      strokeWidthRel: typeof base?.strokeWidthRel === 'number' ? base.strokeWidthRel : (5 / minDimCss),
      bgColor: defaultBg,
      textColor: defaultText,
      textStrokeColor: defaultStroke,
      forceCircle: base?.forceCircle === true,
    });

    redrawAnnotations();
    return true;
  }, [redrawAnnotations, textHighlightColor]);

  // When starting an export/copy snapshot, ensure we don't capture selection UI state
  // (selected boxes / active tools) and that any in-progress text edits are committed.
  useEffect(() => {
    const wasExporting = prevIsExportingRef.current;
    const nowExporting = Boolean(isExporting);
    prevIsExportingRef.current = nowExporting;
    if (!nowExporting || wasExporting) return;

    if (textEditor) {
      commitTextToCanvas(textEditor.value, textEditor.xNorm, textEditor.yNorm, textEditor.baseText || null);
      setTextEditor(null);
    }

    drawStateRef.current = { drawing: false, pointerId: null, strokeIndex: -1 };
    textDragRef.current = { dragging: false, pointerId: null, offsetX: 0, offsetY: 0 };
    textMoveRef.current = { dragging: false, pointerId: null, textIndex: -1, offsetX: 0, offsetY: 0 };
    textResizeRef.current = {
      resizing: false,
      pointerId: null,
      textIndex: -1,
      mode: null,
      startX: 0,
      startY: 0,
      startBox: null,
      startText: null,
    };

    setSelectedTextIndex(-1);
    setSelectedStrokeIndex(-1);
    setTextSelectionNonce((n) => n + 1);
    setStrokeSelectionNonce((n) => n + 1);

    onRequestDeselectTool && onRequestDeselectTool();
  }, [commitTextToCanvas, isExporting, onRequestDeselectTool, textEditor]);

  const beginEditTextAtIndex = useCallback((idx) => {
    if (idx < 0) return;
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const t = annotationsRef.current.texts[idx];
    if (!t) return;

    const xNorm = typeof t.xNorm === 'number' ? t.xNorm : 0;
    const yNorm = typeof t.yNorm === 'number' ? t.yNorm : 0;

    annotationsRef.current.texts.splice(idx, 1);
    redrawAnnotations();

    setSelectedTextIndex(-1);
    setTextSelectionNonce((n) => n + 1);
    setTextEditor({ xNorm, yNorm, value: String(t.value || ''), baseText: { ...t }, mode: 'edit' });
  }, [redrawAnnotations]);

  const deleteSelectedAnnotation = useCallback(() => {
    let deleted = false;
    if (selectedTextIndex >= 0) {
      annotationsRef.current.texts.splice(selectedTextIndex, 1);
      setSelectedTextIndex(-1);
      setTextSelectionNonce((n) => n + 1);
      deleted = true;
    } else if (selectedStrokeIndex >= 0) {
      annotationsRef.current.strokes.splice(selectedStrokeIndex, 1);
      setSelectedStrokeIndex(-1);
      setStrokeSelectionNonce((n) => n + 1);
      deleted = true;
    }
    if (deleted) redrawAnnotations();
    return deleted;
  }, [redrawAnnotations, selectedStrokeIndex, selectedTextIndex]);

  // Intentionally not updating item colors when penColor changes while an item is selected.
  // Previously this caused accidental recoloring when users just wanted to drag/reposition.

  const getNextVisibleCounterNumber = useCallback(() => {
    const texts = Array.isArray(annotationsRef.current?.texts) ? annotationsRef.current.texts : [];
    let maxSeen = 0;
    for (const t of texts) {
      if (!t || t.forceCircle !== true) continue;
      const n = Number.parseInt(String(t.value ?? '').trim(), 10);
      if (Number.isFinite(n) && n > maxSeen) {
        maxSeen = n;
      }
    }
    return Math.max(1, Math.min(9999, maxSeen + 1));
  }, []);

  const onExistingTextPointerDownCapture = useCallback((e) => {
    if (activeTool) return;
    if (e.button !== 0) return;
    if (e.target?.dataset?.textResizeHandle) return;

    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pt = clientToCanvasPoint(e.clientX, e.clientY);
    if (!pt) return;

    for (let i = annotationsRef.current.texts.length - 1; i >= 0; i -= 1) {
      const t = annotationsRef.current.texts[i];
      const box = getTextBoxPx(ctx, canvas, t);
      if (!box) continue;

      const inside = pt.x >= box.boxX && pt.x <= (box.boxX + box.boxW) && pt.y >= box.boxY && pt.y <= (box.boxY + box.boxH);
      if (!inside) continue;

      setSelectedTextIndex(i);
      setSelectedStrokeIndex(-1);

      if (textEditor) {
        commitTextToCanvas(textEditor.value, textEditor.xNorm, textEditor.yNorm, textEditor.baseText || null);
        setTextEditor(null);
      }

      e.preventDefault();
      e.stopPropagation();

      textMoveRef.current = {
        dragging: true,
        pointerId: e.pointerId,
        textIndex: i,
        offsetX: pt.x - box.boxX,
        offsetY: pt.y - box.boxY,
      };

      try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch {}
      return;
    }

    for (let i = annotationsRef.current.strokes.length - 1; i >= 0; i -= 1) {
      const s = annotationsRef.current.strokes[i];
      if (!isStrokeHit(canvas, s, pt.x, pt.y, 0)) continue;
      e.preventDefault();
      e.stopPropagation();
      setSelectedStrokeIndex(i);
      setStrokeSelectionNonce((n) => n + 1);
      setSelectedTextIndex(-1);
      setTextSelectionNonce((n) => n + 1);
      return;
    }

    setSelectedTextIndex(-1);
    setSelectedStrokeIndex(-1);
    setTextSelectionNonce((n) => n + 1);
    setStrokeSelectionNonce((n) => n + 1);
  }, [activeTool, clientToCanvasPoint, commitTextToCanvas, getTextBoxPx, isStrokeHit, textEditor]);

  const onExistingTextDoubleClickCapture = useCallback((e) => {
    if (activeTool) return;
    if (isEditableEventTarget(e.target)) return;
    if (selectedTextIndex < 0) return;

    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pt = clientToCanvasPoint(e.clientX, e.clientY);
    if (!pt) return;

    const t = annotationsRef.current.texts[selectedTextIndex];
    if (!t) return;
    const box = getTextBoxPx(ctx, canvas, t);
    if (!box) return;

    const inside = pt.x >= box.boxX && pt.x <= (box.boxX + box.boxW) && pt.y >= box.boxY && pt.y <= (box.boxY + box.boxH);
    if (!inside) return;

    e.preventDefault();
    e.stopPropagation();
    beginEditTextAtIndex(selectedTextIndex);
  }, [activeTool, beginEditTextAtIndex, clientToCanvasPoint, getTextBoxPx, selectedTextIndex]);

  const onExistingTextPointerMoveCapture = useCallback((e) => {
    if (textResizeRef.current.resizing) {
      if (textResizeRef.current.pointerId !== e.pointerId) return;
      if (activeTool) return;

      const canvas = annotationCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const pt = clientToCanvasPoint(e.clientX, e.clientY);
      if (!pt) return;

      const idx = textResizeRef.current.textIndex;
      const t = annotationsRef.current.texts[idx];
      if (!t) return;

      const startText = textResizeRef.current.startText;
      const startBox = textResizeRef.current.startBox;
      if (!startText || !startBox) return;

      const minDimPx = Math.max(1, Math.min(canvas.width, canvas.height));

      const dx = pt.x - textResizeRef.current.startX;
      const dy = pt.y - textResizeRef.current.startY;

      const MIN_W = 60;
      const MIN_H = 40;

      const startL = startBox.boxX;
      const startT = startBox.boxY;
      const startR = startBox.boxX + startBox.boxW;
      const startB = startBox.boxY + startBox.boxH;

      let nextL = startL;
      let nextT = startT;
      let nextR = startR;
      let nextB = startB;

      const mode = String(textResizeRef.current.mode || '');
      const hasL = mode.includes('l');
      const hasR = mode.includes('r');
      const hasT = mode.includes('t');
      const hasB = mode.includes('b');

      const isWidthOnly = (hasL || hasR) && !(hasT || hasB);
      const isHeightOnly = (hasT || hasB) && !(hasL || hasR);

      if (hasL) nextL = clamp(startL + dx, 0, startR - MIN_W);
      if (hasR) nextR = clamp(startR + dx, startL + MIN_W, canvas.width);
      if (hasT) nextT = clamp(startT + dy, 0, startB - MIN_H);
      if (hasB) nextB = clamp(startB + dy, startT + MIN_H, canvas.height);

      const nextBoxX = Math.round(nextL);
      const nextBoxY = Math.round(nextT);
      const nextBoxW = Math.round(Math.max(MIN_W, nextR - nextL));
      const nextBoxH = Math.round(Math.max(MIN_H, nextB - nextT));

      t.xNorm = canvas.width ? clamp(nextBoxX / canvas.width, 0, 1) : 0;
      t.yNorm = canvas.height ? clamp(nextBoxY / canvas.height, 0, 1) : 0;

      t.boxWNorm = (nextBoxW && canvas.width) ? clamp(nextBoxW / canvas.width, 0.01, 1) : null;
      t.fontSizeRel = startText.fontSizeRel;
      t.padXRel = startText.padXRel;
      t.padYRel = startText.padYRel;
      t.radiusRel = startText.radiusRel;
      t.strokeWidthRel = startText.strokeWidthRel;

      // When resizing, avoid a feedback loop between width->wrapping->height measurement.
      // That loop made diagonal shrinks produce tiny text and weird whitespace.
      // Instead, scale typographic metrics relative to the starting box dimensions.
      // Width-only handles should NOT scale typography; they only change wrapping width.
      if (!isWidthOnly && (hasT || hasB || hasL || hasR)) {
        const startW = Math.max(1, startBox.boxW || 1);
        const startH = Math.max(1, startBox.boxH || 1);
        const scaleW = clamp(nextBoxW / startW, 0.2, 6);
        const scaleH = clamp(nextBoxH / startH, 0.2, 6);

        let scale;
        if (isHeightOnly) {
          scale = scaleH;
        } else {
          // Corners: use the smaller axis change so diagonal shrink doesn't nuke font size.
          scale = Math.min(scaleW, scaleH);
        }

        const baseFontRel = Math.max(1e-6, startText.fontSizeRel || 0);
        const minScaleByFont = (10 / minDimPx) / baseFontRel;
        scale = clamp(scale, minScaleByFont, 6);

        t.fontSizeRel = (startText.fontSizeRel || 0) * scale;
        t.padXRel = (startText.padXRel || 0) * scale;
        t.padYRel = (startText.padYRel || 0) * scale;
        t.radiusRel = (startText.radiusRel || 0) * scale;
        t.strokeWidthRel = (startText.strokeWidthRel || 0) * scale;
      }

      scheduleRedraw();
      setSelectedTextIndex(idx);
      scheduleTextSelectionUpdate();

      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (!textMoveRef.current.dragging) return;
    if (textMoveRef.current.pointerId !== e.pointerId) return;
    if (activeTool) return;

    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pt = clientToCanvasPoint(e.clientX, e.clientY);
    if (!pt) return;

    const idx = textMoveRef.current.textIndex;
    const t = annotationsRef.current.texts[idx];
    if (!t) return;

    const box = getTextBoxPx(ctx, canvas, t);
    const boxW = Math.max(1, box?.boxW || 1);
    const boxH = Math.max(1, box?.boxH || 1);

    const nextBoxX = clamp(pt.x - textMoveRef.current.offsetX, 0, Math.max(0, canvas.width - boxW));
    const nextBoxY = clamp(pt.y - textMoveRef.current.offsetY, 0, Math.max(0, canvas.height - boxH));

    t.xNorm = canvas.width ? clamp(nextBoxX / canvas.width, 0, 1) : 0;
    t.yNorm = canvas.height ? clamp(nextBoxY / canvas.height, 0, 1) : 0;
    scheduleRedraw();
    scheduleTextSelectionUpdate();

    e.preventDefault();
    e.stopPropagation();
  }, [activeTool, clientToCanvasPoint, getTextBoxPx, scheduleRedraw, scheduleTextSelectionUpdate]);

  const onExistingTextPointerUpCapture = useCallback((e) => {
    if (textResizeRef.current.resizing) {
      if (textResizeRef.current.pointerId !== e.pointerId) return;
      textResizeRef.current = { resizing: false, pointerId: null, textIndex: -1, mode: null, startX: 0, startY: 0, startBox: null, startText: null };
      try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch {}
      return;
    }

    if (!textMoveRef.current.dragging) return;
    if (textMoveRef.current.pointerId !== e.pointerId) return;

    textMoveRef.current = { dragging: false, pointerId: null, textIndex: -1, offsetX: 0, offsetY: 0 };
    try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch {}
  }, []);

  // Keyboard shortcuts.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onKeyDown = (ev) => {
      if (isEditableEventTarget(ev.target)) return;

      if (ev.key === 'Escape') {
        if (textEditor) {
          ev.preventDefault();
          setTextEditor(null);
        }

        const hadSelection = selectedTextIndex >= 0 || selectedStrokeIndex >= 0;
        if (hadSelection) {
          ev.preventDefault();
          setSelectedTextIndex(-1);
          setSelectedStrokeIndex(-1);
          scheduleTextSelectionUpdate();
          scheduleStrokeSelectionUpdate();
        }

        if (activeTool) {
          ev.preventDefault();
          onRequestDeselectTool && onRequestDeselectTool();
        }
        return;
      }

      if (ev.key === 'Backspace') {
        if (activeTool) return;
        if (selectedTextIndex < 0 && selectedStrokeIndex < 0) return;
        ev.preventDefault();
        deleteSelectedAnnotation();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTool, deleteSelectedAnnotation, onRequestDeselectTool, selectedStrokeIndex, selectedTextIndex, textEditor]);

  // If the user switches away from the text tool while an editor is open, commit it.
  useEffect(() => {
    if (!textEditor) return;
    if (textEditor.mode !== 'create') return;
    if (activeTool === 'text') return;
    commitTextToCanvas(textEditor.value, textEditor.xNorm, textEditor.yNorm, textEditor.baseText || null);
    setTextEditor(null);
  }, [activeTool, commitTextToCanvas, textEditor]);

  const onAnnotPointerDown = useCallback((e) => {
    if (!activeTool) return;
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const pt = clientToCanvasPoint(e.clientX, e.clientY);
    if (!pt) return;

    if (activeTool === 'pen') {
      if (textEditor) {
        commitTextToCanvas(textEditor.value, textEditor.xNorm, textEditor.yNorm);
        setTextEditor(null);
      }

      const canvas = annotationCanvasRef.current;
      if (!canvas) return;
      // Use layout dimensions (pre-transform) for consistent sizing across live & export
      const layoutW = canvas.offsetWidth || 1;
      const layoutH = canvas.offsetHeight || 1;
      const rect = canvas.getBoundingClientRect();
      const xNorm = rect.width ? Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) : 0;
      const yNorm = rect.height ? Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)) : 0;

      const minDimCss = Math.max(1, Math.min(layoutW, layoutH));
      const stroke = {
        type: 'pen',
        points: [{ x: xNorm, y: yNorm }],
        widthRel: 4 / minDimCss,
        color: penColor || '#ffffff',
        alpha: 1,
      };

      const idx = annotationsRef.current.strokes.push(stroke) - 1;
      drawStateRef.current = { drawing: true, pointerId: e.pointerId, strokeIndex: idx };

      scheduleRedraw();

      try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch {};
      return;
    }

    // Arrow tool: start drawing from pointer position
    if (activeTool === 'arrow') {
      if (textEditor) {
        commitTextToCanvas(textEditor.value, textEditor.xNorm, textEditor.yNorm);
        setTextEditor(null);
      }

      const canvas = annotationCanvasRef.current;
      if (!canvas) return;
      const layoutW = canvas.offsetWidth || 1;
      const layoutH = canvas.offsetHeight || 1;
      const rect = canvas.getBoundingClientRect();
      const xNorm = rect.width ? Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) : 0;
      const yNorm = rect.height ? Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)) : 0;

      const minDimCss = Math.max(1, Math.min(layoutW, layoutH));
      const stroke = {
        type: 'arrow',
        points: [{ x: xNorm, y: yNorm }, { x: xNorm, y: yNorm }],
        widthRel: 6 / minDimCss,
        color: penColor || '#FF3B30',
        alpha: 1,
      };

      const idx = annotationsRef.current.strokes.push(stroke) - 1;
      drawStateRef.current = { drawing: true, pointerId: e.pointerId, strokeIndex: idx };

      scheduleRedraw();
      try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch {};
      return;
    }

    // Shape (rectangle/ellipse) tool: start drawing from pointer position
    if (activeTool === 'shape') {
      if (textEditor) {
        commitTextToCanvas(textEditor.value, textEditor.xNorm, textEditor.yNorm);
        setTextEditor(null);
      }

      const canvas = annotationCanvasRef.current;
      if (!canvas) return;
      const layoutW = canvas.offsetWidth || 1;
      const layoutH = canvas.offsetHeight || 1;
      const rect = canvas.getBoundingClientRect();
      const xNorm = rect.width ? Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) : 0;
      const yNorm = rect.height ? Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)) : 0;

      const minDimCss = Math.max(1, Math.min(layoutW, layoutH));
      const stroke = {
        type: shapeMode === 'ellipse' ? 'ellipse' : 'rect',
        points: [{ x: xNorm, y: yNorm }, { x: xNorm, y: yNorm }],
        widthRel: 3 / minDimCss,
        color: penColor || '#FF3B30',
        alpha: 1,
      };

      const idx = annotationsRef.current.strokes.push(stroke) - 1;
      drawStateRef.current = { drawing: true, pointerId: e.pointerId, strokeIndex: idx };

      scheduleRedraw();
      try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch {};
      return;
    }

    if (activeTool === 'text') {
      const canvas = annotationCanvasRef.current;
      if (!canvas) return;
      // pt.x / pt.scaleX gives layout-space CSS pixels (pre-transform)
      const xCss = Math.max(0, pt.x / Math.max(1e-6, pt.scaleX));
      const yCss = Math.max(0, pt.y / Math.max(1e-6, pt.scaleY));

      // Use layout dimensions (offsetWidth/Height) not visual rect to normalise
      const layoutW = pt.layoutW || canvas.offsetWidth || 1;
      const layoutH = pt.layoutH || canvas.offsetHeight || 1;
      const xNorm = layoutW ? Math.max(0, Math.min(1, xCss / layoutW)) : 0;
      const yNorm = layoutH ? Math.max(0, Math.min(1, yCss / layoutH)) : 0;

      if (textEditor) {
        commitTextToCanvas(textEditor.value, textEditor.xNorm, textEditor.yNorm, textEditor.baseText || null);
      }

      setTextEditor({ xNorm, yNorm, value: '', mode: 'create', baseText: null });
      return;
    }

    // Numbered counter stamp (filled 1 icon behavior).
    // Each click places the next number, using the current annotation color.
    if (activeTool === 'circle1') {
      const canvas = annotationCanvasRef.current;
      if (!canvas) return;
      // pt.x / pt.scaleX gives layout-space CSS pixels (pre-transform)
      const xCss = Math.max(0, pt.x / Math.max(1e-6, pt.scaleX));
      const yCss = Math.max(0, pt.y / Math.max(1e-6, pt.scaleY));

      // Use layout dimensions (offsetWidth/Height) not visual rect to normalise
      const layoutW = pt.layoutW || canvas.offsetWidth || 1;
      const layoutH = pt.layoutH || canvas.offsetHeight || 1;
      // Place the badge centered on the click.
      // Approximate badge size in CSS px; the text layout will refine the real size.
      const approxBadgePx = 52;
      const xNorm = layoutW ? Math.max(0, Math.min(1, (xCss - approxBadgePx / 2) / layoutW)) : 0;
      const yNorm = layoutH ? Math.max(0, Math.min(1, (yCss - approxBadgePx / 2) / layoutH)) : 0;

      const n = getNextVisibleCounterNumber();
      const nStr = String(n);
      const digits = nStr.length;

      const minDimCss = Math.max(1, Math.min(layoutW, layoutH));

      // Scale badge size and font to keep circle compact regardless of digit count.
      // Single digit: 52px / 28px font. Double: 58px / 22px. Triple+: 64px / 17px.
      const badgeDiameterPx = digits === 1 ? 52 : digits === 2 ? 58 : 64;
      const fontSizePx = digits === 1 ? 28 : digits === 2 ? 22 : 17;
      const badgeDiameterRel = badgeDiameterPx / Math.max(1, layoutW);

      // Equal padding so forceCircle produces a perfect circle.
      const badgePadRel = (14 / minDimCss);

      commitTextToCanvas(
        nStr,
        xNorm,
        yNorm,
        {
          fontSizeRel: (fontSizePx / minDimCss),
          padXRel: badgePadRel,
          padYRel: badgePadRel,
          radiusRel: (999 / minDimCss),
          strokeWidthRel: (0 / minDimCss),
          bgColor: String(counterColor || '#7c3aed'),
          textColor: '#ffffff',
          // textStrokeColor left unset — the renderer applies a default black outline
          // to all forceCircle badges via effectiveStrokeCol in redrawAnnotations.
          textStrokeColor: 'rgba(0,0,0,0)',
          boxWNorm: badgeDiameterRel,
          forceCircle: true,
        }
      );
      return;
    }
  }, [activeTool, clientToCanvasPoint, commitTextToCanvas, counterColor, getNextVisibleCounterNumber, onRequestDeselectTool, penColor, scheduleRedraw, shapeMode, textEditor]);

  const onAnnotPointerMove = useCallback((e) => {
    if (!activeTool || activeTool === 'text' || activeTool === 'circle1') return;
    if (!drawStateRef.current.drawing) return;
    if (drawStateRef.current.pointerId !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();

    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const xNorm = rect.width ? Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) : 0;
    const yNorm = rect.height ? Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)) : 0;

    const idx = drawStateRef.current.strokeIndex;
    const stroke = annotationsRef.current.strokes[idx];
    if (!stroke) return;

    const strokeType = stroke.type || 'pen';

    if (strokeType === 'pen') {
      // Pen: append points for freehand drawing
      stroke.points.push({ x: xNorm, y: yNorm });
      stroke.pathStr = null;
    } else {
      // Arrow / Rect: update the endpoint (second point)
      if (stroke.points.length >= 2) {
        stroke.points[stroke.points.length - 1] = { x: xNorm, y: yNorm };
      } else {
        stroke.points.push({ x: xNorm, y: yNorm });
      }
    }

    scheduleRedraw();
  }, [activeTool, scheduleRedraw]);

  const onAnnotPointerUp = useCallback((e) => {
    if (!activeTool || activeTool === 'text' || activeTool === 'circle1') return;
    if (!drawStateRef.current.drawing) return;
    if (drawStateRef.current.pointerId !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    const releasedStrokeIndex = drawStateRef.current.strokeIndex;
    drawStateRef.current = { drawing: false, pointerId: null, strokeIndex: -1 };

    const stroke = annotationsRef.current.strokes[releasedStrokeIndex];
    if (!stroke || stroke.type !== 'pen') return;

    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const minDimPx = Math.max(1, Math.min(canvas.width, canvas.height));
    const lineWidth = Math.max(1, Math.round((stroke.widthRel || 0) * minDimPx));
    const pts = Array.isArray(stroke.points) ? stroke.points : [];
    if (pts.length < 2) return;

    const pixelPoints = pts.map((p) => [p.x * canvas.width, p.y * canvas.height, 0.5]);
    const outlinePoints = getStroke(pixelPoints, {
      size: lineWidth * 2,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: true,
      start: { taper: 0, cap: true },
      end: { taper: 0, cap: true },
    });
    if (!outlinePoints.length) return;

    const seq = ++penPathSeqRef.current;
    const rustPath = computePenPathViaRust(outlinePoints);
    Promise.resolve(rustPath).then((pathStr) => {
      if (seq !== penPathSeqRef.current) return;
      if (typeof pathStr !== 'string' || !pathStr.trim()) return;
      const target = annotationsRef.current.strokes[releasedStrokeIndex];
      if (!target || target.type !== 'pen') return;
      target.pathStr = pathStr;
      scheduleRedraw();
    }).catch(() => {});
  }, [activeTool, computePenPathViaRust, scheduleRedraw]);

  const selectionOverlays = useMemo(() => {
    const HANDLE_SZ = 10;
    const HALF = HANDLE_SZ / 2;

    // Shared helper: convert canvas-space pixel box to CSS-space coordinates.
    // IMPORTANT: use offsetWidth/offsetHeight (layout pixels) instead of
    // getBoundingClientRect() which returns post-transform visual pixels.
    // When the export area is scaled via CSS transform (fitScale), getBoundingClientRect
    // returns scaled dimensions while canvas.width is based on offsetWidth * dpr,
    // causing a mismatch.  offsetWidth is immune to ancestor transforms.
    const canvasBoxToCss = (canvas, box) => {
      if (!canvas || !box) return null;
      const layoutW = canvas.offsetWidth || 1;
      const layoutH = canvas.offsetHeight || 1;
      const scaleX = canvas.width / layoutW;
      const scaleY = canvas.height / layoutH;
      return {
        left: box.boxX / scaleX,
        top: box.boxY / scaleY,
        width: box.boxW / scaleX,
        height: box.boxH / scaleY,
      };
    };

    // Consistent handle styling
    const baseHandleStyle = {
      width: HANDLE_SZ,
      height: HANDLE_SZ,
      background: '#fff',
      border: '1.5px solid rgba(48,123,82,0.85)',
      borderRadius: 9999,
      position: 'absolute',
      pointerEvents: 'auto',
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      zIndex: 2,
    };

    // Render a selection handle at a specific position
    const renderHandle = (key, cx, cy, cursor, onPointerDown) => (
      <div
        key={key}
        data-text-resize-handle={key}
        onPointerDown={onPointerDown}
        style={{
          ...baseHandleStyle,
          left: cx - HALF,
          top: cy - HALF,
          cursor,
        }}
      />
    );

    // Selected text box overlay + resize handles (only when no tool is active)
    const renderSelectedText = () => {
      if (activeTool) return null;
      if (selectedTextIndex < 0) return null;
      void textSelectionNonce;

      const canvas = annotationCanvasRef.current;
      if (!canvas) return null;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const selectedText = annotationsRef.current.texts[selectedTextIndex];
      if (!selectedText) return null;

      const box = getTextBoxPx(ctx, canvas, selectedText);
      if (!box) return null;

      const css = canvasBoxToCss(canvas, box);
      if (!css) return null;

      const { left, top, width, height } = css;
      const midX = left + width / 2;
      const midY = top + height / 2;
      const right = left + width;
      const bottom = top + height;

      const startResize = (mode) => (e) => {
        if (activeTool) return;
        if (e.button !== 0) return;

        const canvas2 = annotationCanvasRef.current;
        if (!canvas2) return;
        const ctx2 = canvas2.getContext('2d');
        if (!ctx2) return;

        const pt = clientToCanvasPoint(e.clientX, e.clientY);
        if (!pt) return;

        const currentText = annotationsRef.current.texts[selectedTextIndex];
        if (!currentText) return;

        const b2 = getTextBoxPx(ctx2, canvas2, currentText);
        if (!b2) return;

        e.preventDefault();
        e.stopPropagation();

        textResizeRef.current = {
          resizing: true,
          pointerId: e.pointerId,
          textIndex: selectedTextIndex,
          mode,
          startX: pt.x,
          startY: pt.y,
          startBox: b2,
          startText: { ...currentText },
        };

        try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch {}
      };

      return (
        <div className="absolute inset-0" style={{ zIndex: 30, pointerEvents: 'none' }}>
          {/* Selection border */}
          <div
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              beginEditTextAtIndex(selectedTextIndex);
            }}
            style={{
              position: 'absolute',
              left,
              top,
              width,
              height,
              border: '1.5px solid rgba(48,123,82,0.8)',
              borderRadius: 2,
              boxSizing: 'border-box',
              pointerEvents: 'auto',
              zIndex: 1,
            }}
          />

          {/* Side handles */}
          {renderHandle('l', left, midY, 'ew-resize', startResize('l'))}
          {renderHandle('r', right, midY, 'ew-resize', startResize('r'))}
          {renderHandle('t', midX, top, 'ns-resize', startResize('t'))}
          {renderHandle('b', midX, bottom, 'ns-resize', startResize('b'))}

          {/* Corner handles */}
          {renderHandle('tl', left, top, 'nwse-resize', startResize('tl'))}
          {renderHandle('tr', right, top, 'nesw-resize', startResize('tr'))}
          {renderHandle('bl', left, bottom, 'nesw-resize', startResize('bl'))}
          {renderHandle('br', right, bottom, 'nwse-resize', startResize('br'))}
        </div>
      );
    };

    const renderSelectedStroke = () => {
      if (activeTool) return null;
      if (selectedStrokeIndex < 0) return null;
      void strokeSelectionNonce;

      const canvas = annotationCanvasRef.current;
      if (!canvas) return null;

      const s = annotationsRef.current.strokes[selectedStrokeIndex];
      if (!s) return null;

      const bounds = getStrokeBoundsPx(canvas, s);
      if (!bounds) return null;

      const css = canvasBoxToCss(canvas, bounds);
      if (!css) return null;

      return (
        <div className="absolute inset-0" style={{ zIndex: 30, pointerEvents: 'none' }}>
          <div
            style={{
              position: 'absolute',
              left: css.left,
              top: css.top,
              width: css.width,
              height: css.height,
              border: '1.5px dashed rgba(48,123,82,0.75)',
              borderRadius: 2,
              boxSizing: 'border-box',
              pointerEvents: 'none',
            }}
          />
        </div>
      );
    };

    return (
      <>
        {renderSelectedText()}
        {renderSelectedStroke()}
      </>
    );
  }, [
    activeTool,
    beginEditTextAtIndex,
    clientToCanvasPoint,
    getStrokeBoundsPx,
    getTextBoxPx,
    selectedStrokeIndex,
    selectedTextIndex,
    strokeSelectionNonce,
    textSelectionNonce,
  ]);

  const annotationLayer = useMemo(() => {
    const cssW = Math.max(1, Math.round(bgCanvasSize?.width || 0));
    const cssH = Math.max(1, Math.round(bgCanvasSize?.height || 0));

    // Keep the HTML editor anchored to normalized coords so it never drifts vs the
    // canvas-drawn text/selection box as the export area resizes.
    const editorLeft = textEditor ? (Math.max(0, Math.min(1, Number(textEditor.xNorm) || 0)) * cssW) : 0;
    const editorTop = textEditor ? (Math.max(0, Math.min(1, Number(textEditor.yNorm) || 0)) * cssH) : 0;

    return (
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ zIndex: 25, pointerEvents: (activeTool || textEditor) ? 'auto' : 'none' }}
      >
        <canvas
          ref={annotationCanvasRef}
          data-siteshot-annotation-canvas="1"
          className="absolute inset-0 w-full h-full"
          style={{
            display: 'block',
            cursor: (activeTool === 'pen' || activeTool === 'arrow' || activeTool === 'shape') ? 'crosshair' : (activeTool === 'text' ? 'text' : 'default'),
            touchAction: 'none',
          }}
          onPointerDown={onAnnotPointerDown}
          onPointerMove={onAnnotPointerMove}
          onPointerUp={onAnnotPointerUp}
          onPointerCancel={onAnnotPointerUp}
        />

        {textEditor ? (
          <textarea
            className="annotation-text-editor"
            value={textEditor.value}
            autoFocus
            rows={2}
            spellCheck={false}
            style={{ left: editorLeft, top: editorTop }}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (e.button !== 0) return;

              const rect = e.currentTarget.getBoundingClientRect();
              const offsetX = e.clientX - rect.left;
              const offsetY = e.clientY - rect.top;

              const DRAG_HANDLE_H = 28;
              if (offsetY <= DRAG_HANDLE_H) {
                e.preventDefault();
                textDragRef.current = { dragging: true, pointerId: e.pointerId, offsetX, offsetY };
                try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch {}
              }
            }}
            onPointerMove={(e) => {
              if (!textDragRef.current.dragging) return;
              if (textDragRef.current.pointerId !== e.pointerId) return;
              e.preventDefault();
              e.stopPropagation();

              const canvas = annotationCanvasRef.current;
              if (!canvas) return;
              const canvasRect = canvas.getBoundingClientRect();
              const nextX = e.clientX - canvasRect.left - textDragRef.current.offsetX;
              const nextY = e.clientY - canvasRect.top - textDragRef.current.offsetY;

              const xCss = clamp(nextX, 0, Math.max(0, canvasRect.width - 24));
              const yCss = clamp(nextY, 0, Math.max(0, canvasRect.height - 24));

              const xNorm = canvasRect.width ? clamp(xCss / canvasRect.width, 0, 1) : 0;
              const yNorm = canvasRect.height ? clamp(yCss / canvasRect.height, 0, 1) : 0;

              setTextEditor((prev) => (prev ? { ...prev, xNorm, yNorm } : prev));
            }}
            onPointerUp={(e) => {
              if (textDragRef.current.pointerId !== e.pointerId) return;
              textDragRef.current = { dragging: false, pointerId: null, offsetX: 0, offsetY: 0 };
              try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch {}
            }}
            onPointerCancel={(e) => {
              if (textDragRef.current.pointerId !== e.pointerId) return;
              textDragRef.current = { dragging: false, pointerId: null, offsetX: 0, offsetY: 0 };
              try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch {}
            }}
            onChange={(ev) => setTextEditor((prev) => prev ? ({ ...prev, value: ev.target.value }) : prev)}
            onKeyDown={(ev) => {
              if (ev.key === 'Escape') {
                ev.preventDefault();
                setTextEditor(null);
                onRequestDeselectTool && onRequestDeselectTool();
                return;
              }
              if (ev.key === 'Enter' && !ev.shiftKey) {
                ev.preventDefault();
                const committed = commitTextToCanvas(textEditor.value, textEditor.xNorm, textEditor.yNorm, textEditor.baseText || null);
                setTextEditor(null);
                if (committed) {
                  const newIdx = annotationsRef.current.texts.length - 1;
                  setSelectedTextIndex(newIdx);
                  setSelectedStrokeIndex(-1);
                  scheduleTextSelectionUpdate();
                  if (textEditor.mode === 'create') onRequestDeselectTool && onRequestDeselectTool();
                }
              }
            }}
            onBlur={() => {
              const committed = commitTextToCanvas(textEditor.value, textEditor.xNorm, textEditor.yNorm, textEditor.baseText || null);
              setTextEditor(null);
              if (committed) {
                const newIdx = annotationsRef.current.texts.length - 1;
                setSelectedTextIndex(newIdx);
                setSelectedStrokeIndex(-1);
                scheduleTextSelectionUpdate();
                if (textEditor.mode === 'create') onRequestDeselectTool && onRequestDeselectTool();
              }
            }}
          />
        ) : null}
      </div>
    );
  }, [activeTool, bgCanvasSize?.height, bgCanvasSize?.width, commitTextToCanvas, onAnnotPointerDown, onAnnotPointerMove, onAnnotPointerUp, onRequestDeselectTool, scheduleTextSelectionUpdate, textEditor]);

  const clearAllAnnotations = useCallback(() => {
    annotationsRef.current.strokes = [];
    annotationsRef.current.texts = [];
    setSelectedTextIndex(-1);
    setSelectedStrokeIndex(-1);
    setTextSelectionNonce((n) => n + 1);
    setStrokeSelectionNonce((n) => n + 1);
    setTextEditor(null);
    redrawAnnotations();
  }, [redrawAnnotations]);

  const outerCaptureHandlers = useMemo(() => {
    return {
      onPointerDownCapture: onExistingTextPointerDownCapture,
      onPointerMoveCapture: onExistingTextPointerMoveCapture,
      onPointerUpCapture: onExistingTextPointerUpCapture,
      onPointerCancelCapture: onExistingTextPointerUpCapture,
      onDoubleClickCapture: onExistingTextDoubleClickCapture,
    };
  }, [onExistingTextDoubleClickCapture, onExistingTextPointerDownCapture, onExistingTextPointerMoveCapture, onExistingTextPointerUpCapture]);

  return {
    annotationLayer,
    selectionOverlays,
    outerCaptureHandlers,
    clearAllAnnotations,
  };
}



