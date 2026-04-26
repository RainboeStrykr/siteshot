import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations, supported } from '@/utils/core/i18nStrings';

const STORAGE_KEY = 'settings.language';

const normalizeLang = (raw) => {
  const s = String(raw || '').trim();
  if (!s) return 'en';
  const lower = s.toLowerCase();
  if (lower.startsWith('zh')) {
    if (lower.includes('hant') || lower.includes('tw') || lower.includes('hk') || lower.includes('mo')) return 'zh-Hant';
    return 'zh-Hans';
  }
  if (lower.startsWith('ko')) return 'ko';
  if (lower.startsWith('fr')) return 'fr';
  if (lower.startsWith('hi')) return 'hi';
  if (lower.startsWith('es')) return 'es';
  return 'en';
};

const I18nContext = createContext({
  lang: 'en',
  setLang: (_l) => {},
  t: (k) => String(k),
  supported,
});

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState('en');

  useEffect(() => {
    // SSR-safe: initialize to English, then update after mount.
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setLangState(normalizeLang(saved));
        return;
      }
    } catch {}

    try {
      const nav = typeof navigator !== 'undefined' ? (navigator.language || '') : '';
      setLangState(normalizeLang(nav));
    } catch {}
  }, []);

  const setLang = useCallback((next) => {
    const normalized = normalizeLang(next);
    setLangState(normalized);
    try { localStorage.setItem(STORAGE_KEY, normalized); } catch {}
  }, []);

  const dict = useMemo(() => translations[lang] || translations.en, [lang]);

  const t = useCallback((key, vars) => {
    const k = String(key || '');
    if (!k) return '';
    const raw = dict[k] || translations.en[k] || k;
    if (!vars || typeof raw !== 'string') return raw;
    return raw.replace(/\{(\w+)\}/g, (_m, name) => {
      const v = vars[name];
      return v === undefined || v === null ? `{${name}}` : String(v);
    });
  }, [dict]);

  const value = useMemo(() => ({ lang, setLang, t, supported }), [lang, setLang, t]);

  return React.createElement(I18nContext.Provider, { value }, children);
}

export function useI18n() {
  return useContext(I18nContext);
}

