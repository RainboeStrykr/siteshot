/**
 * Shared path/URL helpers.
 * Consolidated from duplicated definitions in BackgroundsTab.js and ImageDisplay.jsx.
 */

/**
 * Returns true if `val` looks like an absolute filesystem path (macOS, Linux, or Windows).
 * Returns false for data:, blob:, asset:, and http(s): URLs.
 */
export const isAbsoluteFilePath = (val) => {
  if (!val || typeof val !== 'string') return false;
  if (/^(data:|blob:|asset:|http:|https:)/i.test(val)) return false;
  if (val.startsWith('/')) return true;
  if (/^[a-zA-Z]:[\\/]/.test(val)) return true;
  return false;
};

/**
 * Normalize a URL string for safe use in CSS / `<img src>`:
 * - Fixes accidental double-encoding (%2520 → %20)
 * - Encodes spaces
 * - Passes data: and blob: URLs through unchanged
 */
export const toSafeUrl = (val) => {
  if (!val || typeof val !== 'string') return val;
  if (/^(data:|blob:)/i.test(val)) return val;

  let s = val;
  for (let i = 0; i < 3; i++) {
    const next = s.replace(/%25([0-9a-fA-F]{2})/g, '%$1');
    if (next === s) break;
    s = next;
  }

  return s.includes(' ') ? s.replace(/ /g, '%20') : s;
};
