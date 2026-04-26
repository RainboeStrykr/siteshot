import { describe, expect, it } from 'vitest';
import { isProbablyHexColor, normalizeHexColorInput } from '../ui/src/utils/color/colorInput.js';

describe('colorInput', () => {
  it('detects likely hex colors', () => {
    expect(isProbablyHexColor('#abc')).toBe(true);
    expect(isProbablyHexColor('A1B2C3')).toBe(true);
    expect(isProbablyHexColor('#11223344')).toBe(true);
    expect(isProbablyHexColor('#12')).toBe(true);
    expect(isProbablyHexColor('')).toBe(false);
    expect(isProbablyHexColor('#zzzzzz')).toBe(false);
    expect(isProbablyHexColor('hsl(0 0% 0%)')).toBe(false);
  });

  it('normalizes hex input to #RRGGBB', () => {
    expect(normalizeHexColorInput('#abc')).toBe('#AABBCC');
    expect(normalizeHexColorInput('abc')).toBe('#AABBCC');
    expect(normalizeHexColorInput('#abcd')).toBe('#AABBCC');
    expect(normalizeHexColorInput('#112233')).toBe('#112233'.toUpperCase());
    expect(normalizeHexColorInput('#11223344')).toBe('#112233'.toUpperCase());
  });

  it('pads short inputs deterministically', () => {
    expect(normalizeHexColorInput('#12')).toBe('#120000');
    expect(normalizeHexColorInput('f')).toBe('#F00000');
  });

  it('falls back on invalid input', () => {
    expect(normalizeHexColorInput('#zz')).toBe('#000000');
    expect(normalizeHexColorInput('not-a-color')).toBe('#000000');
  });
});

