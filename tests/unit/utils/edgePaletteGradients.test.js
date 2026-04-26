import { test, expect } from 'vitest';
import { edgePaletteToGradients } from '../../../ui/src/utils/image/imageInset';

test('edgePaletteToGradients produces multi-stop gradients', () => {
  const gradients = edgePaletteToGradients({
    top: ['#111111', '#222222', '#333333'],
    right: ['#444444', '#555555'],
    bottom: ['#666666', '#777777', '#888888', '#999999'],
    left: ['#aaaaaa'],
  });

  expect(gradients.top).toContain('linear-gradient');
  expect(gradients.top).toContain('#111111');
  expect(gradients.top).toContain('#333333');

  expect(gradients.bottom).toContain('#666666');
  expect(gradients.bottom).toContain('#999999');

  expect(gradients.left).toContain('180deg');
  expect(gradients.right).toContain('180deg');
});

test('edgePaletteToGradients falls back for missing edges', () => {
  const gradients = edgePaletteToGradients({ top: [] });
  expect(gradients.top).toContain('#e0e0e0');
  expect(gradients.left).toContain('#e0e0e0');
});
