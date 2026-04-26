import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { clampTransformToContainer } from '../utils/core/dragBounds'

/**
 * Manages layout measurements, bar positioning, fit scale, and related effects.
 */
export function useLayoutEffects({
  fitViewportRef,
  wrapperRef,
  exportRef,
  blobSrc,
  ratioChoice,
  customRatioW,
  customRatioH,
  setTransform,
  setDraggingPadding,
  setDraggingInset,
  setDraggingCurve,
  setDraggingBorder,
  setDraggingTiltX,
  setDraggingTiltY,
  setDraggingRotation,
}) {
  const annotationBarRef = useRef(null)
  const footerBarRef = useRef(null)
  const sidebarScrollRef = useRef(null)

  const [annotationBarLeft, setAnnotationBarLeft] = useState(16 + 270 + 32)
  const [footerBarLeft, setFooterBarLeft] = useState(16 + 270 + 32)
  const [fitScale, setFitScale] = useState(1)
  const [wrapperSize, setWrapperSize] = useState({ width: 0, height: 0 })
  const [layoutMetrics, setLayoutMetrics] = useState({ cardWidth: 0, cardHeight: 0 })
  const [safeInsets, setSafeInsets] = useState({ top: 0, bottom: 0 })
  const [sidebarIsScrolling, setSidebarIsScrolling] = useState(false)

  const previewContentMargin = 24

  const measureFitScale = useCallback(() => {
    const viewport = fitViewportRef.current
    const exportEl = exportRef.current
    if (!viewport || !exportEl) {
      setFitScale(1)
      return
    }
    const availW = Math.max(1, viewport.clientWidth)
    const availH = Math.max(1, viewport.clientHeight)
    const contentW = Math.max(1, exportEl.offsetWidth || 1)
    const contentH = Math.max(1, exportEl.offsetHeight || 1)
    const nextRaw = Math.min(1, availW / contentW, availH / contentH)
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1
    const step = 1 / Math.max(8, Math.round(dpr * 16))
    const next = Math.max(step, Math.floor(nextRaw / step) * step)
    setFitScale((prev) => (Math.abs(prev - next) < 0.001 ? prev : next))
  }, [fitViewportRef, exportRef])

  // Fit scale: re-measure when viewport or content resizes
  useEffect(() => {
    const viewport = fitViewportRef.current
    if (!viewport) return
    let raf = 0

    const schedule = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(measureFitScale)
    }

    const roViewport = new ResizeObserver(schedule)
    roViewport.observe(viewport)

    let roExport
    if (exportRef.current) {
      roExport = new ResizeObserver(schedule)
      roExport.observe(exportRef.current)
    }

    schedule()
    return () => {
      cancelAnimationFrame(raf)
      try { roViewport.disconnect() } catch {}
      try { roExport && roExport.disconnect() } catch {}
    }
  }, [blobSrc, ratioChoice, customRatioW, customRatioH, measureFitScale, fitViewportRef, exportRef])

  // Annotation bar and footer bar horizontal positioning
  useLayoutEffect(() => {
    const sidebarLeft = 16
    const sidebarWidth = 270
    const sidebarGap = 32
    const viewportRightPadding = 16

    const getPreviewCenterX = () => {
      const r = wrapperRef.current?.getBoundingClientRect?.()
      if (!r) return window.innerWidth / 2
      return r.left + r.width / 2
    }

    const updateAnnotationBarPosition = () => {
      const bar = annotationBarRef.current
      if (!bar) return
      const barWidth = bar.offsetWidth
      const minLeft = sidebarLeft + sidebarWidth + sidebarGap
      const maxLeft = window.innerWidth - viewportRightPadding - barWidth
      const centeredLeft = getPreviewCenterX() - barWidth / 2
      const safeMaxLeft = Math.max(0, maxLeft)
      const nextLeft = safeMaxLeft < minLeft
        ? safeMaxLeft
        : Math.max(minLeft, Math.min(centeredLeft, safeMaxLeft))
      setAnnotationBarLeft(nextLeft)
    }

    const updateFooterBarPosition = () => {
      const bar = footerBarRef.current
      if (!bar) return
      const barWidth = bar.offsetWidth
      const minLeft = sidebarLeft + sidebarWidth + sidebarGap
      const maxRightBasedOnViewport = window.innerWidth - viewportRightPadding
      const maxLeft = maxRightBasedOnViewport - barWidth
      const centeredLeft = getPreviewCenterX() - barWidth / 2
      const safeMaxLeft = Math.max(0, maxLeft)
      const nextLeft = safeMaxLeft < minLeft
        ? safeMaxLeft
        : Math.max(minLeft, Math.min(centeredLeft, safeMaxLeft))
      setFooterBarLeft(nextLeft)
    }

    updateAnnotationBarPosition()
    updateFooterBarPosition()

    const resizeObserver = new ResizeObserver(() => {
      updateAnnotationBarPosition()
      updateFooterBarPosition()
    })
    if (annotationBarRef.current) resizeObserver.observe(annotationBarRef.current)
    if (footerBarRef.current) resizeObserver.observe(footerBarRef.current)
    if (wrapperRef.current) resizeObserver.observe(wrapperRef.current)

    const onResize = () => {
      updateAnnotationBarPosition()
      updateFooterBarPosition()
    }
    window.addEventListener('resize', onResize)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [wrapperRef])

  // Sidebar scrolling indicator
  useEffect(() => {
    const el = sidebarScrollRef.current
    if (!el) return

    let timeout = 0
    const onScroll = () => {
      setSidebarIsScrolling(true)
      window.clearTimeout(timeout)
      timeout = window.setTimeout(() => setSidebarIsScrolling(false), 650)
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      window.clearTimeout(timeout)
    }
  }, [])

  // Safe insets: vertical space taken by annotation bar + footer bar
  useLayoutEffect(() => {
    const updateInsets = () => {
      const annotationRect = annotationBarRef.current?.getBoundingClientRect?.()
      const footerRect = footerBarRef.current?.getBoundingClientRect?.()
      if (!annotationRect || !footerRect) return

      const safeGap = 24
      const topInset = Math.max(0, annotationRect.bottom + safeGap)
      const bottomInset = Math.max(0, (window.innerHeight - footerRect.top) + safeGap)

      setSafeInsets((prev) => {
        if (prev.top === topInset && prev.bottom === bottomInset) return prev
        return { top: topInset, bottom: bottomInset }
      })
    }

    updateInsets()
    window.addEventListener('resize', updateInsets)

    const ro = new ResizeObserver(updateInsets)
    if (annotationBarRef.current) ro.observe(annotationBarRef.current)
    if (footerBarRef.current) ro.observe(footerBarRef.current)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateInsets)
    }
  }, [])

  // Wrapper size measurement
  useLayoutEffect(() => {
    const el = wrapperRef.current
    if (!el) return

    const update = () => {
      const r = el.getBoundingClientRect()
      setWrapperSize((prev) => {
        const next = { width: Math.round(r.width), height: Math.round(r.height) }
        if (prev.width === next.width && prev.height === next.height) return prev
        return next
      })
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [blobSrc, wrapperRef])

  // handleTransformChange: clamp image position to container bounds
  const handleTransformChange = useCallback((next) => {
    const clamped = clampTransformToContainer(
      { x: next?.x, y: next?.y },
      {
        containerWidth: wrapperSize.width,
        containerHeight: wrapperSize.height,
        cardWidth: layoutMetrics.cardWidth,
        cardHeight: layoutMetrics.cardHeight,
        overflowX: Math.max(0, Number(layoutMetrics.cardWidth) || 0),
        overflowY: Math.max(0, Number(layoutMetrics.cardHeight) || 0),
      }
    )
    setTransform(clamped)
  }, [layoutMetrics.cardHeight, layoutMetrics.cardWidth, wrapperSize.height, wrapperSize.width, setTransform])

  // Re-clamp transform when container size changes
  useEffect(() => {
    setTransform((prev) => clampTransformToContainer(
      prev,
      {
        containerWidth: wrapperSize.width,
        containerHeight: wrapperSize.height,
        cardWidth: layoutMetrics.cardWidth,
        cardHeight: layoutMetrics.cardHeight,
        overflowX: Math.max(0, Number(layoutMetrics.cardWidth) || 0),
        overflowY: Math.max(0, Number(layoutMetrics.cardHeight) || 0),
      }
    ))
  }, [layoutMetrics.cardHeight, layoutMetrics.cardWidth, wrapperSize.height, wrapperSize.width, setTransform])

  // Global pointer-up handler to stop dragging sliders
  useEffect(() => {
    const handlePointerEnd = () => {
      setDraggingPadding(false)
      setDraggingInset(false)
      setDraggingCurve(false)
      setDraggingBorder(false)
      setDraggingTiltX(false)
      setDraggingTiltY(false)
      setDraggingRotation(false)
    }

    document.addEventListener('mouseup', handlePointerEnd)
    document.addEventListener('pointerup', handlePointerEnd)
    document.addEventListener('touchend', handlePointerEnd)
    document.addEventListener('pointercancel', handlePointerEnd)
    return () => {
      document.removeEventListener('mouseup', handlePointerEnd)
      document.removeEventListener('pointerup', handlePointerEnd)
      document.removeEventListener('touchend', handlePointerEnd)
      document.removeEventListener('pointercancel', handlePointerEnd)
    }
  }, [setDraggingPadding, setDraggingInset, setDraggingCurve, setDraggingBorder, setDraggingTiltX, setDraggingTiltY, setDraggingRotation])

  return {
    annotationBarRef,
    footerBarRef,
    sidebarScrollRef,
    annotationBarLeft,
    footerBarLeft,
    fitScale,
    wrapperSize,
    layoutMetrics,
    setLayoutMetrics,
    safeInsets,
    sidebarIsScrolling,
    setSidebarIsScrolling,
    handleTransformChange,
    previewContentMargin,
    measureFitScale,
  }
}
