import { useAppContext } from './AppContext'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function PresetSelectorTopRight() {
  const {
    isWindows,
    activePresetId, setActivePresetId,
    userPresets,
    presetDropdownRef,
    applyDefaultPreset, applyPresetSnapshot,
    setPresetNameDraft, setPresetNamePromptOpen,
  } = useAppContext()

  const handleChange = (val) => {
    if (val === '__save_new__') {
      setPresetNameDraft('')
      setPresetNamePromptOpen(true)
      return
    }
    setActivePresetId(val)
    if (val === 'default') applyDefaultPreset()
    else if (val !== 'current') {
      const preset = userPresets.find((p) => p.id === val)
      if (preset) applyPresetSnapshot(preset.snapshot)
    }
  }

  const currentLabel =
    activePresetId === 'default' ? 'Default'
    : activePresetId === 'current' ? 'Current'
    : (userPresets.find((p) => p.id === activePresetId)?.name || 'Default')

  return (
    <div
      ref={presetDropdownRef}
      className="absolute top-4 window-no-drag z-40"
      style={{ right: isWindows ? 108 : 16 }}
    >
      <Select value={activePresetId} onValueChange={handleChange}>
        <SelectTrigger
          className="w-[124px] h-[34px] bg-[#2C2C2C] border-none text-[13px] font-inter font-light text-white rounded-[10px] px-3 gap-1.5 focus:ring-0 focus:ring-offset-0 hover:bg-[#3a3a3a] transition-colors"
          aria-label="Preset selector"
        >
          <SelectValue placeholder={currentLabel}>
            <span className="truncate">{currentLabel}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          className="min-w-[160px] rounded-[10px] border-white/10"
          style={{
            background: 'var(--editor-pill-bg)',
            color: 'var(--app-fg)',
            boxShadow: 'var(--editor-pill-shadow)',
          }}
        >
          <SelectItem
            value="default"
            className="text-[13px] font-inter font-light focus:bg-white/10 cursor-pointer"
          >
            Default
          </SelectItem>
          <SelectItem
            value="current"
            className="text-[13px] font-inter font-light focus:bg-white/10 cursor-pointer"
          >
            Current
          </SelectItem>

          {userPresets.length > 0 && (
            <>
              <SelectSeparator className="bg-white/10" />
              {userPresets.map((p) => (
                <SelectItem
                  key={p.id}
                  value={p.id}
                  className="text-[13px] font-inter font-light focus:bg-white/10 cursor-pointer"
                >
                  {p.name}
                </SelectItem>
              ))}
            </>
          )}

          <SelectSeparator className="bg-white/10" />
          <SelectItem
            value="__save_new__"
            className="text-[13px] font-inter font-light text-[#307b52] focus:bg-white/10 focus:text-[#256642] cursor-pointer"
          >
            Save current as preset…
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

