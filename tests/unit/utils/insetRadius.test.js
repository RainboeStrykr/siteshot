import { describe, it, expect } from 'vitest';
import { computeInsetContentRadiusPx } from '../../../ui/src/utils/image/insetRadius';

describe('computeInsetContentRadiusPx', () => {
  it('keeps radius unchanged when inset scale is 1', () => {
    expect(computeInsetContentRadiusPx({ screenshotRadiusPx: 24, insetScale: 1 })).toBe(24);
  });

  it('scales radius down with inset scale', () => {
    expect(computeInsetContentRadiusPx({ screenshotRadiusPx: 30, insetScale: 0.8 })).toBe(24);
  });

  it('clamps invalid and out-of-range values', () => {
    expect(computeInsetContentRadiusPx({ screenshotRadiusPx: -10, insetScale: 0.5 })).toBe(0);
    expect(computeInsetContentRadiusPx({ screenshotRadiusPx: 20, insetScale: -1 })).toBe(0);
    expect(computeInsetContentRadiusPx({ screenshotRadiusPx: 20, insetScale: 5 })).toBe(20);
    expect(computeInsetContentRadiusPx({ screenshotRadiusPx: 20, insetScale: NaN })).toBe(20);
  });
});
