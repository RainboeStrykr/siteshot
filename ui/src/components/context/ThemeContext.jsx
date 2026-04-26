import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getItem, setItem } from '@/utils/platform/safeStorage';

const THEME_STORAGE_KEY = 'settings.theme';

const ThemeContext = createContext(null);

const getSystemTheme = () => {
	try {
		if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'dark';
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	} catch {
		return 'dark';
	}
};

const normalizeTheme = (value) => (value === 'light' ? 'light' : 'dark');

const normalizeThemePreference = (value) => (value === 'system' || value === 'light' || value === 'dark' ? value : null);

const resolveThemeFromPreference = (preference) => {
	if (preference === 'light' || preference === 'dark') return preference;
	return getSystemTheme();
};

export const ThemeProvider = ({ children }) => {
	// IMPORTANT (Next.js SSR): keep the initial render deterministic.
	// Reading localStorage/matchMedia during the state initializer can cause hydration mismatches
	// if the server renders one theme and the client hydrates another.
	// `theme` is the resolved theme actually applied to the DOM.
	const [theme, setThemeState] = useState('dark');
	// `themePreference` is the user's selected mode: 'light' | 'dark' | 'system'.
	const [themePreference, setThemePreferenceState] = useState('dark');

	useEffect(() => {
		const saved = getItem(THEME_STORAGE_KEY, null);
		const pref = normalizeThemePreference(saved) || 'dark';
		setThemePreferenceState(pref);
		const resolved = resolveThemeFromPreference(pref);
		setThemeState((prev) => {
			const normalized = normalizeTheme(resolved);
			return prev === normalized ? prev : normalized;
		});
	}, []);

	useEffect(() => {
		if (themePreference !== 'system') return;
		if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

		const mql = window.matchMedia('(prefers-color-scheme: dark)');
		const update = () => {
			setThemeState((prev) => {
				const next = mql.matches ? 'dark' : 'light';
				return prev === next ? prev : next;
			});
		};

		update();
		if (typeof mql.addEventListener === 'function') {
			mql.addEventListener('change', update);
			return () => mql.removeEventListener('change', update);
		}
		// Safari
		mql.addListener(update);
		return () => mql.removeListener(update);
	}, [themePreference]);

	const setThemePreference = useCallback((next) => {
		const pref = normalizeThemePreference(next) || 'system';
		setThemePreferenceState((prev) => (prev === pref ? prev : pref));
		setItem(THEME_STORAGE_KEY, pref);

		const resolved = resolveThemeFromPreference(pref);
		setThemeState((prev) => {
			const normalized = normalizeTheme(resolved);
			return prev === normalized ? prev : normalized;
		});
	}, []);

	const toggleTheme = useCallback(() => {
		setThemePreferenceState((prevPref) => {
			const base = prevPref === 'system' ? theme : prevPref;
			const next = base === 'dark' ? 'light' : 'dark';
			setItem(THEME_STORAGE_KEY, next);
			setThemeState(next);
			return next;
		});
	}, [theme]);

	useEffect(() => {
		if (typeof document === 'undefined') return;
		const root = document.documentElement;
		if (!root) return;

		root.classList.toggle('dark', theme === 'dark');
		try {
			root.style.colorScheme = theme;
		} catch {
			// ignore
		}
	}, [theme]);

	const value = useMemo(
		// Back-compat: expose setTheme('dark'|'light'|'system') as an alias.
		() => ({ theme, themePreference, setTheme: setThemePreference, setThemePreference, toggleTheme }),
		[theme, themePreference, setThemePreference, toggleTheme]
	);

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
	const ctx = useContext(ThemeContext);
	if (!ctx) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}
	return ctx;
};

