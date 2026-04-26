// Utility functions and pure helper components extracted from App.jsx
import React, { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { isProbablyHexColor, normalizeHexColorInput } from './utils/color/colorInput.js'
import { clamp } from '@/utils/core/math'

export const canvasAngleDegToCssAngleDeg = (angleDeg) => {
  const a = Number(angleDeg) || 0
  // Canvas uses 0° = +X (right), 90° = +Y (down).
  // CSS linear-gradient uses 0° = up, 90° = right.
  // Convert so previews match the actual canvas-rendered background.
  const css = a + 90
  return ((css % 360) + 360) % 360
}

export const blobCanvasBlendToCssBackgroundBlendMode = (config) => {
  const cfg = config && typeof config === 'object' ? config : {}
  const raw = String(cfg.blend || '').trim().toLowerCase()
  if (raw === 'source-over' || raw === 'normal') return 'normal'
  if (raw === 'lighter') return 'screen'
  if (raw === 'lighten') return 'lighten'
  if (raw === 'darken') return 'darken'
  if (raw === 'multiply') return 'multiply'
  if (raw === 'screen') return 'screen'
  if (raw === 'overlay') return 'overlay'
  if (raw === 'soft-light') return 'soft-light'
  if (raw === 'hard-light') return 'hard-light'
  if (raw === 'difference') return 'difference'
  if (raw === 'exclusion') return 'exclusion'

  const baseMode = String(cfg.baseMode || cfg.base || 'dark').toLowerCase()
  return baseMode === 'light' ? 'multiply' : 'screen'
}

export const formatExportErrorMessage = (action, error) => {
  const msg = String(error?.message || error || '').trim()
  const isDesktopRuntime =
    (typeof window !== 'undefined') &&
    !!(window?.__SITESHOT_TAURI__ || window?.__TAURI_INTERNALS__ || window?.__TAURI__ || window?.tauriAPI || window?.electronAPI)

  if (!isDesktopRuntime && /insecure|secure context/i.test(msg)) {
    return `${action} is blocked in this browser context. Use the desktop app (recommended) or run over HTTPS.`
  }
  if (!msg) return `${action} failed`
  return `${action} failed: ${msg}`
}

export const getDesktopApi = () => {
  if (typeof window === 'undefined') return null
  return window?.tauriAPI || window?.electronAPI || null
}

export const getNativeInvoke = () => {
  if (typeof window === 'undefined') return null
  return (
    window?.tauriAPI?.core?.invoke ||
    window?.__TAURI__?.core?.invoke ||
    window?.__TAURI_INTERNALS__?.core?.invoke ||
    null
  )
}

export const RANDOM_DEFAULT_GRADIENTS = [
  { colorStart: '#4F46E5', colorEnd: '#0EA5E9', angleDeg: 135 },
  { colorStart: '#7C3AED', colorEnd: '#EC4899', angleDeg: 128 },
  { colorStart: '#2563EB', colorEnd: '#14B8A6', angleDeg: 140 },
  { colorStart: '#DC2626', colorEnd: '#F59E0B', angleDeg: 122 },
  { colorStart: '#0F766E', colorEnd: '#6366F1', angleDeg: 132 },
]

export const makeRandomDefaultBackgroundSelection = () => {
  const idx = Math.floor(Math.random() * RANDOM_DEFAULT_GRADIENTS.length)
  const g = RANDOM_DEFAULT_GRADIENTS[idx] || RANDOM_DEFAULT_GRADIENTS[0]
  return {
    type: 'gradient',
    gradient: { ...g },
    gradientPresetId: null,
    blobGradient: null,
    color: null,
    wallpaper: null,
  }
}

export function CircleOneIcon({ size = 16 }) {
  return (
    <div
      aria-hidden
      className="flex items-center justify-center rounded-full bg-white text-black font-semibold"
      style={{ width: size, height: size, minWidth: size, minHeight: size, fontSize: Math.max(9, Math.round(size * 0.55)), lineHeight: 1 }}
    >
      1
    </div>
  )
}

/* ── Aspect Ratio Dropdown ────────────────────────────────── */

export const RATIO_OPTIONS = [
  { value: 'auto',             label: 'Auto (match image)', w: 0,  h: 0  },
  { value: 'aspect-square',    label: '1 : 1',              w: 1,  h: 1  },
  { value: 'aspect-video',     label: '16 : 9',             w: 16, h: 9  },
  { value: 'aspect-[4/3]',     label: '4 : 3',              w: 4,  h: 3  },
  { value: 'aspect-[3/2]',     label: '3 : 2',              w: 3,  h: 2  },
  { value: 'aspect-[9/16]',    label: '9 : 16',             w: 9,  h: 16 },
  { value: 'aspect-[4/5]',     label: '4 : 5',              w: 4,  h: 5  },
  { value: 'aspect-[2/3]',     label: '2 : 3',              w: 2,  h: 3  },
  { value: 'custom',           label: 'Custom…',            w: 0,  h: 0  },
  { value: 'aspect-[1200/627]', label: 'LinkedIn Post (1200×627)', w: 1200, h: 627 },
  { value: 'aspect-[1200/630]', label: 'Facebook Link (1200×630)', w: 1200, h: 630 },
  { value: 'aspect-[3/1]',     label: 'X Header (1500×500)', w: 3,  h: 1  },
  { value: 'aspect-[1600/900]', label: 'Twitter Post Landscape (1600×900)', w: 1600, h: 900 },
  { value: 'aspect-[1080/1350-twitter]', label: 'Twitter Post Portrait (1080×1350)', w: 1080, h: 1350 },
  { value: 'aspect-[1080/1920]', label: 'Instagram Story (1080×1920)', w: 1080, h: 1920 },
  { value: 'aspect-[1080/1350-instagram]', label: 'Instagram Portrait (1080×1350)', w: 1080, h: 1350 },
]

const PREVIEW_MAX_W = 22
const PREVIEW_MAX_H = 14

export const DEFAULT_GENERAL_SETTINGS = Object.freeze({
  hideAppWhenUnfocused: true,
  keepAppInTray: true,
  hideWindowOnLaunch: false,
  openAtLogin: false,
  hideDockIconWhenHidden: false,
  closeAfterCopy: false,
  closeAfterSave: false,
  closeAfterSaveToFolder: false,
  closeAfterDrag: false,
})

export const sanitizeCustomShadowState = (input) => {
  const src = input && typeof input === 'object' ? input : {}
  const numOr = (v, fallback) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
  }
  return {
    offsetX: clamp(numOr(src.offsetX, 0), -200, 200),
    offsetY: clamp(numOr(src.offsetY, 10), -200, 300),
    blur: clamp(numOr(src.blur, 30), 0, 400),
    spread: clamp(numOr(src.spread, -4), -200, 200),
    color: isProbablyHexColor(src.color) ? normalizeHexColorInput(src.color) : '#000000',
    opacity: clamp(numOr(src.opacity, 0.2), 0, 1),
  }
}

