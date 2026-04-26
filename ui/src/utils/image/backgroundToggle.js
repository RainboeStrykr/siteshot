export const normalizeLower = (s) => String(s || '').toLowerCase();

export const isSameWallpaperSelection = (options, candidatePath) => {
  if (!options || options.backgroundType !== 'wallpaper') return false;
  const active = options.wallpaperPath || options.wallpaper;
  return !!active && !!candidatePath && String(active) === String(candidatePath);
};

export const toggleWallpaperOff = (options) => ({
  ...(options || {}),
  backgroundType: 'gradient',
  wallpaper: null,
  wallpaperSource: null,
  wallpaperPath: null,
});

export const isSameGradientSelection = (options, config) => {
  if (!options || options.backgroundType !== 'gradient') return false;
  const a0 = normalizeLower(options?.customTheme?.colorStart);
  const a1 = normalizeLower(options?.customTheme?.colorEnd);
  const b0 = normalizeLower(config?.colorStart);
  const b1 = normalizeLower(config?.colorEnd);
  return !!a0 && !!a1 && a0 === b0 && a1 === b1;
};

export const toggleGradientOff = (options, defaults = { colorStart: '#6D28D9', colorEnd: '#A78BFA' }) => ({
  ...(options || {}),
  backgroundType: 'gradient',
  customTheme: {
    ...(options?.customTheme || {}),
    colorStart: defaults?.colorStart || '#6D28D9',
    colorEnd: defaults?.colorEnd || '#A78BFA',
  },
  wallpaper: null,
  wallpaperSource: null,
  wallpaperPath: null,
});

export const isSameBlobGradientSelection = (options, config) => {
  if (!options || options.backgroundType !== 'blobGradient') return false;
  const a = options?.blobGradient?.seed;
  const b = config?.seed;
  if (!Number.isFinite(Number(a)) || !Number.isFinite(Number(b))) return false;
  return Number(a) === Number(b);
};

// Alias — identical behavior, kept for semantic clarity at call sites.
export const toggleBlobGradientOff = toggleGradientOff;
