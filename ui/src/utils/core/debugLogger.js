/**
 * Debug logging for SiteShot.
 * Enable at runtime via localStorage:
 *   localStorage.setItem('debug.enabled', '1')
 *   localStorage.setItem('debug.balance', '1')   // optional: balance logs
 *   localStorage.setItem('debug.export', '1')     // optional: export logs
 */

const DEBUG_CONFIG = {
  ENABLED: false,
  LOG_BALANCE: false,
  LOG_EXPORT: false,
};

// Runtime config from localStorage (best-effort).
try {
  if (typeof window !== 'undefined' && window?.localStorage) {
    if (window.localStorage.getItem('debug.enabled') === '1') DEBUG_CONFIG.ENABLED = true;
    if (window.localStorage.getItem('debug.balance') === '1') DEBUG_CONFIG.LOG_BALANCE = true;
    if (window.localStorage.getItem('debug.export') === '1') DEBUG_CONFIG.LOG_EXPORT = true;
  }
} catch {
  // Ignore storage access errors.
}

export const debugConfig = DEBUG_CONFIG;

const timestamp = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;
};

const STYLE = {
  balance: 'background: #0F766E; color: white; padding: 2px 4px; border-radius: 2px;',
  error: 'background: #DC2626; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold;',
  info: 'background: #047857; color: white; padding: 2px 4px; border-radius: 2px;',
};

const log = (tag, style, label, data) => {
  if (!DEBUG_CONFIG.ENABLED) return;
  console.log(`%c[${tag}]%c ${timestamp()} | ${label}:`, style, '', data);
};

/**
 * Create a logger scoped to a component name.
 * Only includes the categories actually used in the codebase:
 * dimensions, balance, and error.
 */
export const createComponentLogger = (componentName) => ({
  dimensions: (source, data) => log('DIM', STYLE.info, `${componentName}:${source}`, data),
  balance: (stage, data) => {
    if (!DEBUG_CONFIG.LOG_BALANCE) return;
    log('BALANCE', STYLE.balance, `${componentName}:${stage}`, data);
  },
  error: (context, error, extra) => {
    if (!DEBUG_CONFIG.ENABLED) return;
    console.error(`%c[ERROR]%c ${timestamp()} | ${componentName}:${context}:`, STYLE.error, '', error);
    if (extra && Object.keys(extra).length > 0) console.error('Context:', extra);
  },
});
