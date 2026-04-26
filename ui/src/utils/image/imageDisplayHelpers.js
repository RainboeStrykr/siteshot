export const PREVIEW_CORNER_RADIUS_PX = 26;

export const buildRadiusStyle = (radius, flattenTop = false) => {
  if (flattenTop) {
    if (!radius) {
      return {
        borderRadius: 0,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
      };
    }
    return {
      borderRadius: `${radius}px`,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
    };
  }
  if (!radius) {
    return {};
  }
  return { borderRadius: `${radius}px` };
};

export const getScreenshotRadiusFromOptions = (options) => {
  const raw = Number(options?.cornerRadius);
  if (Number.isFinite(raw)) return Math.max(0, raw);
  const legacy = {
    'rounded-none': 0,
    'rounded-sm': 2,
    rounded: 4,
    'rounded-md': 6,
    'rounded-lg': 8,
    'rounded-xl': 12,
    'rounded-2xl': 16,
    'rounded-3xl': 24,
  };
  return Math.max(0, legacy[options?.rounded] ?? legacy['rounded-xl']);
};

export const snapToHalfPixel = (value) => {
  const v = Number(value);
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 2) / 2;
};

export const snapToDevicePixel = (value) => {
  const v = Number(value);
  if (!Number.isFinite(v)) return 0;
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
  const s = Math.max(1, Number(dpr) || 1);
  return Math.round(v * s) / s;
};

export const boostRgbaAlphaInCssValue = (cssValue, factor = 1) => {
  if (!cssValue || typeof cssValue !== 'string') return cssValue;
  const f = Number(factor);
  if (!Number.isFinite(f) || Math.abs(f - 1) < 0.0001) return cssValue;

  return cssValue.replace(
    /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9]*\.?[0-9]+)\s*\)/g,
    (_m, r, g, b, a) => {
      const alpha = Math.max(0, Math.min(1, Number(a) * f));
      const alphaStr = String(Math.round(alpha * 1000) / 1000);
      return `rgba(${r}, ${g}, ${b}, ${alphaStr})`;
    }
  );
};

export const normalizeBrowserVariant = (variant) => {
  if (!variant) return 'hidden';
  switch (variant) {
    case 'light':
      return 'mac-light';
    case 'dark':
      return 'mac-dark';
    case 'windows':
      return 'windows-dark';
    case 'safari':
      return 'safari-dark';
    default:
      return variant;
  }
};
