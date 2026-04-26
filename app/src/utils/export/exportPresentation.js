export const getExportBackgroundFrameRadiusPx = ({ isExporting, previewRadiusPx }) => {
  const radius = Math.max(0, Number(previewRadiusPx) || 0);
  return isExporting ? 0 : radius;
};

export const getCardShadowPresentationKind = ({ isExporting, shadowStyles }) => {
  const boxShadow = String(shadowStyles?.boxShadow || 'none').trim().toLowerCase();
  const filter = String(shadowStyles?.filter || 'none').trim().toLowerCase();

  if (isExporting) {
    return filter !== 'none' && filter.includes('drop-shadow(') ? 'drop-shadow' : 'none';
  }

  return boxShadow !== 'none' ? 'box-shadow' : 'none';
};

export const isExportPresentationReady = ({ isExporting, shadowKind, backgroundFrameRadiusPx }) => {
  if (!isExporting) return true;

  const normalizedShadowKind = String(shadowKind || 'none').trim().toLowerCase();
  const normalizedRadius = Math.max(0, Number(backgroundFrameRadiusPx) || 0);

  return (normalizedShadowKind === 'drop-shadow' || normalizedShadowKind === 'none') && normalizedRadius === 0;
};