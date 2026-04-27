import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ResetIcon } from '@/assets/icons.jsx';
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
        <span>{label}</span>
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
