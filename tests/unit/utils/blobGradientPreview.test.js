import { describe, expect, it } from 'vitest';
import { blobGradientPreviewCss } from '../../../ui/src/utils/image/blobGradientPreview';

describe('blobGradientPreviewCss', () => {
  it('returns a deterministic css string for a seed', () => {
    const a = blobGradientPreviewCss({
      seed: 123,
      colors: ['#ff0000', '#00ff00', '#0000ff'],
      intensity: 0.9,
      angleDeg: 90,
      baseMode: 'dark',
    });

    const b = blobGradientPreviewCss({
      seed: 123,
      colors: ['#ff0000', '#00ff00', '#0000ff'],
      intensity: 0.9,
      angleDeg: 90,
      baseMode: 'dark',
    });

    expect(a).toBe(b);
    expect(a).toContain('linear-gradient(');
    expect(a).toContain('radial-gradient(');
  });

  it('changes when seed changes', () => {
    const a = blobGradientPreviewCss({ seed: 1, colors: ['#111111', '#222222'] });
    const b = blobGradientPreviewCss({ seed: 2, colors: ['#111111', '#222222'] });
    expect(a).not.toBe(b);
  });
});
