import { describe, expect, it } from 'vitest';

import {
  getCardShadowPresentationKind,
  getExportBackgroundFrameRadiusPx,
  isExportPresentationReady,
} from '../../../ui/src/utils/export/exportPresentation';

describe('export presentation helpers', () => {
  it('keeps preview frame radius but removes it for export', () => {
    expect(getExportBackgroundFrameRadiusPx({ isExporting: false, previewRadiusPx: 26 })).toBe(26);
    expect(getExportBackgroundFrameRadiusPx({ isExporting: true, previewRadiusPx: 26 })).toBe(0);
  });

  it('uses box-shadow in preview and drop-shadow in export when available', () => {
    const shadowStyles = {
      boxShadow: '0px 10px 30px 0px rgba(0, 0, 0, 0.5)',
      filter: 'drop-shadow(0px 10px 30px rgba(0, 0, 0, 0.5))',
    };

    expect(getCardShadowPresentationKind({ isExporting: false, shadowStyles })).toBe('box-shadow');
    expect(getCardShadowPresentationKind({ isExporting: true, shadowStyles })).toBe('drop-shadow');
  });

  it('treats no-shadow exports as ready when the frame is flattened', () => {
    expect(
      isExportPresentationReady({
        isExporting: true,
        shadowKind: 'none',
        backgroundFrameRadiusPx: 0,
      })
    ).toBe(true);
  });

  it('blocks export readiness until shadow mode and frame radius are correct', () => {
    expect(
      isExportPresentationReady({
        isExporting: true,
        shadowKind: 'box-shadow',
        backgroundFrameRadiusPx: 0,
      })
    ).toBe(false);

    expect(
      isExportPresentationReady({
        isExporting: true,
        shadowKind: 'drop-shadow',
        backgroundFrameRadiusPx: 26,
      })
    ).toBe(false);
  });
});