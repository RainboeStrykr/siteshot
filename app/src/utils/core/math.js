/**
 * Shared math utilities.
 * Consolidated from 14 duplicate definitions across the codebase.
 */

/** Clamp `value` between `min` and `max` (inclusive). */
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
