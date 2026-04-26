import { useCallback, useEffect, useState } from 'react'
import { defaultShortcuts } from '@/utils/platform/preferences'
import { analyzeShortcuts, normalizeShortcuts } from '../utils/platform/shortcuts'
import { comboFromKeyboardEvent, formatComboForDisplay, isTypingContext, isValidCombo, normalizeCombo } from '@/utils/platform/keybinds'
import { getJson, setJson } from '../utils/platform/safeStorage'

/**
 * Manages keyboard shortcuts state and their effects.
 */
export function useShortcuts({ copyOutput, saveOutput, pushToast }) {
  const [shortcuts, setShortcuts] = useState(() => normalizeShortcuts(getJson('settings.shortcuts', defaultShortcuts)))
  const [shortcutRecordingKey, setShortcutRecordingKey] = useState(null)

  // Listen for shortcut key recording
  useEffect(() => {
    if (!shortcutRecordingKey) return

    const onKeyDown = async (event) => {
      try {
        event.preventDefault()
        event.stopPropagation()
      } catch {}

      const key = String(event?.key || '').toLowerCase()
      if (key === 'escape') {
        setShortcutRecordingKey(null)
        return
      }

      const combo = normalizeCombo(comboFromKeyboardEvent(event))
      if (!combo || !isValidCombo(combo)) {
        pushToast('Use a valid shortcut combination', { variant: 'error', durationMs: 2600 })
        return
      }

      const nextShortcuts = normalizeShortcuts({ ...shortcuts, [shortcutRecordingKey]: combo })
      const analysis = analyzeShortcuts(nextShortcuts)
      const hasInvalid = Boolean(analysis?.invalid?.[shortcutRecordingKey])
      const hasConflict = Boolean(analysis?.conflicts?.[shortcutRecordingKey])
      if (hasInvalid || hasConflict) {
        pushToast('Shortcut conflicts with an existing one', { variant: 'error', durationMs: 3200 })
        return
      }

      setShortcuts(nextShortcuts)
      try { setJson('settings.shortcuts', nextShortcuts) } catch {}

      try {
        window.dispatchEvent(new CustomEvent('shortcuts:updated', { detail: nextShortcuts }))
      } catch {}

      setShortcutRecordingKey(null)
      pushToast('Shortcut updated', { variant: 'success', durationMs: 2200 })
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [shortcutRecordingKey, shortcuts, pushToast])

  const formatShortcutLabel = useCallback((combo) => {
    const normalized = normalizeCombo(combo)
    if (!normalized) return 'Unassigned'
    const platform = (typeof window !== 'undefined' && window?.platform) ? window.platform : null
    return formatComboForDisplay(normalized, { platform, useSymbols: true }) || normalized
  }, [])

  // Dispatch global keyboard shortcuts (copy / save)
  useEffect(() => {
    const analysis = analyzeShortcuts(shortcuts)
    const conflictSet = new Set(Object.keys(analysis.conflicts || {}))

    const handleShortcuts = (e) => {
      if (isTypingContext()) return
      const combo = normalizeCombo(comboFromKeyboardEvent(e))
      if (!combo) return

      const copyCombo = normalizeCombo(shortcuts?.copy || defaultShortcuts.copy)
      const saveCombo = normalizeCombo(shortcuts?.save || defaultShortcuts.save)

      if (!conflictSet.has('copy') && combo === copyCombo) {
        e.preventDefault()
        void copyOutput()
        return
      }
      if (!conflictSet.has('save') && combo === saveCombo) {
        e.preventDefault()
        void saveOutput()
      }
    }

    window.addEventListener('keydown', handleShortcuts)
    return () => window.removeEventListener('keydown', handleShortcuts)
  }, [shortcuts, copyOutput, saveOutput])

  return { shortcuts, setShortcuts, shortcutRecordingKey, setShortcutRecordingKey, formatShortcutLabel }
}

