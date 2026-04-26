import { useEffect, useRef, useState } from 'react'
import { renderBackgroundToCanvas } from '@/utils/image/canvasBackgroundFx'
import { extractPaletteFromDataUrl } from '@/utils/color/colorPalette'
import { canvasAngleDegToCssAngleDeg } from '../AppHelpers'

/**
 * Manages algorithm-generated gradients and auto (palette-derived) gradients.
 * @param {{ blobSrc: string|null }} params
 */
export function useGradients({ blobSrc }) {
  const [algorithmGradients, setAlgorithmGradients] = useState([])
  const [algorithmGradientsVersion, setAlgorithmGradientsVersion] = useState(0)
  const [autoGradients, setAutoGradients] = useState([])
  const [autoGradientsVersion, setAutoGradientsVersion] = useState(0)
  const gradientThumbCacheRef = useRef(new Map())

  // ui-exp: curated gradients for the Gradient tab.
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const curated = [
          // Sky / happy themed (airy, less muddy)
          { name: 'Sky Lavender', colorStart: '#60A5FA', colorEnd: '#A78BFA', angleDeg: 135 },
          { name: 'Sunrise Sky', colorStart: '#FDBA74', colorEnd: '#60A5FA', angleDeg: 135 },
          { name: 'Cotton Candy', colorStart: '#FBCFE8', colorEnd: '#BFDBFE', angleDeg: 135 },
          { name: 'Mint Breeze', colorStart: '#A7F3D0', colorEnd: '#BAE6FD', angleDeg: 135 },
          { name: 'Horizon Glow', colorStart: '#38BDF8', colorEnd: '#FDE68A', angleDeg: 135 },
          { name: 'Blue Hour', colorStart: '#0EA5E9', colorEnd: '#6366F1', angleDeg: 135 },
          { name: 'Peach Cloud', colorStart: '#FED7AA', colorEnd: '#F5D0FE', angleDeg: 135 },
          { name: 'Seafoam', colorStart: '#5EEAD4', colorEnd: '#93C5FD', angleDeg: 135 },
          { name: 'Lemon Sky', colorStart: '#FDE68A', colorEnd: '#93C5FD', angleDeg: 135 },
          { name: 'Rose Mist', colorStart: '#FDA4AF', colorEnd: '#C7D2FE', angleDeg: 135 },
          { name: 'Aqua Bloom', colorStart: '#67E8F9', colorEnd: '#F9A8D4', angleDeg: 135 },
          { name: 'Spring Day', colorStart: '#86EFAC', colorEnd: '#93C5FD', angleDeg: 135 },
        ]

        const cssBlobPalettes = [
          {
            name: 'Blush Pop',
            base: 'hsla(0,100%,50%,1)',
            colors: [
              'hsla(28,100%,74%,1)',
              'hsla(189,100%,56%,1)',
              'hsla(355,100%,93%,1)',
              'hsla(340,100%,76%,1)',
              'hsla(22,100%,77%,1)',
              'hsla(242,100%,70%,1)',
              'hsla(343,100%,76%,1)',
            ],
          },
          {
            name: 'Pink Confetti',
            base: '#ff99bb',
            colors: [
              'hsla(295,85%,65%,1)',
              'hsla(30,70%,75%,1)',
              'hsla(76,94%,67%,1)',
              'hsla(276,74%,63%,1)',
              'hsla(169,75%,74%,1)',
              'hsla(226,93%,60%,1)',
              'hsla(28,87%,67%,1)',
            ],
          },
          {
            name: 'Aqua Sprinkle',
            base: '#99ecff',
            colors: [
              'hsla(200,71%,65%,1)',
              'hsla(350,60%,70%,1)',
              'hsla(308,94%,62%,1)',
              'hsla(154,90%,61%,1)',
              'hsla(331,62%,72%,1)',
              'hsla(125,87%,71%,1)',
              'hsla(336,62%,60%,1)',
            ],
          },
          {
            name: 'Periwinkle Haze',
            base: '#99a3ff',
            colors: [
              'hsla(250,77%,62%,1)',
              'hsla(321,60%,62%,1)',
              'hsla(140,82%,74%,1)',
              'hsla(254,90%,70%,1)',
              'hsla(18,60%,69%,1)',
              'hsla(330,61%,78%,1)',
              'hsla(226,63%,69%,1)',
            ],
          },
          {
            name: 'Icy Carnival',
            base: '#99f0ff',
            colors: [
              'hsla(1,93%,78%,1)',
              'hsla(0,35%,78%,1)',
              'hsla(57,76%,78%,1)',
              'hsla(301,77%,66%,1)',
              'hsla(338,65%,62%,1)',
              'hsla(23,76%,66%,1)',
              'hsla(342,64%,74%,1)',
            ],
          },
          {
            name: 'Lavender Pool',
            base: '#9c99ff',
            colors: [
              'hsla(238,99%,74%,1)',
              'hsla(187,94%,62%,1)',
              'hsla(209,89%,76%,1)',
              'hsla(337,98%,60%,1)',
              'hsla(116,80%,68%,1)',
              'hsla(3,72%,71%,1)',
              'hsla(336,60%,72%,1)',
            ],
          },
          {
            name: 'Candy Bloom',
            base: '#ff99ce',
            colors: [
              'hsla(176,87%,72%,1)',
              'hsla(171,89%,62%,1)',
              'hsla(172,91%,74%,1)',
              'hsla(237,85%,60%,1)',
              'hsla(240,98%,72%,1)',
              'hsla(157,99%,65%,1)',
              'hsla(218,91%,75%,1)',
            ],
          },
          {
            name: 'Sky Petals',
            base: '#99afff',
            colors: [
              'hsla(158,73%,66%,1)',
              'hsla(218,62%,64%,1)',
              'hsla(307,66%,65%,1)',
              'hsla(149,78%,61%,1)',
              'hsla(175,96%,77%,1)',
              'hsla(317,82%,72%,1)',
              'hsla(166,65%,74%,1)',
            ],
          },
          {
            name: 'Peach Smoothie',
            base: '#ffc799',
            colors: [
              'hsla(138,81%,71%,1)',
              'hsla(116,94%,73%,1)',
              'hsla(36,82%,64%,1)',
              'hsla(319,62%,69%,1)',
              'hsla(47,74%,72%,1)',
              'hsla(131,70%,64%,1)',
              'hsla(111,78%,73%,1)',
            ],
          },
          {
            name: 'Apricot Mist',
            base: '#ffbd99',
            colors: [
              'hsla(207,76%,65%,1)',
              'hsla(350,69%,69%,1)',
              'hsla(269,69%,78%,1)',
              'hsla(157,97%,76%,1)',
              'hsla(231,71%,63%,1)',
              'hsla(242,93%,74%,1)',
              'hsla(276,80%,78%,1)',
            ],
          },
          {
            name: 'Lime Soda',
            base: '#dfff99',
            colors: [
              'hsla(99,98%,62%,1)',
              'hsla(190,99%,68%,1)',
              'hsla(342,83%,78%,1)',
              'hsla(301,83%,62%,1)',
              'hsla(220,72%,72%,1)',
              'hsla(357,97%,78%,1)',
              'hsla(182,73%,65%,1)',
            ],
          },
        ]

        const customBlobPresets = [
          {
            id: 'blob:user-electric-sky',
            name: 'Electric Sky',
            kind: 'blobGradient',
            config: {
              baseMode: 'light',
              baseA: 'hsla(240,100%,59%,0.47)',
              baseB: 'hsla(240,100%,59%,0.47)',
              colors: [
                'hsla(198,71%,73%,1)',
                'hsla(283,100%,56%,1)',
                'hsla(300,100%,50%,1)',
                'hsla(189,100%,50%,1)',
                'hsla(266,100%,50%,1)',
              ],
              seed: 830001,
              blobCount: 9,
              intensity: 0.76,
              angleDeg: 135,
            },
          },
          {
            id: 'blob:user-neon-flamingo',
            name: 'Neon Flamingo',
            kind: 'blobGradient',
            config: {
              baseMode: 'light',
              baseA: 'hsla(324,100%,50%,1)',
              baseB: 'hsla(324,100%,50%,1)',
              colors: [
                'hsla(235,100%,79%,1)',
                'hsla(189,100%,56%,1)',
                'hsla(355,100%,93%,1)',
                'hsla(340,100%,50%,1)',
                'hsla(0,100%,70%,1)',
                'hsla(201,100%,67%,1)',
                'hsla(312,100%,50%,1)',
              ],
              seed: 830002,
              blobCount: 9,
              intensity: 0.76,
              angleDeg: 135,
            },
          },
          {
            id: 'blob:user-sunset-surge',
            name: 'Sunset Surge',
            kind: 'blobGradient',
            config: {
              baseMode: 'light',
              baseA: 'hsla(359,100%,68%,1)',
              baseB: 'hsla(359,100%,68%,1)',
              colors: [
                'hsla(202,90%,65%,1)',
                'hsla(300,100%,50%,1)',
                'hsla(172,100%,50%,1)',
                'hsla(239,100%,60%,1)',
                'hsla(360,100%,50%,1)',
                'hsla(275,85%,76%,1)',
                'hsla(238,67%,70%,1)',
              ],
              seed: 830003,
              blobCount: 9,
              intensity: 0.76,
              angleDeg: 135,
            },
          },
        ]

        const targetCount = 56 // 8 rows * 7 columns
        const angles = [45, 90, 120, 135, 160, 200, 225, 260, 300, 315]
        const linearGenerated = []
        const halfGeneratedCount = Math.floor((targetCount - curated.length) / 2)
        // Rebalance the set toward blob gradients:
        // +14 additional blob variants and -14 generated regular gradients.
        const linearTargetCount = Math.max(0, halfGeneratedCount - 14)
        for (let i = 0; linearGenerated.length < linearTargetCount; i += 1) {
          const h = (i * 37) % 360
          // Use comma-separated hsl() for older WKWebView/Safari compatibility.
          const a = `hsl(${h}, 90%, 60%)`
          const b = `hsl(${(h + 130 + (i % 3) * 25) % 360}, 90%, 48%)`
          linearGenerated.push({
            id: `lin:${i}`,
            name: `Gradient ${curated.length + linearGenerated.length + 1}`,
            kind: 'gradient',
            config: { colorStart: a, colorEnd: b, angleDeg: angles[i % angles.length] },
          })
        }

        const blobGenerated = []
        for (let i = 0; curated.length + linearGenerated.length + blobGenerated.length < targetCount; i += 1) {
          const p = cssBlobPalettes[i % cssBlobPalettes.length]
          const variant = Math.floor(i / cssBlobPalettes.length)
          blobGenerated.push({
            id: `blob:${(500001 + i * 9973) >>> 0}`,
            name: `${p.name}${variant ? ` ${variant + 1}` : ''}`,
            kind: 'blobGradient',
            config: {
              baseMode: 'light',
              baseA: p.base,
              baseB: p.base,
              colors: p.colors,
              seed: (500001 + i * 9973) >>> 0,
              blobCount: 9,
              intensity: 0.76,
              angleDeg: 135,
            },
          })
        }

        const defs = [
          ...curated.map((d) => ({
            id: `cur:${String(d.name || '').toLowerCase().replace(/\s+/g, '-')}`,
            name: d.name,
            kind: 'gradient',
            config: { colorStart: d.colorStart, colorEnd: d.colorEnd, angleDeg: d.angleDeg },
          })),
          ...customBlobPresets,
          ...linearGenerated,
          ...blobGenerated,
        ].slice(0, targetCount)

        const withPreview = defs.map((d) => {
          if (d.kind === 'gradient') {
            const a = canvasAngleDegToCssAngleDeg(d.config?.angleDeg)
            const s = d.config?.colorStart
            const e = d.config?.colorEnd
            const previewCss = (s && e) ? `linear-gradient(${a}deg, ${s}, ${e})` : null
            return { ...d, thumbUrl: null, previewCss }
          }

          if (d.kind === 'blobGradient') {
            const cfg = d.config || {}
            const baseMode = String(cfg.baseMode || cfg.base || 'dark')
            const baseA = String(cfg.baseA || cfg.baseColorA || (baseMode === 'light' ? '#ffffff' : '#05060A'))
            const baseB = String(cfg.baseB || cfg.baseColorB || (baseMode === 'light' ? '#f3f4f6' : '#111827'))
            const a = canvasAngleDegToCssAngleDeg(cfg.angleDeg)
            const previewCss = `linear-gradient(${a}deg, ${baseA}, ${baseB})`
            return { ...d, thumbUrl: null, previewCss }
          }

          return { ...d, thumbUrl: null, previewCss: null }
        })

        if (!cancelled) {
          setAlgorithmGradients(withPreview)
          setAlgorithmGradientsVersion((v) => v + 1)
        }
      } catch {
        if (!cancelled) setAlgorithmGradients([])
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  // ui-exp: rasterize gradient/blob thumbs using the same canvas renderer as ImageDisplay.
  useEffect(() => {
    let cancelled = false

    const makeKey = (kind, cfg) => {
      try { return `${kind}|${JSON.stringify(cfg || {})}` } catch { return `${kind}|${String(Date.now())}` }
    }

    const rasterize = async ({ kind, config }) => {
      const key = makeKey(kind, config)
      const cache = gradientThumbCacheRef.current
      if (cache.has(key)) return cache.get(key)

      const size = 64
      const canvas = document.createElement('canvas')
      const background = (kind === 'blobGradient')
        ? { type: 'blobGradient', config: config || {} }
        : {
            type: 'gradient',
            angleDeg: Number.isFinite(Number(config?.angleDeg)) ? Number(config.angleDeg) : 135,
            colorStart: String(config?.colorStart || 'transparent'),
            colorEnd: String(config?.colorEnd || 'transparent'),
          }

      await renderBackgroundToCanvas({
        outCanvas: canvas,
        widthCssPx: size,
        heightCssPx: size,
        renderScale: 2,
        background,
        blurPx: 0,
        brightness: 1,
        wallpaperImage: null,
      })

      const url = canvas.toDataURL('image/png')
      cache.set(key, url)
      if (cache.size > 200) {
        const firstKey = cache.keys().next().value
        if (firstKey != null) cache.delete(firstKey)
      }
      return url
    }

    const run = async () => {
      if (typeof document === 'undefined') return

      const updateList = async (list, setList) => {
        if (!Array.isArray(list) || !list.length) return
        const pendingIdx = list
          .map((it, idx) => ({ it, idx }))
          .filter(({ it }) => it && !it.thumbUrl && (it.kind === 'gradient' || it.kind === 'blobGradient') && it.config)
        if (!pendingIdx.length) return

        const next = list.slice()
        const batchSize = 6
        for (let i = 0; i < pendingIdx.length; i += batchSize) {
          if (cancelled) return
          const batch = pendingIdx.slice(i, i + batchSize)
          const results = await Promise.all(batch.map(async ({ it }) => {
            try {
              return await rasterize({ kind: it.kind, config: it.config })
            } catch {
              return null
            }
          }))
          batch.forEach(({ idx }, j) => {
            const url = results[j]
            if (!url) return
            next[idx] = { ...next[idx], thumbUrl: url }
          })
          if (!cancelled) setList(next.slice())
          await new Promise((r) => setTimeout(r, 0))
        }
      }

      await updateList(algorithmGradients, setAlgorithmGradients)
      await updateList(autoGradients, setAutoGradients)
    }

    run().catch(() => {})
    return () => { cancelled = true }
  }, [algorithmGradientsVersion, autoGradientsVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  // ui-exp: Auto tab blob gradients derived from current image palette.
  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const src = blobSrc
      if (!src) {
        if (!cancelled) setAutoGradients([])
        return
      }

      try {
        if (typeof document === 'undefined') return
        const palette = await extractPaletteFromDataUrl(src, { colorCount: 7, returnMeta: true })
        const colors = (Array.isArray(palette) ? palette : palette?.colors || []).filter(Boolean)

        const fallback = ['#8B5CF6', '#EC4899', '#22C55E', '#06B6D4', '#F59E0B', '#0EA5E9', '#A855F7']
        const base = (colors.length ? colors : fallback).slice(0, 7)

        const getRandomU32 = () => {
          try {
            if (typeof crypto !== 'undefined' && crypto?.getRandomValues) {
              const u = new Uint32Array(1)
              crypto.getRandomValues(u)
              return u[0] >>> 0
            }
          } catch {}
          return (Math.floor(Math.random() * 2 ** 32) >>> 0)
        }

        const mulberry32 = (a) => {
          let t = a >>> 0
          return () => {
            t += 0x6D2B79F5
            let x = Math.imul(t ^ (t >>> 15), 1 | t)
            x ^= x + Math.imul(x ^ (x >>> 7), 61 | x)
            return ((x ^ (x >>> 14)) >>> 0) / 4294967296
          }
        }

        const baseSeed = getRandomU32()
        const rand = mulberry32(baseSeed)

        const pickColors = (count = 8) => {
          const pool = base.length ? base : fallback
          const out = []
          for (let i = 0; i < count; i += 1) out.push(pool[Math.floor(rand() * pool.length)])
          return out
        }

        const defs = Array.from({ length: 14 }, (_v, i) => ({
          name: `Auto ${i + 1}`,
          kind: 'blobGradient',
          config: {
            baseMode: rand() < 0.55 ? 'dark' : 'light',
            colors: pickColors(8),
            seed: (baseSeed + i * 9973) >>> 0,
            blobCount: 6 + Math.floor(rand() * 5),
            intensity: 0.70 + rand() * 0.18,
            angleDeg: Math.floor(30 + rand() * 300),
          },
        }))

        const withPreview = defs.map((d) => {
          const cfg = d.config || {}
          const baseMode = String(cfg.baseMode || cfg.base || 'dark')
          const baseA = String(cfg.baseA || cfg.baseColorA || (baseMode === 'light' ? '#ffffff' : '#05060A'))
          const baseB = String(cfg.baseB || cfg.baseColorB || (baseMode === 'light' ? '#f3f4f6' : '#111827'))
          const a = canvasAngleDegToCssAngleDeg(cfg.angleDeg)
          const previewCss = `linear-gradient(${a}deg, ${baseA}, ${baseB})`
          return { ...d, thumbUrl: null, previewCss }
        })

        if (!cancelled) {
          setAutoGradients(withPreview)
          setAutoGradientsVersion((v) => v + 1)
        }
      } catch {
        if (!cancelled) setAutoGradients([])
      }
    }

    run()
    return () => { cancelled = true }
  }, [blobSrc])

  return {
    algorithmGradients,
    setAlgorithmGradients,
    algorithmGradientsVersion,
    setAlgorithmGradientsVersion,
    autoGradients,
    setAutoGradients,
    autoGradientsVersion,
    setAutoGradientsVersion,
  }
}