export function RatioPreviewRect({ w, h, isAuto, isCustom }) {
  if (isAuto || isCustom) {
    return (
      <span
        className="inline-block rounded-[2px] flex-shrink-0"
        style={{
          width: PREVIEW_MAX_H,
          height: PREVIEW_MAX_H,
          border: isAuto ? '1.5px dashed rgba(255,255,255,0.35)' : '1.5px dotted rgba(255,255,255,0.35)',
        }}
      />
    )
  }
  const aspect = w / h
  const containerAspect = PREVIEW_MAX_W / PREVIEW_MAX_H
  let boxW, boxH
  if (aspect >= containerAspect) {
    boxW = PREVIEW_MAX_W
    boxH = PREVIEW_MAX_W / aspect
  } else {
    boxH = PREVIEW_MAX_H
    boxW = PREVIEW_MAX_H * aspect
  }
  return (
    <span
      className="inline-block rounded-[2px] bg-white/30 flex-shrink-0"
      style={{ width: Math.round(boxW * 10) / 10, height: Math.round(boxH * 10) / 10 }}
    />
  )
}

export function AspectRatioDropdown({ ratioChoice, setRatioChoice }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const menuRef = useRef(null)
  const [menuAnchor, setMenuAnchor] = useState({
    top: 0,
    left: 0,
    minWidth: 180,
    maxHeight: 320,
    openUp: true,
  })

  const recalcMenuAnchor = useCallback(() => {
    if (!wrapRef.current) return
    const rect = wrapRef.current.getBoundingClientRect()
    const minWidth = Math.max(180, Math.round(rect.width))
    const viewportW = window.innerWidth || 0
    const viewportH = window.innerHeight || 0
    const margin = 8
    const gap = 6
    const estimatedMenuH = 380
    const spaceAbove = Math.max(0, rect.top - margin)
    const spaceBelow = Math.max(0, viewportH - rect.bottom - margin)
    const openUp = spaceAbove > spaceBelow && spaceAbove >= 160

    const rawLeft = Math.round(rect.right - minWidth)
    const left = Math.max(margin, Math.min(rawLeft, Math.max(margin, viewportW - margin - minWidth)))
    const top = openUp
      ? Math.round(rect.top - gap - Math.min(estimatedMenuH, Math.max(140, spaceAbove)))
      : Math.round(rect.bottom + gap)

    const maxHeight = Math.max(
      140,
      Math.floor((openUp ? spaceAbove : spaceBelow) - gap)
    )

    setMenuAnchor({
      top,
      left,
      minWidth,
      maxHeight,
      openUp,
    })
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      const inTrigger = !!(wrapRef.current && wrapRef.current.contains(e.target))
      const inMenu = !!(menuRef.current && menuRef.current.contains(e.target))
      if (!inTrigger && !inMenu) setOpen(false)
    }
    recalcMenuAnchor()
    document.addEventListener('pointerdown', handler, true)
    window.addEventListener('resize', recalcMenuAnchor)
    window.addEventListener('scroll', recalcMenuAnchor, true)
    return () => {
      document.removeEventListener('pointerdown', handler, true)
      window.removeEventListener('resize', recalcMenuAnchor)
      window.removeEventListener('scroll', recalcMenuAnchor, true)
    }
  }, [open, recalcMenuAnchor])

  const selected = RATIO_OPTIONS.find((o) => o.value === ratioChoice) || RATIO_OPTIONS[0]

  return (
    <div className="flex justify-between items-center mt-5">
      <div className="text-xs font-inter font-light text-white">Ratio:</div>
      <div className="relative z-[120]" ref={wrapRef}>
        {/* trigger button */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 bg-[#2C2C2C] hover:bg-[#353535] rounded-[4.5px] text-xs font-inter font-light text-white pl-2 pr-1.5 py-1 transition-colors cursor-pointer select-none"
        >
          <RatioPreviewRect
            w={selected.w}
            h={selected.h}
            isAuto={selected.value === 'auto'}
            isCustom={selected.value === 'custom'}
          />
          <span className="whitespace-nowrap">{selected.label}</span>
          <ChevronDown
            size={14}
            className={`text-white/60 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {/* dropdown popover */}
        {typeof document !== 'undefined' && createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, y: menuAnchor.openUp ? 4 : -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: menuAnchor.openUp ? 4 : -4 }}
                transition={{ duration: 0.12 }}
                className="fixed z-[210000] bg-[#252525] border border-white/10 rounded-lg shadow-xl py-1"
                style={{
                  top: menuAnchor.top,
                  left: menuAnchor.left,
                  minWidth: menuAnchor.minWidth,
                  maxWidth: 'min(90vw, 32rem)',
                  maxHeight: menuAnchor.maxHeight,
                  overflowY: 'auto',
                }}
              >
                {RATIO_OPTIONS.map((opt) => {
                  const active = ratioChoice === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setRatioChoice(opt.value)
                        setOpen(false)
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-[6px] text-xs font-inter font-light transition-colors cursor-pointer ${
                        active
                          ? 'bg-purple-600/30 text-white'
                          : 'text-white/80 hover:bg-white/[0.07]'
                      }`}
                    >
                      <RatioPreviewRect
                        w={opt.w}
                        h={opt.h}
                        isAuto={opt.value === 'auto'}
                        isCustom={opt.value === 'custom'}
                      />
                      <span className="whitespace-nowrap">{opt.label}</span>
                    </button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
      </div>
    </div>
  )
}

/* ── End Aspect Ratio Dropdown ─────────────────────────── */


