import { describe, expect, it } from 'vitest';

import { computeEffectivePaddingPx } from '../../../ui/src/utils/image/paddingPolicy';

describe('computeEffectivePaddingPx', () => {
  it('returns 0 for falsy padding', () => {
    expect(computeEffectivePaddingPx({ paddingPx: 0, aspectMode: 'auto', imageWidth: 100, imageHeight: 100 })).toBe(0);
  });

  it('does not change padding outside auto aspect mode', () => {
    expect(computeEffectivePaddingPx({ paddingPx: 40, aspectMode: 'preset', imageWidth: 3000, imageHeight: 500 })).toBe(40);
    expect(computeEffectivePaddingPx({ paddingPx: 40, aspectMode: 'custom', imageWidth: 3000, imageHeight: 500 })).toBe(40);
  });

  it('keeps padding unchanged for normal auto aspect ratios', () => {
    // 16:9-ish should stay basically the same.
    expect(computeEffectivePaddingPx({ paddingPx: 40, aspectMode: 'auto', imageWidth: 1600, imageHeight: 900 })).toBe(40);
  });

  it('keeps padding unchanged for extreme auto aspect ratios', () => {
    const base = 40;
    const next = computeEffectivePaddingPx({ paddingPx: base, aspectMode: 'auto', imageWidth: 6000, imageHeight: 800 });
    expect(next).toBe(base);
  });

  it('falls back to base padding when dims unknown', () => {
    expect(computeEffectivePaddingPx({ paddingPx: 40, aspectMode: 'auto', imageWidth: 0, imageHeight: 0 })).toBe(40);
  });
});
