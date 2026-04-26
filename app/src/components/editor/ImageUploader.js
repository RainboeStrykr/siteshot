import React, { useEffect, useState } from 'react';
import { formatComboForDisplay } from '@/utils/platform/keybinds';
import { useI18n } from './I18nContext';
import { useAppContext } from '@/AppContext';

const SCREENSHOTAPI_ENDPOINT = 'https://api.screenshotapi.com/take';
const API_KEY = import.meta.env.VITE_SCREENSHOTAPI_KEY;

/**
 * ImageUploader Component - Handles the initial image upload UI
 *
 * Two tabs:
 *  - Upload: drag-and-drop / file picker (existing behaviour)
 *  - From URL: enter a website URL and fetch a screenshot via screenshotapi.com
 *
 * @param {Object} props
 * @param {Function} props.onPaste - Handler for image upload/paste
 * @param {Object} props.shortcuts - Keyboard shortcut config
 */
const ImageUploader = ({ onPaste, shortcuts }) => {
  const { t } = useI18n();
  const { applyCapturedSource, pushToast } = useAppContext();

  const [tab, setTab] = useState('upload'); // 'upload' | 'url'
  const [shortcutLabel, setShortcutLabel] = useState('⌘⇧ 8');

  // URL tab state
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const combo = shortcuts?.screenshotRegion;
    if (!combo) { setShortcutLabel('⌘⇧ 8'); return; }
    try {
      const platform = window?.platform || null;
      const s = formatComboForDisplay(combo, { platform, useSymbols: true });
      setShortcutLabel(s || '⌘⇧ 8');
    } catch {
      setShortcutLabel('⌘⇧ 8');
    }
  }, [shortcuts?.screenshotRegion]);

  const normalizeUrl = (raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const handleCapture = async () => {
    const targetUrl = normalizeUrl(url);
    if (!targetUrl) {
      pushToast('Please enter a website URL', { variant: 'error' });
      return;
    }

    setLoading(true);
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
      });

      if (!response.ok) {
        let detail = '';
        try { detail = await response.text(); } catch { /* ignore */ }
        throw new Error(`API error ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`);
      }

      const json = await response.json();
      const remoteUrl = json.outputUrl || json.screenshot || json.url;

      let dataUrl = null;
      if (json.base64) {
        dataUrl = `data:image/png;base64,${json.base64}`;
      } else if (remoteUrl) {
        // Fetch through Vite proxy to avoid CORS / canvas taint
        let fetchUrl = remoteUrl;
        try {
          const parsed = new URL(remoteUrl);
          if (parsed.hostname.includes('amazonaws.com')) {
            fetchUrl = `/api/s3-img${parsed.pathname}${parsed.search}`;
          }
        } catch { /* use remoteUrl as-is */ }

        const imgResponse = await fetch(fetchUrl);
        if (!imgResponse.ok) throw new Error(`Failed to fetch screenshot image: ${imgResponse.status}`);
        const imgBlob = await imgResponse.blob();
        dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error('Failed to read image'));
          reader.onload = () => resolve(String(reader.result || ''));
          reader.readAsDataURL(imgBlob);
        });
      } else {
        throw new Error(`Unexpected response shape: ${JSON.stringify(json).slice(0, 200)}`);
      }

      await applyCapturedSource(dataUrl);
      pushToast('Screenshot loaded', { variant: 'success' });
      setUrl('');
    } catch (err) {
      pushToast(`Screenshot failed: ${err?.message || String(err)}`, { variant: 'error', durationMs: 4500 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-12">
      <div className="text-center w-80 space-y-4">

        {/* Tab switcher */}
        <div className="flex rounded-xl overflow-hidden border border-[color:var(--card-border)] bg-[color:var(--panel-bg)] p-1 gap-1">
          <button
            type="button"
            onClick={() => setTab('upload')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === 'upload'
                ? 'bg-white/10 text-[color:var(--app-fg)]'
                : 'text-[color:var(--app-muted)] hover:text-[color:var(--app-fg)]'
            }`}
          >
            Upload
          </button>
          <button
            type="button"
            onClick={() => setTab('url')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === 'url'
                ? 'bg-white/10 text-[color:var(--app-fg)]'
                : 'text-[color:var(--app-muted)] hover:text-[color:var(--app-fg)]'
            }`}
          >
            From URL
          </button>
        </div>

        {/* Upload tab */}
        {tab === 'upload' && (
          <div
            className="p-8 rounded-2xl border transition-all duration-200 shadow-soft-md border-[color:var(--card-border)] bg-[color:var(--panel-bg)]"
            onDrop={(e) => { e.preventDefault(); onPaste(e); }}
            onDragOver={(e) => { e.preventDefault(); }}
          >
            <input
              className="hidden"
              id="imagesUpload"
              type="file"
              onChange={onPaste}
              accept="image/png, image/jpeg, image/webp"
            />
            <label
              htmlFor="imagesUpload"
              className="flex flex-col items-center justify-center cursor-pointer"
            >
              <span className="w-16 h-16 mb-4 text-[color:var(--app-fg)] opacity-90">
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <path fill="var(--app-bg)" d="M17 11h-4V7h-2v4H7v2h4v4h2v-4h4z" />
                </svg>
              </span>
              <p className="text-lg font-medium text-[color:var(--app-fg)] mb-1">{shortcutLabel}</p>
              <p className="text-xs text-[color:var(--app-muted)]">{t('orUploadImage')}</p>
            </label>
          </div>
        )}

        {/* From URL tab */}
        {tab === 'url' && (
          <div className="p-6 rounded-2xl border transition-all duration-200 shadow-soft-md border-[color:var(--card-border)] bg-[color:var(--panel-bg)] flex flex-col gap-3">
            <p className="text-xs text-[color:var(--app-muted)]">
              Enter a website URL to capture a screenshot
            </p>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleCapture(); }}
              placeholder="https://example.com"
              aria-label="Website URL to screenshot"
              disabled={loading}
              className="w-full px-3 py-2 rounded-lg text-sm bg-[color:var(--input-bg,#2c2c2c)] border border-[color:var(--card-border)] text-[color:var(--app-fg)] placeholder:text-[color:var(--app-muted)] outline-none focus:ring-1 focus:ring-white/20"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={handleCapture}
              disabled={loading}
              className="w-full py-2 rounded-lg text-sm font-medium text-white bg-[#307b52] hover:bg-[#256642] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Capturing…
                </>
              ) : 'Capture screenshot'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default ImageUploader;

