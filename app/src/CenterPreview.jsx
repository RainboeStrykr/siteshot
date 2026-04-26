import React, { useCallback, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import ImageDisplay from './components/editor/ImageDisplay.jsx'
import { useAppContext } from './AppContext.jsx'
import { Button } from '@/components/ui/button'

const SCREENSHOTAPI_ENDPOINT = 'https://api.screenshotapi.com/take'
const API_KEY = import.meta.env.VITE_SCREENSHOTAPI_KEY

export default function CenterPreview() {
  const {
    fitViewportRef,
    fitScale,
    safeInsets,
    previewContentMargin,
    wrapperRef,
    exportRef,
    imageOptions,
    blob,
    annotationTool,
    shapeMode,
    setAnnotationTool,
    setLayoutMetrics,
    handleTransformChange,
    annotationActionsRef,
    applyCapturedSource,
    pushToast,
  } = useAppContext()

  const dropRef = useRef(null)

  // Tab: 'upload' | 'url'
  const [tab, setTab] = useState('upload')

  // URL capture state
  const [url, setUrl] = useState('')
  const [capturing, setCapturing] = useState(false)

  // ── File upload handlers ──────────────────────────────────────────────────

  const handleFiles = useCallback(async (files) => {
    const file = files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onerror = () => reject(new Error('Failed to read file'))
      r.onload = () => resolve(String(r.result || ''))
      r.readAsDataURL(file)
    })
    applyCapturedSource(dataUrl)
  }, [applyCapturedSource])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    dropRef.current?.removeAttribute('data-drag-over')
    handleFiles(e.dataTransfer?.files)
  }, [handleFiles])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    dropRef.current?.setAttribute('data-drag-over', '1')
  }, [])

  const handleDragLeave = useCallback((e) => {
    if (!dropRef.current?.contains(e.relatedTarget)) {
      dropRef.current?.removeAttribute('data-drag-over')
    }
  }, [])

  const handleInputChange = useCallback((e) => {
    handleFiles(e.target.files)
    try { e.target.value = '' } catch {}
  }, [handleFiles])

  // ── URL capture handler ───────────────────────────────────────────────────

  const normalizeUrl = (raw) => {
    const trimmed = raw.trim()
    if (!trimmed) return ''
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `https://${trimmed}`
  }

  const handleCapture = useCallback(async () => {
    const targetUrl = normalizeUrl(url)
    if (!targetUrl) {
      pushToast('Please enter a website URL', { variant: 'error' })
      return
    }

    setCapturing(true)
    try {
      const response = await fetch(SCREENSHOTAPI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: API_KEY,
          url: targetUrl,
          type: 'png',
          responseType: 'json',
          viewportWidth: 1280,
          viewportHeight: 720,
          blockPopups: true,
          blockCookieBanners: true,
        }),
      })

      if (!response.ok) {
        let detail = ''
        try { detail = await response.text() } catch { /* ignore */ }
        throw new Error(`API error ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`)
      }

      const json = await response.json()
      const remoteUrl = json.outputUrl || json.screenshot || json.url

      let dataUrl = null
      if (json.base64) {
        dataUrl = `data:image/png;base64,${json.base64}`
      } else if (remoteUrl) {
        let fetchUrl = remoteUrl
        try {
          const parsed = new URL(remoteUrl)
          if (parsed.hostname.includes('amazonaws.com')) {
            fetchUrl = `/api/s3-img${parsed.pathname}${parsed.search}`
          }
        } catch { /* use remoteUrl as-is */ }

        const imgResponse = await fetch(fetchUrl)
        if (!imgResponse.ok) throw new Error(`Failed to fetch screenshot image: ${imgResponse.status}`)
        const imgBlob = await imgResponse.blob()
        dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onerror = () => reject(new Error('Failed to read image'))
          reader.onload = () => resolve(String(reader.result || ''))
          reader.readAsDataURL(imgBlob)
        })
      } else {
        throw new Error(`Unexpected response shape: ${JSON.stringify(json).slice(0, 200)}`)
      }

      await applyCapturedSource(dataUrl)
      pushToast('Screenshot loaded', { variant: 'success' })
      setUrl('')
    } catch (err) {
      pushToast(`Screenshot failed: ${err?.message || String(err)}`, { variant: 'error', durationMs: 4500 })
    } finally {
      setCapturing(false)
    }
  }, [url, applyCapturedSource, pushToast])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      ref={fitViewportRef}
      className="absolute"
      style={{
        left: 16 + 270 + 32 + previewContentMargin,
        right: 16 + previewContentMargin,
        top: safeInsets.top,
        bottom: safeInsets.bottom,
        overflow: 'visible',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
      }}
    >
      <div
        style={{
          width: blob?.src ? 1000 : 'min(100%, 1240px)',
          maxWidth: '100%',
          position: 'relative',
        }}
      >
        {blob?.src ? (
          <div
            style={{
              transform: `translateZ(0) scale(${fitScale})`,
              transformOrigin: 'center center',
              willChange: 'transform',
            }}
          >
            <ImageDisplay
              key={blob.src}
              options={imageOptions}
              blob={blob}
              wrapperRef={wrapperRef}
              exportRef={exportRef}
              activeTool={annotationTool}
              shapeMode={shapeMode}
              onRequestDeselectTool={() => setAnnotationTool(null)}
              onLayoutMetrics={setLayoutMetrics}
              onTransformChange={handleTransformChange}
              annotationActionsRef={annotationActionsRef}
            />
          </div>
        ) : (
          <motion.div
            ref={(el) => { dropRef.current = el; if (wrapperRef) wrapperRef.current = el }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            onDrop={tab === 'upload' ? handleDrop : undefined}
            onDragOver={tab === 'upload' ? handleDragOver : undefined}
            onDragLeave={tab === 'upload' ? handleDragLeave : undefined}
            className="mx-auto w-full max-w-[1240px] rounded-[28px] border border-dashed border-white/20 bg-[#2C2C2C]/90 text-white shadow-[0_24px_64px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors [&[data-drag-over]]:border-[#7700FF] [&[data-drag-over]]:bg-[#7700FF]/10"
            style={{ cursor: 'default' }}
          >
            {/* Tab switcher */}
            <div className="flex gap-1 p-2 mx-auto w-fit mt-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTab('upload')}
                className={`px-5 py-1.5 rounded-full text-sm font-inter font-light transition-colors h-auto ${
                  tab === 'upload'
                    ? 'bg-white/10 text-white hover:bg-white/15'
                    : 'text-white/40 hover:text-white/70 hover:bg-transparent'
                }`}
              >
                Upload
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTab('url')}
                className={`px-5 py-1.5 rounded-full text-sm font-inter font-light transition-colors h-auto ${
                  tab === 'url'
                    ? 'bg-white/10 text-white hover:bg-white/15'
                    : 'text-white/40 hover:text-white/70 hover:bg-transparent'
                }`}
              >
                From URL
              </Button>
            </div>

            {/* Upload tab */}
            {tab === 'upload' && (
              <label
                htmlFor="screenshot-upload"
                className="flex flex-col items-center justify-center gap-5 px-[26px] py-[40px] cursor-pointer"
              >
                <div className="flex items-center justify-center w-16 h-16 rounded-[20px] bg-[#1a1a1a] border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/60" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-[18px] font-inter font-light text-white/90">Drop a screenshot here</p>
                  <p className="text-[13px] font-inter font-light text-white/45">or click to browse — PNG, JPG, WebP, GIF supported</p>
                </div>
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Button
                      className="siteshot-footer-btn bg-[#7700FF] font-inter font-light text-white shadow-[0_12px_28px_rgba(119,0,255,0.35)] hover:bg-[#6600e0] pointer-events-none"
                      tabIndex={-1}
                    >
                      Upload screenshot
                    </Button>
                  </motion.div>
              </label>
            )}

            {/* From URL tab */}
            {tab === 'url' && (
              <div className="flex flex-col items-center gap-5 px-[26px] py-[40px]">
                <div className="flex items-center justify-center w-16 h-16 rounded-[20px] bg-[#1a1a1a] border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/60" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-[18px] font-inter font-light text-white/90">Enter a website URL</p>
                  <p className="text-[13px] font-inter font-light text-white/45">We'll capture a screenshot and load it into the editor</p>
                </div>
                <div className="flex w-full max-w-[480px] gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !capturing) handleCapture() }}
                    placeholder="https://example.com"
                    aria-label="Website URL to screenshot"
                    disabled={capturing}
                    spellCheck={false}
                    className="flex-1 min-w-0 h-[42px] px-4 rounded-[12px] bg-[#1a1a1a] border border-white/10 text-sm font-inter font-light text-white placeholder:text-white/30 outline-none focus:border-[#7700FF]/60 transition-colors disabled:opacity-50"
                  />
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="shrink-0"
                  >
                    <Button
                      onClick={handleCapture}
                      disabled={capturing}
                      aria-label="Capture screenshot"
                      className="h-[42px] px-5 rounded-[12px] bg-[#7700FF] hover:bg-[#6600e0] disabled:opacity-50 text-sm font-inter font-light text-white shadow-[0_12px_28px_rgba(119,0,255,0.35)]"
                    >
                      {capturing ? (
                        <>
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                          </svg>
                          Capturing…
                        </>
                      ) : 'Capture'}
                    </Button>
                  </motion.div>
                </div>
              </div>
            )}

            <input
              id="screenshot-upload"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleInputChange}
            />
          </motion.div>
        )}
      </div>
    </div>
  )
}
