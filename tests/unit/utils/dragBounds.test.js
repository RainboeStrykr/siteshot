import { describe, expect, test } from 'vitest';
import { clampTransformToContainer } from '../../../ui/src/utils/core/dragBounds';

describe('clampTransformToContainer', () => {
  test('returns input when sizes missing', () => {
    expect(clampTransformToContainer({ x: 10, y: -5 }, { containerWidth: 0, containerHeight: 0, cardWidth: 0, cardHeight: 0 })).toEqual({ x: 10, y: -5 });
  });

  test('clamps within container bounds', () => {
    // container 100x100, card 60x40 => max offsets: x=20, y=30
    expect(
      clampTransformToContainer(
        { x: 999, y: -999 },
        { containerWidth: 100, containerHeight: 100, cardWidth: 60, cardHeight: 40 }
      )
    ).toEqual({ x: 20, y: -30 });
  });

  test('when card larger than container, pins to center', () => {
    expect(
      clampTransformToContainer(
        { x: 15, y: -22 },
        { containerWidth: 100, containerHeight: 100, cardWidth: 140, cardHeight: 160 }
      )
    ).toEqual({ x: 0, y: 0 });
  });
});
