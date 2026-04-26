import { describe, it, expect } from 'vitest';
import { computeObjectContainRect } from '../../../ui/src/utils/image/objectFit';

describe('computeObjectContainRect', () => {
  it('returns null for empty container', () => {
    expect(computeObjectContainRect({ containerWidth: 0, containerHeight: 10, naturalWidth: 100, naturalHeight: 100 })).toBe(null);
  });

  it('centers contained rect when aspect differs', () => {
    const r = computeObjectContainRect({
      containerLeft: 0,
      containerTop: 0,
      containerWidth: 100,
      containerHeight: 50,
      naturalWidth: 100,
      naturalHeight: 100,
    });
    // Contain into 100x50 => rendered 50x50 centered horizontally.
    expect(Math.round(r.width)).toBe(50);
    expect(Math.round(r.height)).toBe(50);
    expect(Math.round(r.left)).toBe(25);
    expect(Math.round(r.top)).toBe(0);
    expect(Math.round(r.right)).toBe(75);
    expect(Math.round(r.bottom)).toBe(50);
  });
});
