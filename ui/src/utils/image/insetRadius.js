const toFiniteNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const computeInsetContentRadiusPx = ({ screenshotRadiusPx = 0, insetScale = 1 } = {}) => {
  const outerRadius = Math.max(0, toFiniteNumber(screenshotRadiusPx, 0));
  const scale = toFiniteNumber(insetScale, 1);
  const clampedScale = Math.max(0, Math.min(1, scale));
  return outerRadius * clampedScale;
};
