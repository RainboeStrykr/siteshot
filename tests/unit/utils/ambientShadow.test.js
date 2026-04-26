import { test, expect } from 'vitest';
import { createSafeOptions } from '../ui/src/utils/core/editorOptions';

test('createSafeOptions preserves Ambient shadow', () => {
  const safe = createSafeOptions({ shadow: 'Ambient' }, true);
  expect(safe.shadow).toBe('Ambient');
  expect(safe.advancedShadow?.enabled).toBe(false);
});

