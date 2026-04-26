import { useCallback, useEffect, useRef, useState } from 'react'
import { trimMacOsWindowScreenshotDataUrl } from '@/utils/export/imageProcessor'
import { copyImage as copyImageUtil, createExportableSnapshot, saveImageAdvanced, scaleAndEncodeBlob } from '@/utils/export/imageProcessor'
import { formatExportErrorMessage } from '../AppHelpers'

/**
 * Provides export functions and related state.
 */
export function useExportFunctions({
  blob,
  imageOptions,
  exportScale,
  exportFormat,
  exportQuality,
  exportRef,
  pushToast,
  setBlob,
  setTransform,
  setAnnotationTool,
  rootFocusRef,
}) {
  const [exportBusy, setExportBusy] = useState(false)
  const [exportDrawerOpen, setExportDrawerOpen] = useState(false)
  const exportDrawerRef = useRef(null)

  // Close export drawer on outside click
  useEffect(() => {
    if (!exportDrawerOpen) return
    const handler = (e) => {
      if (exportDrawerRef.current && !exportDrawerRef.current.contains(e.target)) {
        setExportDrawerOpen(false)
      }
    }
    document.addEventListener('pointerdown', handler, true)
    return () => document.removeEventListener('pointerdown', handler, true)
  }, [exportDrawerOpen])

  const buildDefaultExportFileName = useCallback(() => {
    const ts = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const stamp = `${ts.getFullYear()}-${pad(ts.getMonth() + 1)}-${pad(ts.getDate())}`
    const ext = exportFormat === 'jpeg' ? 'jpg' : exportFormat
    return `screenshot-${stamp}`
  }, [exportFormat])

  const waitForAnimationFrames = useCallback(async (count = 2) => {
    const frames = Math.max(1, Math.floor(Number(count) || 1))
    for (let index = 0; index < frames; index += 1) {
      await new Promise((resolve) => {
        requestAnimationFrame(() => resolve())
      })
    }
  }, [])

  const getExportElement = useCallback(() => exportRef?.current || null, [exportRef])

  const runWithFrozenPreview = useCallback(async (work) => {
    if (exportBusy) return
    setExportBusy(true)
    try {
      await waitForAnimationFrames(2)
      await work()
    } finally {
      window.setTimeout(() => {
        setExportBusy(false)
      }, 120)
    }
  }, [exportBusy, waitForAnimationFrames])

  const copyOutput = useCallback(async () => {
    await runWithFrozenPreview(async () => {
      try {
        if (!blob?.src) {
          pushToast('Nothing to copy yet', { variant: 'error' })
          return
        }
        const exportEl = getExportElement()
        if (!exportEl) {
          pushToast('Nothing to copy yet', { variant: 'error' })
          return
        }
        await copyImageUtil({ current: exportEl }, blob, imageOptions)
        pushToast('Copied to clipboard', { variant: 'success' })
      } catch (e) {
        pushToast(formatExportErrorMessage('Copy', e), { variant: 'error', durationMs: 4500 })
      }
    })
  }, [blob, imageOptions, pushToast, runWithFrozenPreview])

  const saveOutput = useCallback(async () => {
    await runWithFrozenPreview(async () => {
      try {
        if (!blob?.src) {
          pushToast('Nothing to save yet', { variant: 'error' })
          return
        }
        const exportEl = getExportElement()
        if (!exportEl) {
          pushToast('Nothing to save yet', { variant: 'error' })
          return
        }
        const fileName = buildDefaultExportFileName()
        await saveImageAdvanced({ current: exportEl }, blob, {
          fileName,
          scale: exportScale,
          format: exportFormat,
          quality: exportQuality,
        }, imageOptions)
        pushToast(`Saved: ${fileName}`, { variant: 'success' })
      } catch (e) {
        pushToast(formatExportErrorMessage('Save', e), { variant: 'error', durationMs: 4500 })
      }
    })
  }, [blob, buildDefaultExportFileName, exportFormat, exportQuality, exportScale, imageOptions, pushToast, runWithFrozenPreview])

  const applyCapturedSource = useCallback(async (src, { shouldFocus = true } = {}) => {
    if (!src || typeof src !== 'string') return
    const cleaned = src.startsWith('data:image/')
      ? await trimMacOsWindowScreenshotDataUrl(src)
      : src

    setBlob({ src: cleaned, w: 0, h: 0 })
    setTransform({ x: 0, y: 0 })
    setAnnotationTool(null)

    try {
      const img = new Image()
      img.onload = () => {
        const w = Number(img.naturalWidth) || 0
        const h = Number(img.naturalHeight) || 0
        setBlob((prev) => (prev?.src === cleaned ? { ...prev, w, h } : prev))
      }
      img.src = cleaned
    } catch {}

    if (shouldFocus) {
      try { rootFocusRef.current?.focus?.({ preventScroll: true }) } catch {}
    }
  }, [rootFocusRef, setAnnotationTool, setBlob, setTransform])

  return {
    exportBusy,
    exportDrawerOpen,
    setExportDrawerOpen,
    exportDrawerRef,
    buildDefaultExportFileName,
    waitForAnimationFrames,
    getExportElement,
    runWithFrozenPreview,
    copyOutput,
    saveOutput,
    applyCapturedSource,
  }
}

