import React from 'react';

import { clamp } from '@/utils/core/math';

const ICON_COLOR = '#A3A3A3';

const ChevronLeftIcon = ({ size }) => (
  <svg viewBox="0 0 12 12" width={size} height={size} aria-hidden="true">
    <path d="M7.8 2.2 4 6l3.8 3.8" fill="none" stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronRightIcon = ({ size }) => (
  <svg viewBox="0 0 12 12" width={size} height={size} aria-hidden="true">
    <path d="M4.2 2.2 8 6 4.2 9.8" fill="none" stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PlusIcon = ({ size }) => (
  <svg viewBox="0 0 12 12" width={size} height={size} aria-hidden="true">
    <path d="M6 2.2v7.6M2.2 6h7.6" fill="none" stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const CopyIcon = ({ size }) => (
  <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
    <rect x="5.2" y="5.2" width="7" height="7" rx="1.7" fill="none" stroke={ICON_COLOR} strokeWidth="1.35" />
    <path d="M10.2 5.2V4.5a1.7 1.7 0 0 0-1.7-1.7H4.5A1.7 1.7 0 0 0 2.8 4.5v4a1.7 1.7 0 0 0 1.7 1.7h.7" fill="none" stroke={ICON_COLOR} strokeWidth="1.35" strokeLinecap="round" />
  </svg>
);

const ShareIcon = ({ size }) => (
  <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
    <path d="M8 2.8v7.4" fill="none" stroke={ICON_COLOR} strokeWidth="1.4" strokeLinecap="round" />
    <path d="M5.6 5.2 8 2.8l2.4 2.4" fill="none" stroke={ICON_COLOR} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="3.2" y="9" width="9.6" height="4" rx="1.6" fill="none" stroke={ICON_COLOR} strokeWidth="1.25" />
  </svg>
);

export function Safari({ url = '', className = '', enableControls = true, uiScale = 1 }) {
  const scale = clamp(Number(uiScale) || 1, 0.5, 2);
  const lightsSize = Math.max(6, Math.round(12 * scale));
  const lightsGap = Math.max(4, Math.round(8 * scale));
  const leftPad = Math.max(10, Math.round(20 * scale));
  const rightPad = Math.max(10, Math.round(20 * scale));
  const navGap = Math.max(8, Math.round(14 * scale));
  const navSize = Math.max(12, Math.round(18 * scale));
  const addressMaxWidth = Math.round(660 * scale);
  const addressMinHeight = Math.max(24, Math.round(34 * scale));
  const addressRadius = Math.max(8, Math.round(9 * scale));
  const addressTextSize = Math.max(12, Math.round(42 * scale) / 3);
  const addressLockSize = Math.max(12, Math.round(14 * scale));
  const rightGap = Math.max(8, Math.round(12 * scale));
  const rightIconSize = Math.max(13, Math.round(16 * scale));

  return (
    <div
      className={className || 'w-full h-full'}
      role="img"
      aria-label="Safari browser bar"
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        backgroundColor: '#262626',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: Math.max(8, Math.round(16 * scale)),
          paddingLeft: leftPad,
          paddingRight: rightPad,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: lightsGap }}>
          <span style={{ width: lightsSize, height: lightsSize, borderRadius: 9999, backgroundColor: enableControls ? '#E7685D' : '#404040' }} />
          <span style={{ width: lightsSize, height: lightsSize, borderRadius: 9999, backgroundColor: enableControls ? '#F0BF4C' : '#404040' }} />
          <span style={{ width: lightsSize, height: lightsSize, borderRadius: 9999, backgroundColor: enableControls ? '#67C653' : '#404040' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: navGap, color: ICON_COLOR }}>
          <ChevronLeftIcon size={navSize} />
          <ChevronRightIcon size={navSize} />
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', minWidth: 0 }}>
          <div
            style={{
              width: '100%',
              maxWidth: addressMaxWidth,
              minHeight: addressMinHeight,
              borderRadius: addressRadius,
              backgroundColor: '#404040',
              color: ICON_COLOR,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: Math.max(6, Math.round(8 * scale)),
              padding: `${Math.max(4, Math.round(6 * scale))}px ${Math.max(10, Math.round(14 * scale))}px`,
              boxSizing: 'border-box',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <svg viewBox="0 0 12 12" width={addressLockSize} height={addressLockSize} aria-hidden="true">
              <path d="M3.5 5.4h5v3.4a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V5.4Zm1.2 0V4.2a1.3 1.3 0 0 1 2.6 0v1.2" fill="none" stroke={ICON_COLOR} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: addressTextSize, lineHeight: 1 }}>{url}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: rightGap, color: ICON_COLOR }}>
          <ShareIcon size={rightIconSize} />
          <CopyIcon size={rightIconSize} />
          <PlusIcon size={rightIconSize} />
        </div>
      </div>
    </div>
  );
}

export default Safari;

