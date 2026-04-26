import { expect, test } from 'vitest';
import { parseCssColor, rgbaString } from '../ui/src/utils/color/cssColor';

test('parseCssColor parses hex colors', () => {
  expect(parseCssColor('#abc')).toEqual({ r: 170, g: 187, b: 204, a: 1 });
  expect(parseCssColor('#A1B2C3')).toEqual({ r: 161, g: 178, b: 195, a: 1 });
});

test('parseCssColor parses rgb/rgba colors', () => {
  expect(parseCssColor('rgb(1, 2, 3)')).toEqual({ r: 1, g: 2, b: 3, a: 1 });
  expect(parseCssColor('rgba(10, 20, 30, 0.4)')).toEqual({ r: 10, g: 20, b: 30, a: 0.4 });
});

test('parseCssColor parses hsl/hsla colors', () => {
  // Pure red
  expect(parseCssColor('hsl(0, 100%, 50%)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  // Pure green
  expect(parseCssColor('hsl(120 100% 50%)')).toEqual({ r: 0, g: 255, b: 0, a: 1 });
  // Pure blue with alpha
  expect(parseCssColor('hsla(240, 100%, 50%, 0.25)')).toEqual({ r: 0, g: 0, b: 255, a: 0.25 });
  // Modern slash alpha syntax
  expect(parseCssColor('hsl(240 100% 50% / 0.5)')).toEqual({ r: 0, g: 0, b: 255, a: 0.5 });
});

test('parseCssColor returns null for unsupported values', () => {
  expect(parseCssColor('white')).toBe(null);
  expect(parseCssColor('')).toBe(null);
  expect(parseCssColor(null)).toBe(null);
});

test('rgbaString builds rgba with overridden alpha', () => {
  expect(rgbaString('#112233', 0.5)).toBe('rgba(17, 34, 51, 0.5)');
  expect(rgbaString('rgba(17, 34, 51, 0.2)', 0.7)).toBe('rgba(17, 34, 51, 0.7)');
});

