export function isProbablyHexColor(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return false;

  const s = raw.startsWith('#') ? raw.slice(1) : raw;
  if (!s) return false;
  if (s.length > 8) return false;
  return /^[0-9a-fA-F]+$/.test(s);
}

/**
 * Normalizes a user-entered hex color for use in <input type="color">.
 *
 * - Accepts: "#RGB", "RGB", "#RRGGBB", "#RRGGBBAA" (alpha ignored)
 * - Pads short inputs on blur ("12" -> "#120000")
 * - Always returns "#RRGGBB" (uppercase)
 */
export function normalizeHexColorInput(input) {
  const raw = String(input ?? '').trim();
  let s = raw.startsWith('#') ? raw.slice(1) : raw;
  if (!s) return '#000000';
  if (!/^[0-9a-fA-F]+$/.test(s)) return '#000000';

  if (s.length === 3) {
    s = s.split('').map((ch) => ch + ch).join('');
  } else if (s.length === 4) {
    // #RGBA => treat as #RGB (alpha ignored) for <input type="color">.
    s = s.slice(0, 3).split('').map((ch) => ch + ch).join('');
  } else if (s.length === 6) {
    // ok
  } else if (s.length === 8) {
    // #RRGGBBAA => ignore alpha
    s = s.slice(0, 6);
  } else {
    // Pad/truncate to 6.
    s = (s + '000000').slice(0, 6);
  }

  if (s.length !== 6) return '#000000';
  return `#${s.toUpperCase()}`;
}
