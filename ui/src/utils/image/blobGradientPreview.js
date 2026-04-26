import { clamp } from '../core/math';
import { mulberry32, parseCssColorCached, toCanvasRgba as toCssRgba } from '../color/color';

const canvasAngleDegToCssAngleDeg = (angleDeg) => {
  const a = Number(angleDeg) || 0;
  const css = a + 90;
  return ((css % 360) + 360) % 360;
};

/**
 * Generates a CSS `background-image` string approximating our blob gradient look.
 * Used for fast previews (avoids canvas rendering).
 */
export const blobGradientPreviewCss = (config = {}) => {
  const cfg = config && typeof config === 'object' ? config : {};
  const baseMode = String(cfg.baseMode || cfg.base || 'dark');
  const baseA = String(cfg.baseA || cfg.baseColorA || (baseMode === 'light' ? '#ffffff' : '#05060A'));
  const baseB = String(cfg.baseB || cfg.baseColorB || (baseMode === 'light' ? '#f3f4f6' : '#111827'));
  const angleDeg = Number.isFinite(Number(cfg.angleDeg)) ? Number(cfg.angleDeg) : 135;
  const cssAngleDeg = canvasAngleDegToCssAngleDeg(angleDeg);

  const colors = (Array.isArray(cfg.colors) ? cfg.colors : []).filter(Boolean);
  const seed = Number.isFinite(Number(cfg.seed)) ? Number(cfg.seed) : 1;
  const intensity = clamp(Number(cfg.intensity) || 0.85, 0, 1);

  const blobCount = clamp(
    Number.isFinite(Number(cfg.blobCount)) ? Number(cfg.blobCount) : (baseMode === 'light' ? 6 : 7),
    3,
    10
  );

  const rand = mulberry32(seed);
  const pick = (i, fallback) => String(colors[i % Math.max(1, colors.length)] || fallback);

  const a0 = baseMode === 'light' ? intensity * 0.30 : intensity * 0.70;
  const a1 = baseMode === 'light' ? intensity * 0.18 : intensity * 0.42;

  // Two lobes per blob gives closer "blobby" variation without being too heavy.
  const lobesPerBlob = 2;
  const blobs = [];
  for (let i = 0; i < blobCount; i++) {
    for (let j = 0; j < lobesPerBlob; j++) {
      const x = Math.round(6 + rand() * 88);
      const y = Math.round(6 + rand() * 88);
      const stop = Math.round(42 + rand() * 30);
      const col = pick(i + j, i % 2 ? '#ec4899' : '#8b5cf6');
      const alpha = (i === 0 ? a0 : a1) * (j === 0 ? 1 : 0.55);
      blobs.push(
        `radial-gradient(circle at ${x}% ${y}%, ${toCssRgba(col, alpha)} 0%, ${toCssRgba(col, 0)} ${stop}%)`
      );
    }
  }

  const base = `linear-gradient(${cssAngleDeg}deg, ${baseA}, ${baseB})`;
  return [base, ...blobs].join(', ');
};
