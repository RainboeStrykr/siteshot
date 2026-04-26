import { describe, expect, test } from 'vitest';

import { normalizeBrowserBarValue } from '../ui/src/utils/core/editorOptions';

describe('editorOptions.normalizeBrowserBarValue', () => {
	test('normalizes legacy aliases', () => {
		expect(normalizeBrowserBarValue('light')).toBe('mac-light');
		expect(normalizeBrowserBarValue('dark')).toBe('mac-dark');
		expect(normalizeBrowserBarValue('windows')).toBe('windows-dark');
		expect(normalizeBrowserBarValue('safari')).toBe('safari-dark');
	});

	test('passes through known values', () => {
		expect(normalizeBrowserBarValue('mac-light')).toBe('mac-light');
		expect(normalizeBrowserBarValue('mac-dark')).toBe('mac-dark');
		expect(normalizeBrowserBarValue('windows-light')).toBe('windows-light');
		expect(normalizeBrowserBarValue('windows-dark')).toBe('windows-dark');
		expect(normalizeBrowserBarValue('safari-dark')).toBe('safari-dark');
		expect(normalizeBrowserBarValue('hidden')).toBe('hidden');
	});

	test('coerces non-string values to hidden', () => {
		expect(normalizeBrowserBarValue(null)).toBe('hidden');
		expect(normalizeBrowserBarValue(undefined)).toBe('hidden');
		expect(normalizeBrowserBarValue({ value: 'mac-dark' })).toBe('hidden');
		expect(normalizeBrowserBarValue(true)).toBe('hidden');
		expect(normalizeBrowserBarValue(123)).toBe('hidden');
	});
});

