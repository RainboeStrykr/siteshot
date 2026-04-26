import React from 'react';

const WindowsControlIcon = ({ variant, size = 14 }) => {
  const px = Math.max(10, Math.min(28, Number(size) || 14));
  const sizeStyle = { width: px, height: px, display: 'block' };
  switch (variant) {
    case 'minimize':
      return (
        <svg viewBox="0 0 12 12" style={sizeStyle} aria-hidden="true" focusable="false">
          <rect x="2" y="6" width="8" height="1.25" fill="currentColor" rx="0.75" />
        </svg>
      );
    case 'maximize':
      return (
        <svg viewBox="0 0 12 12" style={sizeStyle} aria-hidden="true" focusable="false">
          <rect x="2.25" y="2.25" width="7.5" height="7.5" fill="none" stroke="currentColor" strokeWidth="1.1" rx="0.65" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 12 12" style={sizeStyle} aria-hidden="true" focusable="false">
          <path d="M3 3l6 6M9 3 3 9" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        </svg>
      );
  }
};

export default WindowsControlIcon;