import { getJson, setItem, setJson } from '../platform/safeStorage';

const RADIUS_MAP = {
  'rounded-none': 0,
  'rounded-sm': 2,
  rounded: 4,
  'rounded-md': 6,
  'rounded-lg': 8,
  'rounded-xl': 12,
  'rounded-2xl': 16,
  'rounded-3xl': 24,
};

export const getRoundedPx = (roundedClass) => {
  return Math.max(0, RADIUS_MAP[roundedClass] ?? RADIUS_MAP['rounded-xl']);
};

export const baseOptions = {
  aspectRatio: 'aspect-square',
  aspectMode: 'preset',
  aspectCustom: { w: 1, h: 1 },
  aspectAuto: { w: null, h: null },
  theme: 'bg-gradient-to-br from-based-purple via-based-purple-dark to-based-purple-light',
  backgroundType: 'gradient',
  wallpaper: null,
  customTheme: {
    colorStart: '#6D28D9',
    colorEnd: '#A78BFA',
  },
  blobGradient: {
    colors: ['#6D28D9', '#A78BFA', '#EC4899', '#22C55E'],
    seed: 1,
    blobCount: 6,
    intensity: 0.85,
    angleDeg: 135,
  },
  paddingSize: 20,
  rounded: 'rounded-xl',
  cornerRadius: 12,
  shadow: 'Hug (Default)',
  borderWidth: 0,
  advancedShadow: {
    enabled: false,
    offsetX: 0,
    offsetY: 10,
    blur: 15,
    spread: -3,
    color: '#000000',
    opacity: 0.1,
  },
  inset: {
    padding: 0,
  },
  browserFrame: {
    scale: 1,
  },
  tilt: {
    x: 0,
    y: 0,
  },
  position: {
    x: 0,
    y: 0,
    rotate: 0,
  },
  noise: false,
  fx: { noise: false, blur: 0, brightness: 1, vignette: 0 },
  browserBar: 'hidden',
  balance: { enabled: true },
  watermark: { enabled: true, text: 'Made with SiteShot', showTwitter: false, showVerified: false, position: 'inside' },
  pen: {
    color: '#FFFFFF',
  },
};

export const defaultAccordionState = {
  canvas: true,
  browser: true,
  padding: true,
  borders: true,
  position: true,
  tilt: true,
  shadow: true,
  effects: true,
  balance: true,
  blobGradient: true,
  watermark: true,
};

export const CORNER_PRESETS = [
  { label: 'None', value: 'rounded-none' },
  { label: 'Small', value: 'rounded-lg' },
  { label: 'Medium', value: 'rounded-xl' },
  { label: 'Large', value: 'rounded-3xl' },
];

export const normalizeBrowserBarValue = (value) => {
  if (typeof value !== 'string') return 'hidden';
  switch (value) {
    case 'light':
      return 'mac-light';
    case 'dark':
      return 'mac-dark';
    case 'windows':
      return 'windows-dark';
    case 'safari':
      return 'safari-dark';
    case 'mac-light':
    case 'mac-dark':
    case 'windows-light':
    case 'windows-dark':
    case 'safari-dark':
    case 'hidden':
      return value;
    default:
      return value || 'hidden';
  }
};

export const normalizeBalanceSetting = (balance, balanceDefaultEnabled) => {
  if (balance === undefined || balance === null) {
    return { enabled: !!balanceDefaultEnabled };
  }
  if (typeof balance === 'object') {
    return { enabled: !!balance.enabled };
  }
  return { enabled: !!balance };
};

