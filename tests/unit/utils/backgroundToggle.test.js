import { describe, expect, test } from 'vitest';
import {
  isSameWallpaperSelection,
  isSameGradientSelection,
  isSameBlobGradientSelection,
  toggleWallpaperOff,
  toggleGradientOff,
  toggleBlobGradientOff,
} from '../../../ui/src/utils/image/backgroundToggle';

describe('backgroundToggle', () => {
  test('wallpaper: detects same selection and toggles off', () => {
    const options = {
      backgroundType: 'wallpaper',
      wallpaper: 'asset://x',
      wallpaperPath: '/System/foo.jpg',
      wallpaperSource: 'system',
      customTheme: { colorStart: '#111111', colorEnd: '#222222' },
    };

    expect(isSameWallpaperSelection(options, '/System/foo.jpg')).toBe(true);
    const next = toggleWallpaperOff(options);
    expect(next.backgroundType).toBe('gradient');
    expect(next.wallpaper).toBe(null);
    expect(next.wallpaperPath).toBe(null);
  });

  test('gradient: detects same selection (case-insensitive)', () => {
    const options = {
      backgroundType: 'gradient',
      customTheme: { colorStart: '#AA00FF', colorEnd: '#2C2C2C' },
    };
    expect(isSameGradientSelection(options, { colorStart: '#aa00ff', colorEnd: '#2c2c2c' })).toBe(true);
  });

  test('gradient: toggling off restores defaults', () => {
    const options = {
      backgroundType: 'gradient',
      customTheme: { colorStart: '#AA00FF', colorEnd: '#2C2C2C' },
      wallpaper: 'something',
      wallpaperSource: 'local',
      wallpaperPath: '/backgrounds/x.png',
    };
    const next = toggleGradientOff(options, { colorStart: '#6D28D9', colorEnd: '#A78BFA' });
    expect(next.backgroundType).toBe('gradient');
    expect(next.customTheme.colorStart).toBe('#6D28D9');
    expect(next.wallpaper).toBe(null);
    expect(next.wallpaperPath).toBe(null);
  });

  test('blobGradient: detects same selection by seed and toggles off', () => {
    const options = {
      backgroundType: 'blobGradient',
      blobGradient: { seed: 123, colors: ['#fff'] },
      customTheme: { colorStart: '#111', colorEnd: '#222' },
    };
    expect(isSameBlobGradientSelection(options, { seed: 123 })).toBe(true);
    const next = toggleBlobGradientOff(options, { colorStart: '#6D28D9', colorEnd: '#A78BFA' });
    expect(next.backgroundType).toBe('gradient');
    expect(next.customTheme.colorStart).toBe('#6D28D9');
  });
});
