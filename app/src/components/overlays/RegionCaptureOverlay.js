import React, { useCallback, useEffect, useRef, useState } from 'react';
import { computeObjectContainRect } from '@/utils/image/objectFit';

import { clamp } from '@/utils/core/math';

const normalizeRect = (a, b) => {
  const left = Math.min(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const width = Math.abs(a.x - b.x);
  const height = Math.abs(a.y - b.y);
  return { left, top, width, height };
};

const RegionCaptureOverlay = ({ isOpen, imageAssetUrl, onCancel, onConfirm }) => {
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const activePointerIdRef = useRef(null);
  const cancelingRef = useRef(false);
  const submittedRef = useRef(false);
  const pendingConfirmRef = useRef(null);
  const dragStartRef = useRef(null);
  const dragEndRef = useRef(null);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageRect, setImageRect] = useState(null);

  const selection = (dragStart && dragEnd) ? normalizeRect(dragStart, dragEnd) : null;
  const hasImage = !!imageAssetUrl;

  const refreshImageRect = useCallback(() => {
    const img = imageRef.current;
    const container = containerRef.current;
    if (!img || !container) return;

    const containerRect = container.getBoundingClientRect();
    const naturalW = Number(img.naturalWidth) || 0;
    const naturalH = Number(img.naturalHeight) || 0;
    const contained = computeObjectContainRect({
      containerLeft: containerRect.left,
      containerTop: containerRect.top,
      containerWidth: containerRect.width,
      containerHeight: containerRect.height,
      naturalWidth: naturalW,
      naturalHeight: naturalH,
    });

    // Use the actual rendered image content rect (object-fit: contain).
    // This keeps region selection aligned even when the window doesn't match
    // the screenshot aspect ratio (taskbar, non-primary monitor, etc).
    setImageRect(contained || containerRect);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    cancelingRef.current = false;
    submittedRef.current = false;
    pendingConfirmRef.current = null;
    // Blank slate on each open.
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
    dragStartRef.current = null;
    dragEndRef.current = null;
    // Ensure the overlay has focus so keyboard shortcuts work.
    // Tauri transparent windows can sometimes start unfocused.
    requestAnimationFrame(() => {
      try {
        containerRef.current?.focus?.();
      } catch {}
    });
    refreshImageRect();
    window.addEventListener('resize', refreshImageRect);
    return () => window.removeEventListener('resize', refreshImageRect);
  }, [isOpen, refreshImageRect]);

  // Also reset selection whenever we swap the underlying screenshot.
  useEffect(() => {
    if (!isOpen) return;
    submittedRef.current = false;
    pendingConfirmRef.current = null;
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
    dragStartRef.current = null;
    dragEndRef.current = null;
  }, [isOpen, imageAssetUrl]);

  // If the user completes a drag before the screenshot is loaded, auto-submit once ready.
  useEffect(() => {
    if (!isOpen) return;
    if (!hasImage) return;
    const pending = pendingConfirmRef.current;
    if (!pending) return;
    pendingConfirmRef.current = null;
    confirmFromPoints(pending.a, pending.b);
  }, [isOpen, hasImage, imageRect]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (!cancelingRef.current) {
          cancelingRef.current = true;
          setIsDragging(false);
          setDragStart(null);
          setDragEnd(null);
          dragStartRef.current = null;
          dragEndRef.current = null;
          onCancel?.();
        }
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [isOpen, selection, onCancel]);

  // Global listeners: attach immediately while open.
  // This avoids a first-drag race where React state hasn't updated yet, so
  // early pointermove events would be missed.
  useEffect(() => {
    if (!isOpen) return;

    const onMove = (e) => {
      const start = dragStartRef.current;
      if (!start) return;

      const activeId = activePointerIdRef.current;
      if (activeId != null && e.pointerId != null && e.pointerId !== activeId) return;

      const point = getClampedPoint(e.clientX, e.clientY);
      setDragEnd(point);
      dragEndRef.current = point;
    };

    const onUp = (e) => {
      if (!dragStartRef.current) return;
      const activeId = activePointerIdRef.current;
      if (activeId != null && e?.pointerId != null && e.pointerId !== activeId) return;

      setIsDragging(false);
      activePointerIdRef.current = null;
      confirmFromPoints(dragStartRef.current, dragEndRef.current);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [isOpen, imageRect]);

  const getClampedPoint = (clientX, clientY) => {
    const rect = imageRect || containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: clientX, y: clientY };
    const x = clamp(clientX, rect.left, rect.right);
    const y = clamp(clientY, rect.top, rect.bottom);
    return { x, y };
  };

  const onPointerDown = (e) => {
    if (!isOpen) return;
    // Allow starting a drag even if the screenshot is still loading.
    // We'll submit once the image becomes available.
    // Ensure the first click both focuses and begins a drag.
    try { containerRef.current?.focus?.(); } catch {}

    // On some platforms/environments (transparent Tauri windows, pen/touch),
    // `buttons` can be 0 on pointerdown. Accept 0/1 for primary clicks.
    if (e.isPrimary === false) return;
    if (e.button != null && e.button !== 0) return;
    if (typeof e.buttons === 'number' && !(e.buttons === 0 || e.buttons === 1)) return;
    e.preventDefault();
    e.stopPropagation();
    submittedRef.current = false;
    pendingConfirmRef.current = null;

    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}
    activePointerIdRef.current = e.pointerId;
    const point = getClampedPoint(e.clientX, e.clientY);
    setIsDragging(true);
    setDragStart(point);
    setDragEnd(point);
    dragStartRef.current = point;
    dragEndRef.current = point;
  };

  const onPointerMove = (e) => {
    // Use refs so the very first move after pointerdown is captured.
    if (!dragStartRef.current) return;
    if (activePointerIdRef.current != null && e.pointerId != null && e.pointerId !== activePointerIdRef.current) return;
    const point = getClampedPoint(e.clientX, e.clientY);
    setDragEnd(point);
    dragEndRef.current = point;
  };

  const confirmFromPoints = (a, b) => {
    if (submittedRef.current) return;
    if (!a || !b) return;
    if (!imageRef.current) return;

    // If the image hasn't loaded yet, queue this selection and flush once ready.
    if (!hasImage || !(imageRef.current.naturalWidth > 0 && imageRef.current.naturalHeight > 0)) {
      pendingConfirmRef.current = { a, b };
      return;
    }
    const rect = imageRect || imageRef.current.getBoundingClientRect();
    if (!rect) return;

    const sel = normalizeRect(a, b);
    if (sel.width < 3 || sel.height < 3) return;

    const sx = sel.left - rect.left;
    const sy = sel.top - rect.top;
    const sw = sel.width;
    const sh = sel.height;

    const imgEl = imageRef.current;
    const naturalW = imgEl.naturalWidth || rect.width;
    const naturalH = imgEl.naturalHeight || rect.height;
    const scaleX = naturalW / rect.width;
    const scaleY = naturalH / rect.height;

    const cropX = Math.round(sx * scaleX);
    const cropY = Math.round(sy * scaleY);
    const cropW = Math.round(sw * scaleX);
    const cropH = Math.round(sh * scaleY);

    submittedRef.current = true;
    pendingConfirmRef.current = null;
    // Clear selection immediately (window is expected to close right after).
    setDragStart(null);
    setDragEnd(null);
    dragStartRef.current = null;
    dragEndRef.current = null;
    onConfirm?.({ x: cropX, y: cropY, w: cropW, h: cropH });
  };

  const onPointerUp = (e) => {
    const start = dragStartRef.current;
    const end = dragEndRef.current;

    setIsDragging(false);
    activePointerIdRef.current = null;
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {}

    // Auto-submit on release (no on-screen buttons).
    confirmFromPoints(start, end);
  };

  const onPointerCancel = (e) => {
    setIsDragging(false);
    activePointerIdRef.current = null;
    dragStartRef.current = null;
    dragEndRef.current = null;
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="fixed inset-0 z-[9999] cursor-crosshair outline-none"
      // Important on Windows + transparent Tauri windows: if everything is
      // fully transparent, hit-testing can become flaky. A near-transparent
      // background keeps the window interactive without being visible.
      style={{ touchAction: 'none', backgroundColor: 'rgba(0,0,0,0.01)' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <img
        ref={imageRef}
        src={imageAssetUrl || ''}
        alt="Screen capture"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
        draggable={false}
        onLoad={() => {
          refreshImageRect();
          const pending = pendingConfirmRef.current;
          if (pending) {
            pendingConfirmRef.current = null;
            confirmFromPoints(pending.a, pending.b);
          }
        }}
      />

      {!hasImage && (
        <div
          className="absolute inset-0"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.9)',
            fontSize: 13,
            letterSpacing: 0.2,
            textShadow: '0 1px 10px rgba(0,0,0,0.85)',
            pointerEvents: 'none',
          }}
        >
          Loading screenshot…
        </div>
      )}

      {selection && (
        <div
          className="absolute border border-white/50 bg-blue-500/20"
          style={{
            left: selection.left,
            top: selection.top,
            width: selection.width,
            height: selection.height,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)'
          }}
        />
      )}
    </div>
  );
};

export default RegionCaptureOverlay;

