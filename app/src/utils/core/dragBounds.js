export function clampTransformToContainer(
  transform,
  { containerWidth, containerHeight, cardWidth, cardHeight, overflowX = 0, overflowY = 0 }
) {
  const x = Number(transform?.x) || 0;
  const y = Number(transform?.y) || 0;

  const cw = Number(containerWidth) || 0;
  const ch = Number(containerHeight) || 0;
  const iw = Number(cardWidth) || 0;
  const ih = Number(cardHeight) || 0;

  if (cw <= 0 || ch <= 0 || iw <= 0 || ih <= 0) {
    return { x, y };
  }

  const extraX = Math.max(0, Number(overflowX) || 0);
  const extraY = Math.max(0, Number(overflowY) || 0);

  const maxX = Math.max(0, (cw - iw) / 2 + extraX);
  const maxY = Math.max(0, (ch - ih) / 2 + extraY);

  const clampedX = Math.max(-maxX, Math.min(x, maxX));
  const clampedY = Math.max(-maxY, Math.min(y, maxY));

  // Avoid surprising `-0` values (can show up in strict equality tests and UI).
  const nx = Object.is(clampedX, -0) ? 0 : clampedX;
  const ny = Object.is(clampedY, -0) ? 0 : clampedY;

  return { x: nx, y: ny };
}
