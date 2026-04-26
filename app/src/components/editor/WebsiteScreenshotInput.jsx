import React, { useState } from 'react'
import { useAppContext } from '@/AppContext'
import { Button } from '@/components/ui/button'

const SCREENSHOTAPI_ENDPOINT = 'https://api.screenshotapi.com/take'
const API_KEY = import.meta.env.VITE_SCREENSHOTAPI_KEY

/**
 * WebsiteScreenshotInput
 *
 * Lets the user paste a website URL, fetches a screenshot via screenshotapi.com,
 * and loads the result into the editor via applyCapturedSource.
 */
export default function WebsiteScreenshotInput() {
  const { applyCapturedSource, pushToast } = useAppContext()

  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const normalizeUrl = (raw) => {
    const trimmed = raw.trim()
    if (!trimmed) return ''
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `https://${trimmed}`
  }

  const handleCapture = async () => {
    const targetUrl = normalizeUrl(url)
    if (!targetUrl) {
      pushToast('Please enter a website URL', { variant: 'error' })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(SCREENSHOTAPI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

      // The JSON response contains a base64-encoded image or a URL to the image
      let dataUrl = null

      const remoteUrl = json.outputUrl || json.screenshot || json.url
      if (json.base64) {
        dataUrl = `data:image/png;base64,${json.base64}`
      } else if (remoteUrl) {
        // Fetch the S3 image through the Vite dev proxy to avoid CORS.
        // e.g. https://s3.amazonaws.com/screenshotapi/abc/xyz.png
        //   → /api/s3-img/screenshotapi/abc/xyz.png
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
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) handleCapture()
  }

  return (
    <div className="mt-4 rounded-[10px] border border-white/10 bg-[#1c1c1c] px-3 py-3 flex flex-col gap-2">
      <div className="text-xs font-inter font-light text-white mb-1">Screenshot from URL</div>

      <div className="flex items-center gap-1">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="https://example.com"
          aria-label="Website URL to screenshot"
          className="flex-1 min-w-0 h-[28px] bg-[#2C2C2C] rounded-[6px] text-[11px] font-inter font-light text-white px-2 border border-white/10 placeholder:text-white/30"
          spellCheck={false}
          disabled={loading}
        />
        <Button
          onClick={handleCapture}
          disabled={loading}
          aria-label="Capture screenshot"
          className="shrink-0 h-[28px] px-3 rounded-[6px] bg-[#307b52] hover:bg-[#256642] disabled:opacity-50 text-[11px] font-inter font-light text-white"
        >
          {loading ? (
            <span className="flex items-center gap-1">
              <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <span>Loading</span>
            </span>
          ) : 'Capture'}
        </Button>
      </div>
    </div>
  )
}

