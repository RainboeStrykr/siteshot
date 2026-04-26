import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

function installBootDiagnostics({ label }) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const ensureOverlay = (id, html) => {
    let el = document.getElementById(id);
    if (el) return el;
    el = document.createElement('div');
    el.id = id;
    el.innerHTML = html;
    document.body.appendChild(el);
    return el;
  };

  // Intentionally do not show a boot badge; keep the fatal overlay only.
  const bootId = '__siteshot_boot';

  const showFatal = (title, err) => {
    const msg = (() => {
      try {
        if (err == null) return '';
        if (typeof err === 'string') return err;
        if (err instanceof Error) return `${err.name}: ${err.message}\n${err.stack || ''}`;
        return JSON.stringify(err);
      } catch {
        return String(err);
      }
    })();

    ensureOverlay(
      '__siteshot_fatal',
      `<div style="position:fixed;inset:0;z-index:2147483646;background:rgba(10,10,10,0.85);color:#fff;padding:16px;font:13px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Inter,system-ui,sans-serif;overflow:auto;">
        <div style="max-width:980px;margin:0 auto;">
          <h1 style="font-size:16px;margin:0 0 8px 0;">${title}</h1>
          <pre style="white-space:pre-wrap;word-break:break-word;background:rgba(0,0,0,0.4);padding:12px;border-radius:12px;">${msg.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</pre>
          <div style="opacity:0.8;margin-top:10px;">If this keeps happening, open DevTools from the app menu to see the console.</div>
        </div>
      </div>`
    );
  };

  window.addEventListener('error', (e) => {
    try { showFatal('Renderer error', e?.error || e?.message || e); } catch {}
  });
  window.addEventListener('unhandledrejection', (e) => {
    try { showFatal('Unhandled promise rejection', e?.reason || e); } catch {}
  });

  // Remove the boot badge once React mounts content.
  const start = Date.now();
  const tick = () => {
    const root = document.getElementById('root');
    const fallback = document.getElementById('boot-fallback');
    if (root && root.children && root.children.length > 0) {
      try { fallback && fallback.remove(); } catch {}
      return;
    }
    if (Date.now() - start > 15000) return;
    setTimeout(tick, 250);
  };
  setTimeout(tick, 250);
}

// Best-effort: install the Tauri API bridge before React mounts.
// This also enables buffering of early events like screenshot insertion.
if (typeof window !== 'undefined') {
  try {
    const root = document?.documentElement;
    if (root) {
      const isMac = !!(window?.platform?.isMac ?? /Mac|iPhone|iPad|iPod/i.test(navigator.platform || ''));
      const isWindows = !!(window?.platform?.isWindows ?? /Win/i.test(navigator.platform || ''));
      const isLinux = !!(window?.platform?.isLinux ?? /Linux/i.test(navigator.platform || ''));
      root.classList.toggle('platform-mac', isMac);
      root.classList.toggle('platform-windows', isWindows);
      root.classList.toggle('platform-linux', isLinux);
    }
  } catch {}
  installBootDiagnostics({ label: 'main' });
}

try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
} catch (err) {
  try {
    const ev = new Error('React mount failed');
    // @ts-ignore
    ev.cause = err;
    window.dispatchEvent(new ErrorEvent('error', { error: err, message: ev.message }));
  } catch {}
}
