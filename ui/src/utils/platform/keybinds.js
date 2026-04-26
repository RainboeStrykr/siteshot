const MOD_ORDER = ['Meta', 'Ctrl', 'Alt', 'Shift'];
const MOD_SET = new Set(MOD_ORDER);

export const normalizeKey = (key) => {
  if (!key) return null;
  if (key === ' ') return 'Space';
  if (key.length === 1) return key.toUpperCase();
  if (key === 'Control') return 'Ctrl';
  if (key === 'Escape') return 'Esc';
  return key;
};

export const normalizeCombo = (combo) => {
  if (!combo || typeof combo !== 'string') return '';
  const raw = combo
    .split('+')
    .map((p) => (p || '').trim())
    .filter(Boolean);

  const mods = new Set();
  let key = null;

  for (const part of raw) {
    const p = part === 'Control' ? 'Ctrl' : part;
    if (MOD_SET.has(p)) {
      mods.add(p);
      continue;
    }
    if (!key) key = normalizeKey(p);
  }

  const ordered = MOD_ORDER.filter((m) => mods.has(m));
  if (key) ordered.push(key);
  return ordered.join('+');
};

export const comboFromKeyboardEvent = (e) => {
  if (!e) return '';
  const parts = [];
  if (e.metaKey) parts.push('Meta');
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');

  // Prefer physical digit keys for shortcuts like Meta+Shift+8.
  // On many layouts, Shift+8 reports e.key='*', which would never match '8'.
  let rawKey = e.key;
  const code = e.code;
  if (typeof code === 'string') {
    if (/^Digit\d$/.test(code)) rawKey = code.replace('Digit', '');
    if (/^Numpad\d$/.test(code)) rawKey = code.replace('Numpad', '');
  }

  const k = normalizeKey(rawKey);
  if (!k) return '';
  if (k === 'Meta' || k === 'Ctrl' || k === 'Alt' || k === 'Shift' || k === 'Control') {
    return normalizeCombo(parts.join('+'));
  }
  if (k !== 'Meta' && k !== 'Ctrl' && k !== 'Alt' && k !== 'Shift') {
    parts.push(k);
  }
  return normalizeCombo(parts.join('+'));
};

export const isEditableElement = (el) => {
  if (!el) return false;
  const tag = (el.tagName || '').toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
};

export const isTypingContext = () => {
  if (typeof document === 'undefined') return false;
  return isEditableElement(document.activeElement);
};

export const isValidCombo = (combo) => {
  const normalized = normalizeCombo(combo);
  if (!normalized) return false;
  const parts = normalized.split('+');
  const nonMods = parts.filter((p) => !MOD_SET.has(p));
  return nonMods.length === 1;
};

export const formatComboForDisplay = (combo, opts = {}) => {
  const normalized = normalizeCombo(combo);
  if (!normalized) return '';

  const platform = opts.platform || (typeof window !== 'undefined' ? window.platform : null);
  const isMac = !!platform?.isMac;
  const useSymbols = opts.useSymbols !== false;

  const parts = normalized.split('+').filter(Boolean);
  const mapped = parts.map((p) => {
    if (p === 'Meta') {
      if (isMac) return useSymbols ? '⌘' : 'Cmd';
      return useSymbols ? 'Ctrl' : 'Ctrl';
    }
    if (p === 'Ctrl') return useSymbols ? (isMac ? '⌃' : 'Ctrl') : 'Ctrl';
    if (p === 'Alt') return useSymbols ? (isMac ? '⌥' : 'Alt') : 'Alt';
    if (p === 'Shift') return useSymbols ? '⇧' : 'Shift';
    if (p === 'Esc') return useSymbols ? '⎋' : 'Esc';
    if (p === 'Enter') return useSymbols ? '↩' : 'Enter';
    if (p === 'Backspace') return useSymbols ? '⌫' : 'Backspace';
    if (p === 'Space') return useSymbols ? 'Space' : 'Space';
    return p;
  });

  // If we used symbols, don't add plus signs between modifier glyphs.
  if (useSymbols) {
    const mods = mapped.slice(0, mapped.length - 1);
    const key = mapped[mapped.length - 1];
    if (mods.length === 0) return String(key || '');
    return `${mods.join('')}${key ? ' ' + key : ''}`.trim();
  }

  return mapped.join('+');
};
