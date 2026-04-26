// Modal dialog for naming and saving a new preset.
import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppContext } from './AppContext'
import { Button } from '@/components/ui/button'

export default function PresetSaveDialog() {
  const {
    presetNamePromptOpen, setPresetNamePromptOpen,
    presetNameDraft, setPresetNameDraft,
    capturePresetSnapshot,
    setUserPresets, setActivePresetId,
    pushToast,
  } = useAppContext()

  const save = () => {
    const name = presetNameDraft.trim()
    if (!name) return
    const snapshot = capturePresetSnapshot()
    const id = `user-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
    setUserPresets((prev) => [...prev, { id, name, snapshot }])
    setActivePresetId(id)
    pushToast(`Preset saved: ${name}`, { variant: 'success' })
    setPresetNamePromptOpen(false)
  }

  return (
    <AnimatePresence>
    {presetNamePromptOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPresetNamePromptOpen(false)} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="relative rounded-[12px] shadow-[0_8px_30px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,255,255,0.08)] p-5 w-[320px] flex flex-col gap-4 siteshot-panel"
          style={{ backgroundColor: 'rgba(28,28,28,0.95)' }}
        >
          <div className="text-[13px] font-inter font-medium text-white">Save Preset</div>
          <div className="text-[11px] font-inter font-light text-white/50">Give your preset a name to save the current settings.</div>
          <input
            autoFocus
            type="text"
            placeholder="My preset"
            className="w-full h-[36px] bg-[#232323] rounded-[8px] text-[13px] font-inter font-light text-white px-3 border border-white/[0.08] outline-none focus:border-[#307b52] transition-colors placeholder:text-white/25"
            value={presetNameDraft}
            onChange={(e) => setPresetNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save()
              if (e.key === 'Escape') setPresetNamePromptOpen(false)
            }}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-[32px] px-4 text-[12px] font-inter font-light text-white/70 hover:bg-white/[0.06] hover:text-white/90 rounded-[8px]"
              onClick={() => setPresetNamePromptOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-[32px] px-4 text-[12px] font-inter font-medium text-white rounded-[8px] bg-[#307b52] hover:bg-[#256642] disabled:opacity-40"
              disabled={!presetNameDraft.trim()}
              onClick={save}
            >
              Save
            </Button>
          </div>
        </motion.div>
      </motion.div>
    )}
    </AnimatePresence>
  )
}


