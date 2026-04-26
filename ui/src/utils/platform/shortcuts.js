import { isValidCombo, normalizeCombo } from './keybinds';

const isWindows = typeof navigator !== 'undefined' && /Win/.test(navigator.platform);
const primaryMod = isWindows ? 'Ctrl' : 'Meta';

export const defaultShortcuts = {
  copy: `${primaryMod}+C`,
  save: `${primaryMod}+S`,
  saveToFolder: `${primaryMod}+Shift+S`,
  screenshotRegion: `${primaryMod}+Shift+8`,
  screenshotRegionCopy: `${primaryMod}+Shift+9`,
};

const hasNonShiftModifier = (combo) => {
  const normalized = normalizeCombo(combo);
  if (!normalized) return false;
  const parts = normalized.split('+').filter(Boolean);
  return parts.includes('Meta') || parts.includes('Ctrl') || parts.includes('Alt');
};

export const SHORTCUT_FIELDS = [
  { key: 'copy', label: 'Copy', scope: 'app' },
  { key: 'save', label: 'Export', scope: 'app' },
  { key: 'saveToFolder', label: 'Save to folder', scope: 'app' },
  { key: 'screenshotRegion', label: 'Region Screenshot', scope: 'global' },
  { key: 'screenshotRegionCopy', label: 'Region Screenshot + Copy Output', scope: 'global' },
];

export const normalizeShortcuts = (shortcuts) => {
  const source = shortcuts && typeof shortcuts === 'object' ? shortcuts : {};
  const merged = { ...defaultShortcuts, ...source };
  const out = {};

  for (const field of SHORTCUT_FIELDS) {
    const raw = merged[field.key];
    out[field.key] = raw ? normalizeCombo(String(raw)) : '';
  }

  return out;
};

export const analyzeShortcuts = (shortcuts) => {
  const normalized = normalizeShortcuts(shortcuts);

  const invalid = {};
  const byCombo = new Map();

  for (const field of SHORTCUT_FIELDS) {
    const combo = normalized[field.key];
    if (!combo) continue;

    if (!isValidCombo(combo)) {
      invalid[field.key] = 'Invalid shortcut';
      continue;
    }

    // Global shortcuts (macOS screenshot triggers) must have a real modifier.
    // Desktop global shortcut registration typically won't register bare letter keys.
    if (field.scope === 'global' && !hasNonShiftModifier(combo)) {
      invalid[field.key] = 'Global shortcuts must include Cmd/Ctrl/Alt.';
      continue;
    }

    const list = byCombo.get(combo) || [];
    list.push(field.key);
    byCombo.set(combo, list);
  }

  const conflicts = {};
  for (const [combo, keys] of byCombo.entries()) {
    if (keys.length > 1) {
      for (const k of keys) conflicts[k] = combo;
    }
  }

  return {
    normalized,
    invalid,
    conflicts,
    hasIssues: Object.keys(invalid).length > 0 || Object.keys(conflicts).length > 0,
  };
};