export const createSafeOptions = (parsedOptions, balanceDefaultEnabled) => {
  const defaultWatermark = { enabled: true, text: 'Made with SiteShot', showTwitter: false, showVerified: false, position: 'inside' };
  const safeOptions = {
    ...baseOptions,
    ...parsedOptions,
    aspectMode: parsedOptions.aspectMode || 'preset',
    aspectCustom: parsedOptions.aspectCustom || { w: 1, h: 1 },
    aspectAuto: (parsedOptions.aspectAuto && parsedOptions.aspectAuto.w && parsedOptions.aspectAuto.h)
      ? parsedOptions.aspectAuto
      : { w: null, h: null },
    tilt: parsedOptions.tilt || { x: 0, y: 0 },
    position: parsedOptions.position || { x: 0, y: 0, rotate: 0 },
    inset: parsedOptions.inset || { padding: 0 },
    browserFrame: parsedOptions.browserFrame || { scale: 1 },
    pen: parsedOptions.pen || { color: '#FFFFFF' },
  };

  // Blob gradient defaults (ensure shape exists when selected).
  if (safeOptions.backgroundType === 'blobGradient') {
    safeOptions.blobGradient = {
      ...(baseOptions.blobGradient || {}),
      ...(parsedOptions?.blobGradient || {}),
    };
  }

  const padding = Number(safeOptions.inset.padding) || 0;
  safeOptions.inset.padding = Math.min(100, Math.max(0, padding));

  safeOptions.balance = normalizeBalanceSetting(parsedOptions.balance, balanceDefaultEnabled);
  safeOptions.browserBar = normalizeBrowserBarValue(safeOptions.browserBar);

  // Watermark: normalize legacy shapes (boolean / partial object) and ensure new fields exist.
  const rawWatermark = parsedOptions?.watermark;
  if (rawWatermark === undefined || rawWatermark === null) {
    safeOptions.watermark = { ...defaultWatermark };
  } else if (typeof rawWatermark === 'boolean') {
    safeOptions.watermark = { ...defaultWatermark, enabled: !!rawWatermark };
  } else if (typeof rawWatermark === 'object') {
    safeOptions.watermark = {
      ...defaultWatermark,
      ...rawWatermark,
      enabled: rawWatermark.enabled !== undefined ? !!rawWatermark.enabled : defaultWatermark.enabled,
      text: (typeof rawWatermark.text === 'string' && rawWatermark.text.trim().length)
        ? rawWatermark.text
        : defaultWatermark.text,
      showTwitter: !!rawWatermark.showTwitter,
      showVerified: !!rawWatermark.showVerified,
    };
  } else {
    safeOptions.watermark = { ...defaultWatermark };
  }

  if (!safeOptions.fx) {
    safeOptions.fx = { noise: !!safeOptions.noise, blur: 0, brightness: 1, vignette: 0 };
  } else {
    const blur = Number(safeOptions.fx.blur);
    const brightness = Number(safeOptions.fx.brightness);
    const vignette = Number(safeOptions.fx.vignette);
    safeOptions.fx = {
      noise: !!(safeOptions.fx.noise || safeOptions.noise),
      blur: Number.isFinite(blur) ? blur : 0,
      brightness: Number.isFinite(brightness) ? brightness : 1,
      vignette: Number.isFinite(vignette) ? vignette : 0,
    };
  }

  if (typeof safeOptions.paddingSize !== 'number') {
    safeOptions.paddingSize = 20;
  }

  // Corner radius: new numeric source of truth.
  // - If absent (legacy), derive from rounded class.
  // - Clamp to a sane range.
  const rawCorner = Number(parsedOptions?.cornerRadius);
  const cornerRadius = Number.isFinite(rawCorner)
    ? rawCorner
    : getRoundedPx(safeOptions.rounded);
  safeOptions.cornerRadius = Math.min(64, Math.max(0, Math.round(cornerRadius)));

  // Shadow UI flow normalization:
  // - "Custom" is driven by the dropdown and maps to advancedShadow.enabled.
  // - Older saved states may have advancedShadow.enabled=true while shadow is not "Custom".
  if (safeOptions.shadow === 'Custom') {
    safeOptions.advancedShadow = { ...(safeOptions.advancedShadow || {}), enabled: true };
  } else if (safeOptions.advancedShadow?.enabled) {
    safeOptions.shadow = 'Custom';
  }

  return safeOptions;
};

export const loadOptionsFromStorage = (balanceDefaultEnabled) => {
  const parsedOptions = getJson('options', null);
  if (!parsedOptions) return null;
  return createSafeOptions(parsedOptions, balanceDefaultEnabled);
};

export const persistOptionsToStorage = (options) => {
  try {
    const wallpaper = options?.wallpaper;
    const wallpaperIsBlobUrl = typeof wallpaper === 'string' && wallpaper.startsWith('blob:');
    const wallpaperIsHugeDataUrl = typeof wallpaper === 'string' && wallpaper.startsWith('data:') && wallpaper.length > 50_000;

    // Never persist ephemeral blob: URLs or huge base64 wallpapers.
    // Keep wallpaperPath/wallpaperSource so the UI can rehydrate a preview later (desktop).
    const toSave = {
      ...options,
      wallpaper: (wallpaperIsBlobUrl || wallpaperIsHugeDataUrl) ? null : wallpaper,
      fx: {
        ...options.fx,
        blur: options.fx?.blur || 0,
        brightness: options.fx?.brightness || 1,
        vignette: options.fx?.vignette || 0,
      },
    };

    // If options are still very large, avoid crashing localStorage writes.
    const json = JSON.stringify(toSave);
    if (json.length > 2_000_000) {
      setJson('options', toSave);
    } else {
      setItem('options', json);
    }
  } catch (err) {
    console.error('Failed to save options:', err);
  }
};

export const aspectClassToRatio = (aspectClass) => {
  if (!aspectClass || typeof aspectClass !== 'string') return null;
  if (aspectClass === 'aspect-square') return '1 / 1';
  if (aspectClass === 'aspect-video') return '16 / 9';
  const m = aspectClass.match(/aspect-\[(\d+)\/(\d+)\]/);
  if (m) return `${m[1]} / ${m[2]}`;
  return null;
};
