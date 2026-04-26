import React from 'react';

export function Classic({ toggled, onToggle }) {
  return (
    <button
      type="button"
      aria-label="theme-toggle"
      data-toggled={String(!!toggled)}
      onClick={() => onToggle?.()}
    >
      toggle
    </button>
  );
}
