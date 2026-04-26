export const computeObjectContainRect = ({
  containerLeft,
  containerTop,
  containerWidth,
  containerHeight,
  naturalWidth,
  naturalHeight,
} = {}) => {
  const cw = Number(containerWidth) || 0;
  const ch = Number(containerHeight) || 0;
  const nw = Number(naturalWidth) || 0;
  const nh = Number(naturalHeight) || 0;

  if (cw <= 0 || ch <= 0) return null;
  if (nw <= 0 || nh <= 0) {
    // Fallback: treat as fully covering container.
    return {
      left: Number(containerLeft) || 0,
      top: Number(containerTop) || 0,
      width: cw,
      height: ch,
      right: (Number(containerLeft) || 0) + cw,
      bottom: (Number(containerTop) || 0) + ch,
    };
  }

  const scale = Math.min(cw / nw, ch / nh);
  const rw = nw * scale;
  const rh = nh * scale;

  const left = (Number(containerLeft) || 0) + (cw - rw) / 2;
  const top = (Number(containerTop) || 0) + (ch - rh) / 2;

  return {
    left,
    top,
    width: rw,
    height: rh,
    right: left + rw,
    bottom: top + rh,
  };
};
