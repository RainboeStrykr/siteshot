import { clamp } from '../core/math';

const parseHex = (hex) => {
  const h = String(hex || '').trim();
  const m = h.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!m) return null;
  let s = m[1];
  if (s.length === 3) s = s.split('').map((c) => c + c).join('');
  const n = Number.parseInt(s, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
};

const parseRgbFunc = (css) => {
  const s = String(css || '').trim();
  const m = s.match(/^rgba?\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*(?:,\s*([0-9]*\.?[0-9]+)\s*)?\)$/i);
  if (!m) return null;
  const r = clamp(Number(m[1]), 0, 255);
  const g = clamp(Number(m[2]), 0, 255);
  const b = clamp(Number(m[3]), 0, 255);
  const a = m[4] == null ? 1 : clamp(Number(m[4]), 0, 1);
  return { r, g, b, a };
};

const hslToRgb = (h, s, l) => {
  // h in [0,360), s/l in [0,1]
  const hh = ((Number(h) % 360) + 360) % 360;
  const ss = clamp(Number(s), 0, 1);
  const ll = clamp(Number(l), 0, 1);
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;

  let rp = 0;
  let gp = 0;
  let bp = 0;

  if (hh < 60) {
    rp = c; gp = x; bp = 0;
  } else if (hh < 120) {
    rp = x; gp = c; bp = 0;
  } else if (hh < 180) {
    rp = 0; gp = c; bp = x;
  } else if (hh < 240) {
    rp = 0; gp = x; bp = c;
  } else if (hh < 300) {
    rp = x; gp = 0; bp = c;
  } else {
    rp = c; gp = 0; bp = x;
  }

  return {
    r: clamp(Math.round((rp + m) * 255), 0, 255),
    g: clamp(Math.round((gp + m) * 255), 0, 255),
    b: clamp(Math.round((bp + m) * 255), 0, 255),
  };
};

const parseHslFunc = (css) => {
  const s = String(css || '').trim();
  // Support:
  // - hsl(210, 50%, 40%)
  // - hsla(210, 50%, 40%, 0.8)
  // - hsl(210 50% 40% / 0.8)
  const m = s.match(/^hsla?\((.*)\)$/i);
  if (!m) return null;
  const body = String(m[1] || '').trim();
  if (!body) return null;

  // Normalize separators: allow commas and/or spaces, with optional slash for alpha.
  const parts = body
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s*,\s*/g, ' ')
    .trim()
    .split(/\s+/);

  const slashIdx = parts.indexOf('/');
  const hRaw = parts[0];
  const sRaw = parts[1];
  const lRaw = parts[2];
  const aRaw = slashIdx >= 0 ? parts[slashIdx + 1] : parts[3];

  if (hRaw == null || sRaw == null || lRaw == null) return null;

  const h = Number(String(hRaw).replace(/deg$/i, ''));
  const sp = String(sRaw).endsWith('%') ? Number(String(sRaw).slice(0, -1)) : Number(sRaw);
  const lp = String(lRaw).endsWith('%') ? Number(String(lRaw).slice(0, -1)) : Number(lRaw);
  if (!Number.isFinite(h) || !Number.isFinite(sp) || !Number.isFinite(lp)) return null;

  const rgb = hslToRgb(h, sp / 100, lp / 100);
  const a = aRaw == null ? 1 : clamp(Number(aRaw), 0, 1);
  return { ...rgb, a };
};

export const parseCssColor = (input) => {
  if (input == null) return null;
  if (typeof input !== 'string') return null;
  const s = input.trim();
  if (!s) return null;

  // Fast paths.
  if (s[0] === '#' || /^[0-9a-fA-F]{3,6}$/.test(s)) {
    return parseHex(s);
  }
  if (/^rgba?\(/i.test(s)) {
    return parseRgbFunc(s);
  }
  if (/^hsla?\(/i.test(s)) {
    return parseHslFunc(s);
  }

  // We intentionally do not attempt to resolve named colors (e.g. "white")
  // to keep this utility deterministic/testable without a DOM.
  return null;
};

export const rgbaString = (colorOrCss, alphaOverride = null) => {
  const c = typeof colorOrCss === 'string' ? parseCssColor(colorOrCss) : null;
  const a = alphaOverride == null ? (c ? c.a : 1) : clamp(Number(alphaOverride), 0, 1);
  if (!c) return `rgba(0, 0, 0, ${a})`;
  return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${a})`;
};
