import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ResetIcon } from '@/assets/icons.jsx';
import { HelpTip } from '@/assets/HelpTip';
import { useI18n } from './I18nContext';
import { clamp } from '@/utils/core/math.js';

export const SliderField = ({
  label,
  icon,
  value = 0,
  min = 0,
  max = 100,
  step = 1,
  formatValue = (val) => val,
  help,
  onChange,
}) => {
  const safeMin = Number(min);
  const safeMax = Number(max);
  const range = safeMax - safeMin || 1;
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  const percent = Math.min(100, Math.max(0, ((numericValue - safeMin) / range) * 100));
  const percentStr = `${percent}%`;
  const trackStyle = { '--slider-fill': percentStr };

  return (
    <div className="slider-field">
      <div className="slider-field__header">
        <span className="inline-flex items-center gap-2">
          <span>{label}</span>
          {help ? <HelpTip text={help} /> : null}
        </span>
        <span>{formatValue(numericValue)}</span>
      </div>
      <div className={icon ? 'slider-field__row' : undefined}>
        {icon ? (
          <div className="slider-field__icon" aria-hidden="true">
            {icon}
          </div>
        ) : null}
        <input
          type="range"
          min={safeMin}
          max={safeMax}
          step={step}
          value={numericValue}
          onChange={(e) => onChange?.(parseFloat(e.target.value))}
          className={icon ? 'slider-field__input cc-slider' : 'slider-field__input'}
          style={trackStyle}
        />
      </div>
    </div>
  );
};

export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia(query);
    const onChange = () => setMatches(!!media.matches);
    onChange();
    try {
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    } catch {
      // Safari < 14
      media.addListener(onChange);
      return () => media.removeListener(onChange);
    }
  }, [query]);
  return matches;
};

export const PositionPad = ({
  x,
  y,
  minX = -200,
  maxX = 200,
  minY = -200,
  maxY = 200,
  step = 1,
  onReset,
  onChange,
}) => {
  const { t } = useI18n();
  const padRef = useRef(null);

  const snapToStep = (val) => Math.round(val / step) * step;

  const updateFromPointer = useCallback(
    (clientX, clientY) => {
      const el = padRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = clamp((clientX - rect.left) / rect.width, 0, 1);
      const py = clamp((clientY - rect.top) / rect.height, 0, 1);

      const rawX = minX + px * (maxX - minX);
      const rawY = minY + py * (maxY - minY);

      let nextX = snapToStep(rawX);
      let nextY = snapToStep(rawY);

      if (Math.abs(nextX) < 5) nextX = 0;
      if (Math.abs(nextY) < 5) nextY = 0;

      onChange?.({ x: nextX, y: nextY });
    },
    [maxX, maxY, minX, minY, onChange, step]
  );

  const onPointerDown = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    updateFromPointer(e.clientX, e.clientY);
  };

  const onPointerMove = (e) => {
    if (!(e.buttons & 1)) return;
    updateFromPointer(e.clientX, e.clientY);
  };

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const px = clamp(((x - minX) / rangeX) * 100, 0, 100);
  const py = clamp(((y - minY) / rangeY) * 100, 0, 100);

  return (
    <div className="position-pad">
      <div className="position-pad__header">
        <span>{t('position')}</span>
        <span className="position-pad__meta">
          <span>{t('positionXY', { x: Math.round(x), y: Math.round(y) })}</span>
          {onReset ? (
            <button
              type="button"
              className="position-pad__reset"
              onClick={onReset}
              title={t('resetPosition')}
              aria-label={t('resetPosition')}
            >
              <span className="position-pad__resetIcon" aria-hidden="true">
                <ResetIcon />
              </span>
            </button>
          ) : null}
        </span>
      </div>
      <div
        ref={padRef}
        className="position-pad__surface"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        role="application"
        aria-label={t('positionControl')}
      >
        <div className="position-pad__crosshair position-pad__crosshair--h" />
        <div className="position-pad__crosshair position-pad__crosshair--v" />
        <div className="position-pad__dot" style={{ left: `${px}%`, top: `${py}%` }} />
      </div>
    </div>
  );
};

