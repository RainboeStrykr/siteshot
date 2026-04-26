import React, { useCallback, useEffect, useRef, useState } from 'react';
import ImageDisplay from '../ImageDisplay.jsx';
import ImageUploader from '../ImageUploader.js';
import { SaveIcon, ClipboardIcon, FeedbackIcon } from '@/assets/icons.jsx';
import { Check, PenLine, RotateCcw, SlidersHorizontal, TextCursorInput, Palette } from 'lucide-react';
import { useI18n } from '../../context/I18nContext.js';
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarLabel,
} from '@/components/ui/menubar';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

export default function MainCanvasArea({
  isTauri,
  isNarrowLayout,
  blob,
  imageVersion,
  options,
  setOptions,
  shortcuts,
  exportSettings,
  wrapperRef,
  exportRef,
  copyDragMode,
  setCopyDragMode,
  activeAnnotTool,
  setActiveAnnotTool,
  shapeMode,
  setShapeMode,
  onPaste,
  detectedEdgeColor,
  onEdgeColorDetected,
  onAutoDetect,
  onLayoutMetrics,
  onTransformChange,
  onSave,
  onOpenExportSettings,
  onCopy,
  onReset,
  onFeedback,
}) {
  const { t } = useI18n();
  const exportMetaLabel = (() => {
    const s = exportSettings && typeof exportSettings === 'object' ? exportSettings : {};
    const preset = String(s.sizePreset || '1x');
    const custom = Number(s.customScale) || 1;
    const fmtRaw = String(s.format || 'png');
    const fmt = fmtRaw === 'jpeg' ? 'JPG' : fmtRaw.toUpperCase();

    let scaleLabel = preset;
    if (preset === 'custom') {
      const n = Math.max(0.25, Math.min(4, custom));
      const rounded = Math.round(n * 100) / 100;
      scaleLabel = `${rounded}x`;
    }

    return `${scaleLabel} · ${fmt}`;
  })();
  const fitViewportRef = useRef(null);
  const [fitScale, setFitScale] = useState(1);

  const measureFitScale = useCallback(() => {
    const viewport = fitViewportRef.current;
    const exportEl = exportRef?.current;
    if (!viewport || !exportEl) {
      setFitScale(1);
      return;
    }

    // Fit inside the viewport's usable content box (exclude padding).
    // The padding is reserved for UI overlays; without accounting for it,
    // the preview can overflow vertically/horizontally on resize/fullscreen.
    let padX = 0;
    let padY = 0;
    try {
      const cs = window.getComputedStyle(viewport);
      const pl = Number.parseFloat(cs.paddingLeft) || 0;
      const pr = Number.parseFloat(cs.paddingRight) || 0;
      const pt = Number.parseFloat(cs.paddingTop) || 0;
      const pb = Number.parseFloat(cs.paddingBottom) || 0;
      padX = Math.max(0, pl + pr);
      padY = Math.max(0, pt + pb);
    } catch (_) {
      padX = 0;
      padY = 0;
    }

    const availW = Math.max(1, viewport.clientWidth - padX);
    const availH = Math.max(1, viewport.clientHeight - padY);

    const contentW = Math.max(1, exportEl.offsetWidth || 1);
    const contentH = Math.max(1, exportEl.offsetHeight || 1);

    // Fit within the viewport bounds.
    const next = Math.min(1, availW / contentW, availH / contentH);
    setFitScale((prev) => (Math.abs(prev - next) < 0.001 ? prev : next));
  }, [exportRef]);

  useEffect(() => {
    const viewport = fitViewportRef.current;
    if (!viewport) return;
    let raf = 0;

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measureFitScale);
    };

    const roViewport = new ResizeObserver(schedule);
    roViewport.observe(viewport);

    let roExport;
    if (exportRef?.current) {
      roExport = new ResizeObserver(schedule);
      roExport.observe(exportRef.current);
    }

    schedule();
    return () => {
      cancelAnimationFrame(raf);
      try { roViewport.disconnect(); } catch (_) {}
      try { roExport && roExport.disconnect(); } catch (_) {}
    };
  }, [exportRef, blob?.src, imageVersion, options?.aspectMode, options?.aspectRatio, options?.aspectCustom?.w, options?.aspectCustom?.h, options?.aspectAuto?.w, options?.aspectAuto?.h, measureFitScale]);

  // Drag-to-copy overlay UI (legacy)
  const [dragBox, setDragBox] = useState(null);
  const dragStartRef = useRef(null);

  // Copy button UX feedback
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef(null);

  // Toast for background/auto-copy feedback + lightweight export progress indicator
  const [copyToast, setCopyToast] = useState(null); // { message: string, kind: 'success' | 'error' | 'loading', sticky?: boolean }
  const toastTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = null;
      }
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const onCopySuccess = () => {
      setCopied(true);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => {
        setCopied(false);
        copiedTimerRef.current = null;
      }, 1400);

      setCopyToast({ kind: 'success', message: t('copiedToClipboard') });
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setCopyToast(null);
        toastTimerRef.current = null;
      }, 2200);
    };

    const onCopyError = (e) => {
      const detail = e?.detail;
      const msg = (detail && typeof detail === 'string') ? detail : t('copyFailed');
      const trimmed = msg.length > 160 ? `${msg.slice(0, 157)}...` : msg;
      setCopyToast({ kind: 'error', message: trimmed });
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setCopyToast(null);
        toastTimerRef.current = null;
      }, 3200);
    };

    window.addEventListener('copy:success', onCopySuccess);
    window.addEventListener('copy:error', onCopyError);

    const onToastShow = (e) => {
      const detail = e?.detail;
      if (!detail || typeof detail !== 'object') return;
      const kind = detail.kind === 'error' ? 'error' : (detail.kind === 'loading' ? 'loading' : 'success');
      const msg = (typeof detail.message === 'string') ? detail.message : '';
      if (!msg) return;
      const sticky = !!detail.sticky || kind === 'loading';

      const trimmed = msg.length > 200 ? `${msg.slice(0, 197)}...` : msg;
      setCopyToast({ kind, message: trimmed, sticky });
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (!sticky) {
        toastTimerRef.current = setTimeout(() => {
          setCopyToast(null);
          toastTimerRef.current = null;
        }, kind === 'error' ? 4200 : 2600);
      }
    };

    const onToastHide = () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
      setCopyToast(null);
    };

    window.addEventListener('toast:show', onToastShow);
    window.addEventListener('toast:hide', onToastHide);
    return () => {
      window.removeEventListener('copy:success', onCopySuccess);
      window.removeEventListener('copy:error', onCopyError);
      window.removeEventListener('toast:show', onToastShow);
      window.removeEventListener('toast:hide', onToastHide);
    };
  }, []);

  const handleCopyClick = useCallback(async () => {
    await onCopy?.();
  }, [onCopy]);

  useEffect(() => {
    if (!copyDragMode) {
      setDragBox(null);
      dragStartRef.current = null;
    }
  }, [copyDragMode]);

  const cancelCopyDrag = useCallback(() => {
    setDragBox(null);
    dragStartRef.current = null;
    setCopyDragMode?.(false);
  }, [setCopyDragMode]);

  const finishCopyDrag = useCallback(() => {
    // Gesture confirmation — selection box does not crop; it just triggers Copy.
    try { onCopy?.(); } catch (_) {}
    cancelCopyDrag();
  }, [cancelCopyDrag, onCopy]);

  useEffect(() => {
    if (!copyDragMode) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelCopyDrag();
      }
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [copyDragMode, cancelCopyDrag]);

  const onOverlayPointerDown = useCallback((e) => {
    if (!copyDragMode) return;
    const viewport = fitViewportRef.current;
    if (!viewport) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = viewport.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    dragStartRef.current = { x, y };
    setDragBox({ x, y, w: 0, h: 0 });
  }, [copyDragMode]);

  const onOverlayPointerMove = useCallback((e) => {
    if (!copyDragMode) return;
    const viewport = fitViewportRef.current;
    const start = dragStartRef.current;
    if (!viewport || !start) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = viewport.getBoundingClientRect();
    const cx = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const cy = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const x = Math.min(start.x, cx);
    const y = Math.min(start.y, cy);
    const w = Math.abs(cx - start.x);
    const h = Math.abs(cy - start.y);
    setDragBox({ x, y, w, h });
  }, [copyDragMode]);

  const onOverlayPointerUp = useCallback((e) => {
    if (!copyDragMode) return;
    e.preventDefault();
    e.stopPropagation();
    finishCopyDrag();
  }, [copyDragMode, finishCopyDrag]);

  // Deselect annotation tools when clicking off the canvas/export area onto UI.
  useEffect(() => {
    if (!activeAnnotTool) return;

    const onPointerDownCapture = (e) => {
      const exportEl = exportRef?.current;
      const target = e.target;
      if (!exportEl || !target) return;

      // Don't auto-deselect when interacting with editor UI controls.
      if (target.closest?.('[data-editor-ui]')) return;

      if (exportEl.contains(target)) return;
      setActiveAnnotTool(null);
    };

    document.addEventListener('pointerdown', onPointerDownCapture, true);
    return () => document.removeEventListener('pointerdown', onPointerDownCapture, true);
  }, [activeAnnotTool, exportRef, setActiveAnnotTool]);

  return (
    <div
      data-tour="canvas-area"
      className="relative order-1 lg:order-2 flex-1 flex p-6 md:p-10"
      style={{
        overscrollBehavior: 'contain',
        background: isTauri ? 'transparent' : 'var(--app-bg)',
        overflow: 'hidden',
        zIndex: 1,
        contain: 'layout style',
        isolation: 'isolate',
        boxShadow: 'none',
      }}
    >
      <div className="w-full h-full overflow-visible">
        <div
          ref={fitViewportRef}
          className="relative w-full h-full flex items-center justify-center pt-24 pb-24 px-24 no-scrollbar"
          style={{ overflowX: 'visible', overflowY: 'visible' }}
        >
          {blob?.src ? (
            <div
              className="w-[1100px] max-w-full"
              style={{
                transform: `scale(${fitScale})`,
                transformOrigin: 'center center',
                willChange: 'transform',
              }}
            >
              <ImageDisplay
                key={imageVersion}
                options={options}
                blob={blob}
                activeTool={activeAnnotTool}
                shapeMode={shapeMode}
                onRequestDeselectTool={() => setActiveAnnotTool(null)}
                wrapperRef={wrapperRef}
                exportRef={exportRef}
                insetColor={detectedEdgeColor}
                onEdgeColorDetected={onEdgeColorDetected}
                onAutoDetect={onAutoDetect}
                onLayoutMetrics={onLayoutMetrics}
                onTransformChange={onTransformChange}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center w-full h-full min-h-[500px]">
              <ImageUploader onPaste={onPaste} shortcuts={shortcuts} />
            </div>
          )}

          {/* Drag-to-copy overlay */}
          {copyDragMode && blob?.src && (
            <div
              className="absolute inset-0 z-30"
              style={{ cursor: 'crosshair' }}
              onPointerDown={onOverlayPointerDown}
              onPointerMove={onOverlayPointerMove}
              onPointerUp={onOverlayPointerUp}
              onPointerCancel={onOverlayPointerUp}
            >
              {dragBox && (
                <div
                  className="absolute rounded-xl"
                  style={{
                    left: dragBox.x,
                    top: dragBox.y,
                    width: dragBox.w,
                    height: dragBox.h,
                    border: '1px solid var(--scrollbar-thumb)',
                    background: 'var(--chip-bg)',
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.18)',
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Annotation tools dock */}
      <div
        data-tour="annot-tools"
        data-editor-ui
        className="absolute top-4 left-0 right-0 flex flex-row items-center justify-center window-drag-region"
        style={{ zIndex: 20 }}
      >
        <div className="window-no-drag flex items-center gap-1 px-2 py-1.5 rounded-full"
          style={{ background: 'var(--editor-pill-bg)', border: '1px solid var(--editor-pill-border)', boxShadow: 'var(--editor-pill-shadow)' }}
        >
          {/* Pen tool — uses Menubar for the color picker dropdown */}
          <Menubar className="border-none shadow-none bg-transparent p-0 h-auto">
            <MenubarMenu>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <MenubarTrigger
                      className={`annotation-tool-btn editor-pill-button rounded-[0.9rem] w-9 h-9 p-0 flex items-center justify-center cursor-pointer
                        ${activeAnnotTool === 'pen' ? 'annotation-tool-btn--active' : ''}`}
                      onClick={() => setActiveAnnotTool((prev) => (prev === 'pen' ? null : 'pen'))}
                      aria-label={t('penTool')}
                      aria-pressed={activeAnnotTool === 'pen'}
                    >
                      <PenLine className="w-4 h-4" />
                    </MenubarTrigger>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>{t('penTool')}</TooltipContent>
              </Tooltip>
              <MenubarContent
                className="min-w-[160px]"
                style={{
                  background: 'var(--editor-pill-bg)',
                  border: '1px solid var(--editor-pill-border)',
                  boxShadow: 'var(--editor-pill-shadow)',
                  color: 'var(--app-fg)',
                }}
              >
                <MenubarLabel className="text-[11px] text-[color:var(--app-muted)]">
                  {t('penColor')}
                </MenubarLabel>
                <MenubarSeparator />
                <MenubarItem
                  className="gap-3 cursor-pointer focus:bg-white/10"
                  onSelect={(e) => e.preventDefault()}
                >
                  <Palette className="w-4 h-4 opacity-70" />
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className="w-5 h-5 rounded-full border border-white/20 shrink-0"
                      style={{ background: options?.pen?.color || '#FFFFFF' }}
                    />
                    <input
                      type="color"
                      value={options?.pen?.color || '#FFFFFF'}
                      className="annotation-color-input w-full h-5 cursor-pointer"
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          pen: { ...(prev.pen || {}), color: e.target.value },
                        }))
                      }
                      title={t('penColor')}
                    />
                  </div>
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>

          {/* Text tool */}
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={`annotation-tool-btn editor-pill-button rounded-[0.9rem] w-9 h-9 p-0 flex items-center justify-center cursor-pointer
                  ${activeAnnotTool === 'text' ? 'annotation-tool-btn--active' : ''}`}
                onClick={() => setActiveAnnotTool((prev) => (prev === 'text' ? null : 'text'))}
                aria-label={t('textTool')}
                aria-pressed={activeAnnotTool === 'text'}
              >
                <TextCursorInput className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>{t('textTool')}</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-white/10 mx-1" aria-hidden="true" />

          {/* Reset */}
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="annotation-tool-btn editor-pill-button rounded-[0.9rem] w-9 h-9 p-0 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={() => onReset?.()}
                disabled={!blob?.src}
                aria-label={t('resetCanvas')}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              {blob?.src ? t('resetCanvas') : t('noImageToReset')}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Bottom actions (Copy | Export | Feedback) */}
      <div
        data-tour="bottom-actions"
        data-editor-ui
        className={`${isNarrowLayout ? 'absolute' : 'fixed'} bottom-6 left-0 right-0 flex flex-row items-center justify-center gap-3 pointer-events-none`}
        style={{ zIndex: 20 }}
      >
        <button
          className="based-button-secondary editor-pill-button flex items-center px-4 py-2 pointer-events-auto transition-transform duration-150 hover:-translate-y-0.5"
          onClick={handleCopyClick}
          title={`Copy Image (⌘+C / Ctrl+C)`}
        >
          <span className="w-4 h-4 mr-2">
            {copied ? <Check className="w-4 h-4" /> : <ClipboardIcon />}
          </span>
          {copied ? t('copied') : t('copy')}
        </button>

        <div
          className="pointer-events-auto flex items-center overflow-hidden transition-transform duration-150 hover:-translate-y-0.5 accent-gradient btn-shimmer shimmer-loop-on-hover"
          style={{
            borderRadius: 9999,
            border: '1px solid var(--editor-pill-border)',
            boxShadow: 'var(--editor-pill-shadow)',
            color: 'var(--app-fg)',
          }}
        >
          <button
            type="button"
            className="flex items-center gap-3 px-5 py-2.5 text-white"
            style={{ background: 'transparent' }}
            onClick={onSave}
            title={`Save Image (⌘+S / Ctrl+S)`}
          >
            <span className="w-4 h-4"><SaveIcon /></span>
            <span className="flex items-baseline gap-2">
              <span className="text-[15px] font-semibold">{t('export')}</span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.85)' }}>{exportMetaLabel}</span>
            </span>
          </button>

          <div className="w-px self-stretch" style={{ background: 'rgba(255,255,255,0.25)' }} aria-hidden="true" />

          <button
            type="button"
            className="flex items-center justify-center px-4 py-2.5"
            style={{ background: 'transparent' }}
            onClick={onOpenExportSettings}
            aria-label={t('exportSettings')}
            title={t('exportSettings')}
          >
            <SlidersHorizontal className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.85)' }} />
          </button>
        </div>

        <button
          className="based-button-secondary editor-pill-button flex items-center px-4 py-2 pointer-events-auto transition-transform duration-150 hover:-translate-y-0.5"
          onClick={onFeedback}
          title={t('sendFeedback')}
        >
          <span className="w-4 h-4 mr-2"><FeedbackIcon /></span>
          {t('feedback')}
        </button>
      </div>

      {/* Toast (success/error/loading) */}
      {copyToast?.message && (
        <div
          data-editor-ui
          className={`${isNarrowLayout ? 'absolute' : 'fixed'} left-0 right-0 flex items-center justify-center pointer-events-none`}
          style={{ zIndex: 25, bottom: isNarrowLayout ? 92 : 92 }}
        >
          <div
            className="px-4 py-2 rounded-2xl"
            style={{
              background: 'var(--editor-pill-bg)',
              border: '1px solid var(--editor-pill-border)',
              boxShadow: 'var(--editor-pill-shadow)',
              color: 'var(--app-fg)',
              maxWidth: 560,
            }}
          >
            <div className="flex items-center gap-2">
              {copyToast.kind === 'loading' && (
                <span
                  className="inline-block w-4 h-4 rounded-full animate-spin"
                  style={{
                    border: '2px solid rgba(255,255,255,0.18)',
                    borderTopColor: 'rgba(255,255,255,0.75)',
                  }}
                  aria-hidden="true"
                />
              )}
              <div className="text-sm" style={{ opacity: copyToast.kind === 'error' ? 0.95 : 0.85 }}>
                {copyToast.message}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

