import React from 'react'
import { useAppContext } from './AppContext'
import { canvasAngleDegToCssAngleDeg } from './AppHelpers'

const COLOR_SWATCHES = [
  { name: 'Charcoal', hex: '#111827' },
  { name: 'Slate', hex: '#334155' },
  { name: 'Ice', hex: '#E5E7EB' },
  { name: 'Rose', hex: '#FB7185' },
  { name: 'Peach', hex: '#FDBA74' },
  { name: 'Honey', hex: '#FBBF24' },
  { name: 'Lime', hex: '#A3E635' },
  { name: 'Mint', hex: '#34D399' },
  { name: 'Aqua', hex: '#22D3EE' },
  { name: 'Sky', hex: '#60A5FA' },
  { name: 'Violet', hex: '#A78BFA' },
  { name: 'Fuchsia', hex: '#F472B6' },
  { name: 'Indigo', hex: '#4F46E5' },
]

export default function WallpaperGrid() {
  const {
    wallpaperType,
    currentWallpaperTileCount,
    backgroundSelection,
    setBackgroundSelection,
    defaultBackgroundSelection,
    algorithmGradients,
    autoGradients,
    setSelectedSystemWallpaper,
  } = useAppContext()

  const colorPickerHex = (() => {
    const hex = String(backgroundSelection?.color?.hex || '').trim()
    return (backgroundSelection?.type === 'color' && hex) ? hex : '#307b52'
  })()

  return (
    <div className="grid grid-cols-7 gap-[5px] mt-[6px]">
      {Array.from({ length: currentWallpaperTileCount }, (_, i) => {
        const pickItem = () => {
          if (wallpaperType === 'gradients') return algorithmGradients[i] || null
          if (wallpaperType === 'image') return autoGradients[i] || null
          if (wallpaperType === 'colors') {
            if (i < COLOR_SWATCHES.length) return COLOR_SWATCHES[i] || null
            if (i === COLOR_SWATCHES.length) return { kind: 'colorPicker', name: 'Custom', hex: colorPickerHex }
            return null
          }
          return null
        }

        const item = pickItem()
        const url = item?.thumbUrl || null

        const cssPreview = (() => {
          if (!item) return null
          if (item?.previewCss) return item.previewCss
          if (item?.kind === 'gradient' && item?.config?.colorStart && item?.config?.colorEnd) {
            const a = canvasAngleDegToCssAngleDeg(item?.config?.angleDeg)
            return `linear-gradient(${a}deg, ${item.config.colorStart}, ${item.config.colorEnd})`
          }
          return null
        })()

        const isSelected = (() => {
          const sel = backgroundSelection || {}
          if (!item) return false
          if (wallpaperType === 'colors') {
            const a = String(sel?.color?.hex || '').toLowerCase()
            if (!a) return false
            if (item?.kind === 'colorPicker') {
              return sel.type === 'color' && !COLOR_SWATCHES.some((s) => String(s?.hex || '').toLowerCase() === a)
            }
            return sel.type === 'color' && String(item?.hex || '').toLowerCase() === a
          }
          if (wallpaperType === 'gradients') {
            const c = item?.config || null
            if (!c) return false
            if (item?.kind === 'blobGradient') {
              return sel.type === 'blobGradient' &&
                Number.isFinite(Number(sel?.blobGradient?.seed)) &&
                Number(sel.blobGradient.seed) === Number(c?.seed)
            }
            return sel.type === 'gradient' && !!sel.gradientPresetId && sel.gradientPresetId === item?.id
          }
          if (wallpaperType === 'image') {
            const c = item?.config || null
            if (!c) return false
            if (item?.kind === 'blobGradient') {
              return sel.type === 'blobGradient' &&
                Number.isFinite(Number(sel?.blobGradient?.seed)) &&
                Number(sel.blobGradient.seed) === Number(c?.seed)
            }
            const g = sel?.gradient || null
            if (sel.type !== 'gradient' || !g) return false
            return (
              String(g.colorStart || '').toLowerCase() === String(c.colorStart || '').toLowerCase() &&
              String(g.colorEnd || '').toLowerCase() === String(c.colorEnd || '').toLowerCase() &&
              Number(g.angleDeg || 0) === Number(c.angleDeg || 0)
            )
          }
          return false
        })()

        const handleClick = () => {
          if (!item) {
            try { console.warn('[ui-exp] clicked empty background slot', { tab: wallpaperType, index: i }) } catch {}
            return
          }
          if (wallpaperType === 'colors' && item?.kind === 'colorPicker') return

          setSelectedSystemWallpaper(null)

          if ((wallpaperType === 'gradients' || wallpaperType === 'image') && item?.config) {
            if (item?.kind === 'blobGradient') {
              const activeSeed = Number(backgroundSelection?.blobGradient?.seed)
              const nextSeed = Number(item?.config?.seed)
              if (backgroundSelection?.type === 'blobGradient' && Number.isFinite(activeSeed) && Number.isFinite(nextSeed) && activeSeed === nextSeed) {
                setBackgroundSelection(defaultBackgroundSelection)
                return
              }
              setBackgroundSelection({ type: 'blobGradient', blobGradient: { ...item.config }, wallpaper: null, gradient: null, color: null })
              return
            }
            if (wallpaperType === 'gradients') {
              const same = backgroundSelection?.type === 'gradient' && backgroundSelection?.gradientPresetId === item?.id
              if (same) { setBackgroundSelection(defaultBackgroundSelection); return }
              setBackgroundSelection({ type: 'gradient', gradient: { ...item.config }, gradientPresetId: item?.id || null, blobGradient: null, wallpaper: null, color: null })
              return
            }
            // image tab
            const active = backgroundSelection?.gradient
            const next = item.config
            const same = backgroundSelection?.type === 'gradient' && active &&
              String(active.colorStart || '').toLowerCase() === String(next.colorStart || '').toLowerCase() &&
              String(active.colorEnd || '').toLowerCase() === String(next.colorEnd || '').toLowerCase() &&
              Number(active.angleDeg || 0) === Number(next.angleDeg || 0)
            if (same) { setBackgroundSelection(defaultBackgroundSelection); return }
            setBackgroundSelection({ type: 'gradient', gradient: { ...item.config }, gradientPresetId: null, blobGradient: null, wallpaper: null, color: null })
            return
          }

          if (wallpaperType === 'colors' && item?.hex) {
            const a = String(backgroundSelection?.color?.hex || '').toLowerCase()
            const b = String(item.hex || '').toLowerCase()
            if (backgroundSelection?.type === 'color' && a && b && a === b) {
              setBackgroundSelection(defaultBackgroundSelection)
              return
            }
            setBackgroundSelection({ type: 'color', color: { hex: item.hex }, wallpaper: null, gradient: null, blobGradient: null })
          }
        }

        return (
          <div
            key={`${wallpaperType}-${i}`}
            className={
              'siteshot-preview-tile w-[25px] h-[25px] rounded-[7px] border border-white/10 bg-[#2C2C2C] relative' +
              (item ? ' cursor-pointer' : '') +
              (isSelected ? ' ring-2 ring-[#307b52]' : '')
            }
            title={item?.name || undefined}
            style={(() => {
              if (url) return { backgroundImage: `url("${url}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
              if (cssPreview) return { backgroundImage: cssPreview, backgroundSize: 'cover', backgroundPosition: 'center' }
              if (wallpaperType === 'colors' && item?.hex) {
                if (item?.kind === 'colorPicker') return { backgroundImage: 'conic-gradient(from 210deg, #ff0080, #307b52, #00e0ff, #34d399, #fbbf24, #ff0080)' }
                return { backgroundColor: item.hex }
              }
              return undefined
            })()}
            onClick={handleClick}
          >
            {wallpaperType === 'colors' && item?.kind === 'colorPicker' && (
              <>
                <div className="absolute inset-0 flex items-center justify-center text-white/85 text-[12px] font-semibold pointer-events-none">
                  +
                </div>
                <input
                  type="color"
                  aria-label="Custom color"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  value={String(colorPickerHex || '#307b52')}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation()
                    const hex = String(e.target.value || '').trim()
                    if (!hex) return
                    setSelectedSystemWallpaper(null)
                    setBackgroundSelection({ type: 'color', color: { hex }, wallpaper: null, gradient: null, blobGradient: null })
                  }}
                />
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}


