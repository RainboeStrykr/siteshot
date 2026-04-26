/**
 * Computes effective positive padding in pixels.
 *
 * For auto aspect, padding should remain uniform on all sides and match
 * the configured value directly (no longest-axis scaling).
 */
export const computeEffectivePaddingPx = ({
  paddingPx,
} = {}) => {
  const base = Math.max(0, Math.round(Number(paddingPx) || 0));
  return base;
};
