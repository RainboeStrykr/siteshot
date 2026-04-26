import React, { useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { ChevronDown, RotateCcw, Check, ChevronsUpDown } from 'lucide-react'
import { RangeWithTooltip } from '@/components/RangeWithTooltip'
import { useAppContext } from './AppContext'
import { AspectRatioDropdown } from './AppHelpers'
import WallpaperGrid from './WallpaperGrid'
import { isProbablyHexColor, normalizeHexColorInput } from './utils/color/colorInput.js'
import hugShadowThumb from './assets/Hugshadowthumb.png'
import heavyShadowThumb from './assets/Heavyshadowthumb.png'
import ambientShadowThumb from './assets/Ambientshadowthumb.png'
import customShadowThumb from './assets/customshadowthumb.png'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const SLIDER_W = 'w-[128px]'

export default function LeftSidebar() {
  const {
    sidebarScrollRef,
    sidebarIsScrolling,
    uploadWallpaperInputRef,
    onCustomWallpaperPicked,
    triggerUploadCustomWallpaper,
    wallpaperType,
    wallpaperTabs,
    pressedWallpaperTab,
    setPressedWallpaperTab,
    setWallpaperTypeOnClick,
    setWallpaperTypeOnRelease,
    activeWallpaperColor,
    currentWallpaperGroup,
    currentWallpaperTileCount,
    customGradient,
    setCustomGradient,
    backgroundSelection,
    setBackgroundSelection,
    setSelectedSystemWallpaper,
    ratioChoice,
    setRatioChoice,
    customRatio,
    setCustomRatio,
    padding,
    setPadding,
    draggingPadding,
    setDraggingPadding,
    inset,
    setInset,
    draggingInset,
    setDraggingInset,
    autoCropEnabled,
    setAutoCropEnabled,
    selectedShadowStyle,
    setSelectedShadowStyle,
    customShadow,
    setCustomShadow,
    curve,
    setCurve,
    draggingCurve,
    setDraggingCurve,
    border,
    setBorder,
    draggingBorder,
    setDraggingBorder,
    borderColor,
    setBorderColor,
    osMockups,
    selectedOsMockup,
    setSelectedOsMockup,
    safariMockupText,
    setSafariMockupText,
    uiScale,
    setUiScale,
    draggingUiScale,
    setDraggingUiScale,
    watermarkEnabled,
    setWatermarkEnabled,
    watermarkText,
    setWatermarkText,
    watermarkPrefix,
    setWatermarkPrefix,
    watermarkPosition,
    setWatermarkPosition,
    watermarkOffsetX,
    setWatermarkOffsetX,
    watermarkOffsetY,
    setWatermarkOffsetY,
    watermarkShowVerified,
    setWatermarkShowVerified,
    watermarkShowTwitter,
    setWatermarkShowTwitter,
    isAdvancedOpen,
    setIsAdvancedOpen,
    tiltX,
    setTiltX,
    draggingTiltX,
    setDraggingTiltX,
    tiltY,
    setTiltY,
    draggingTiltY,
    setDraggingTiltY,
    rotation,
    setRotation,
    draggingRotation,
    setDraggingRotation,
    transform,
    handleTransformChange,
  } = useAppContext()

  const topPaddingPx = 16
  const [comboboxOpen, setComboboxOpen] = useState(false)
  const [backgroundSelected, setBackgroundSelected] = useState(false)

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      ref={sidebarScrollRef}
      data-siteshot-scroll="sidebar"
      data-scrolling={sidebarIsScrolling ? '1' : '0'}
      className={`absolute left-4 top-4 w-[270px] max-h-[calc(100vh-32px)] rounded-[16px] pb-[24px] px-[20px] text-white flex flex-col shadow-[inset_0_0_0_1px_#1b1f23,0_4px_4px_rgba(0,0,0,0.25)] overflow-y-auto overflow-x-visible select-none window-no-drag siteshot-chrome-panel siteshot-sidebar-scroll siteshot-sidebar ${sidebarIsScrolling ? 'is-scrolling' : ''}`}
      style={{ paddingTop: topPaddingPx }}
    >
      <input
        ref={uploadWallpaperInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onCustomWallpaperPicked}
      />
      <Button
        variant="secondary"
        className="w-full bg-[#2C2C2C] hover:bg-[#383838] rounded-[5px] text-xs font-inter font-light text-white cursor-pointer self-center py-[7px] h-auto"
        onClick={triggerUploadCustomWallpaper}
      >
        Upload custom background
      </Button>

      <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={comboboxOpen}
            aria-label="Select background type"
            className="mt-3 w-full flex items-center justify-between rounded-[8px] bg-[#141414] px-3 py-[7px] text-[11px] font-inter font-light text-white hover:bg-[#1a1a1a] transition-colors border border-white/[0.06]"
          >
            <span>{backgroundSelected ? (wallpaperTabs.find((t) => t.id === wallpaperType)?.label ?? 'Select background') : 'Select background'}</span>
            <ChevronsUpDown className="w-3 h-3 text-white/40 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[230px] p-0 rounded-[10px] border border-white/10 bg-[#1c1c1c]"
          style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}
          align="start"
        >
          <Command className="bg-[#1c1c1c]">
            <CommandList>
              <CommandEmpty className="text-[11px] text-white/40 py-3 text-center">No options.</CommandEmpty>
              <CommandGroup className="p-1">
                {wallpaperTabs.map((t) => (
                  <CommandItem
                    key={t.id}
                    value={t.id}
                    onSelect={() => {
                      setWallpaperTypeOnClick(t.id)
                      setBackgroundSelected(true)
                      setComboboxOpen(false)
                    }}
                    className={cn(
                      'flex items-center justify-between text-[12px] font-inter font-light rounded-[7px] px-3 py-2 cursor-pointer',
                      wallpaperType === t.id
                        ? 'text-white bg-white/10'
                        : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
                    )}
                  >
                    {t.label}
                    {wallpaperType === t.id && (
                      <Check className="w-3.5 h-3.5 text-[#307b52] shrink-0" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <div className="text-xs font-inter font-light text-white mt-3">
        {currentWallpaperGroup.title}
      </div>
      <WallpaperGrid />

      {wallpaperType === 'gradients' && (
        <div className="mt-4">
          <div className="text-xs font-inter font-light text-white mb-2">Background picker</div>
          <div className="flex flex-col gap-2">
            {([
              { key: 'colorStart', label: 'Start' },
              { key: 'colorEnd', label: 'End' },
            ]).map((row) => {
              const current = String(customGradient?.[row.key] || '');
              const normalized = isProbablyHexColor(current) ? normalizeHexColorInput(current) : null;
              const safe = normalized || '#000000';

              return (
                <div key={row.key} className="flex items-center gap-[7px]">
                  <div className="w-[34px] text-[10px] font-inter font-light text-white/70 shrink-0">{row.label}</div>
                  <div className="relative shrink-0">
                    <div
                      className="siteshot-preview-tile w-[25px] h-[25px] rounded-[7px] border border-white/10"
                      style={{ backgroundColor: safe }}
                      title={`${row.label} color`}
                    />
                    <input
                      type="color"
                      aria-label={`${row.label} color picker`}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      value={safe}
                      onChange={(e) => {
                        const next = normalizeHexColorInput(e.target.value);
                        const nextCustom = { ...(customGradient || {}), [row.key]: next };
                        setCustomGradient(nextCustom);
                        setSelectedSystemWallpaper(null);
                        setBackgroundSelection({ type: 'gradient', gradient: nextCustom, gradientPresetId: null, blobGradient: null, wallpaper: null, color: null });
                      }}
                    />
                  </div>
                  <input
                    type="text"
                    spellCheck={false}
                    aria-label={`${row.label} color hex`}
                    className="h-[25px] flex-1 min-w-0 bg-[#2C2C2C] rounded-[7px] text-[11px] font-inter font-light text-white px-2 border border-white/10"
                    value={current}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const nextCustom = { ...(customGradient || {}), [row.key]: raw };
                      setCustomGradient(nextCustom);
                      setSelectedSystemWallpaper(null);
                      setBackgroundSelection({ type: 'gradient', gradient: nextCustom, gradientPresetId: null, blobGradient: null, wallpaper: null, color: null });
                    }}
                    onBlur={() => {
                      const raw = String(customGradient?.[row.key] || '');
                      if (!isProbablyHexColor(raw)) return;
                      const next = normalizeHexColorInput(raw);
                      const nextCustom = { ...(customGradient || {}), [row.key]: next };
                      setCustomGradient(nextCustom);
                      setSelectedSystemWallpaper(null);
                      setBackgroundSelection({ type: 'gradient', gradient: nextCustom, gradientPresetId: null, blobGradient: null, wallpaper: null, color: null });
                    }}
                  />
                </div>
              );
            })}

            <div className="flex items-center gap-[7px]">
              <div className="w-[34px] text-[10px] font-inter font-light text-white/70 shrink-0">Angle</div>
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={customGradient?.angleDeg ?? 135}
                onChange={(e) => {
                  const nextCustom = { ...(customGradient || {}), angleDeg: Number(e.target.value) };
                  setCustomGradient(nextCustom);
                  setSelectedSystemWallpaper(null);
                  setBackgroundSelection({ type: 'gradient', gradient: nextCustom, gradientPresetId: null, blobGradient: null, wallpaper: null, color: null });
                }}
                className="flex-1 min-w-0 h-[3px] accent-[#307b52] cursor-pointer"
                aria-label="Gradient angle"
              />
              <input
                type="number"
                min={0}
                max={360}
                value={customGradient?.angleDeg ?? 135}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(360, Number(e.target.value) || 0));
                  const nextCustom = { ...(customGradient || {}), angleDeg: v };
                  setCustomGradient(nextCustom);
                  setSelectedSystemWallpaper(null);
                  setBackgroundSelection({ type: 'gradient', gradient: nextCustom, gradientPresetId: null, blobGradient: null, wallpaper: null, color: null });
                }}
                className="w-[48px] h-[25px] bg-[#2C2C2C] rounded-[7px] text-[11px] font-inter font-light text-white text-center border border-white/10 shrink-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                aria-label="Gradient angle degrees"
              />
              <span className="text-[10px] font-inter font-light text-white/50 shrink-0">°</span>
            </div>
          </div>
        </div>
      )}

      <AspectRatioDropdown ratioChoice={ratioChoice} setRatioChoice={setRatioChoice} />

      <AnimatePresence>
        {ratioChoice === 'custom' && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="flex justify-between items-center mt-2">
            <div className="text-xs font-inter font-light text-[#757575]">Custom</div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={4000}
                value={customRatio.w}
                onChange={(e) => {
                  const w = Math.max(1, Math.min(4000, Math.round(Number(e.target.value) || 1)));
                  setCustomRatio((prev) => ({ ...prev, w }));
                }}
                className="bg-[#2C2C2C] rounded-[4.5px] text-xs font-inter font-light text-white px-2 py-1 w-[62px]"
                aria-label="Custom ratio width"
              />
              <span className="text-xs font-inter font-light text-white/70">:</span>
              <input
                type="number"
                min={1}
                max={4000}
                value={customRatio.h}
                onChange={(e) => {
                  const h = Math.max(1, Math.min(4000, Math.round(Number(e.target.value) || 1)));
                  setCustomRatio((prev) => ({ ...prev, h }));
                }}
                className="bg-[#2C2C2C] rounded-[4.5px] text-xs font-inter font-light text-white px-2 py-1 w-[62px]"
                aria-label="Custom ratio height"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center mt-3">
        <div className="text-xs font-inter font-light text-white">Padding</div>
        <RangeWithTooltip
          className={SLIDER_W}
          value={padding}
          onValueChange={setPadding}
          dragging={draggingPadding}
          setDragging={setDraggingPadding}
          formatValue={(v) => `${v}px`}
        />
      </div>
      <div className="flex justify-between items-center mt-3">
        <div className="text-xs font-inter font-light text-white">Inset</div>
        <RangeWithTooltip
          className={SLIDER_W}
          value={inset}
          onValueChange={setInset}
          dragging={draggingInset}
          setDragging={setDraggingInset}
          formatValue={(v) => `${v}px`}
        />
      </div>
      <div className="flex items-center mt-3">
        <input
          type="checkbox"
          id="autocrop"
          className="mr-2"
          checked={autoCropEnabled}
          onChange={(e) => setAutoCropEnabled(!!e.target.checked)}
        />
        <label htmlFor="autocrop" className="text-xs font-inter font-light text-white cursor-pointer">AutoCrop</label>
      </div>
      <div className="text-xs font-inter font-light text-[#757575] pl-5 mt-0.5">
        Auto crop your screenshots
      </div>
      <div className="text-xs font-inter font-light text-white mt-3">
        Shadow style
      </div>
      <div className="grid grid-cols-4 gap-[8px] mt-[6px] justify-items-start items-start w-full">
        {([
          { id: 'Hug', label: 'Hug', styleLabel: 'Style 1', thumb: hugShadowThumb },
          { id: 'Heavy', label: 'Heavy', styleLabel: 'Style 2', thumb: heavyShadowThumb },
          { id: 'Ambient', label: 'Ambient', styleLabel: 'Style 3', thumb: ambientShadowThumb },
          { id: 'Custom', label: 'Custom', styleLabel: 'Style 4', thumb: customShadowThumb },
        ]).map((s) => {
          const isActive = selectedShadowStyle === s.id;
          return (
            <div key={s.id} className="flex flex-col items-center w-full min-w-0">
              <button
                type="button"
                onClick={() => setSelectedShadowStyle(s.id)}
                className={(isActive ? 'bg-[#2A2A2A] shadow-[inset_0_0_0_1px_#4A4A4A]' : 'bg-transparent hover:bg-[#232323]') + ' rounded-[10px]'}
                style={{ width: 56, height: 56, padding: 4, boxSizing: 'border-box' }}
                aria-pressed={isActive}
                aria-label={`${s.styleLabel} ${s.label}`}
              >
                <div className="w-full h-full rounded-[6px] overflow-hidden">
                  <img src={s.thumb} alt={s.label} className="block w-full h-full object-cover" />
                </div>
              </button>
              <div className="mt-[4px] text-[9px] font-inter font-light text-[#757575]">{s.label}</div>
            </div>
          );
        })}
      </div>
      {selectedShadowStyle === 'Custom' && (
        <div className="mt-2 p-3 rounded-[8px] bg-[#1c1c1c] shadow-[inset_0_0_0_1px_#313131]">
          <div className="flex justify-between items-center mb-2">
            <div className="text-[11px] font-inter font-light text-white">Custom shadow</div>
            <input
              type="color"
              value={customShadow.color}
              onChange={(e) => setCustomShadow((prev) => ({ ...prev, color: String(e.target.value || '#000000') }))}
              className="h-[20px] w-[20px] rounded-full border-0 cursor-pointer"
              aria-label="Custom shadow color"
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <div className="text-xs font-inter font-light text-white">X <span className="text-white/60">{Math.round(customShadow.offsetX)}px</span></div>
            <RangeWithTooltip
              className={SLIDER_W}
              min={-80}
              max={80}
              origin={0}
              value={customShadow.offsetX}
              onValueChange={(v) => setCustomShadow((prev) => ({ ...prev, offsetX: v }))}
              formatValue={(v) => `${v}px`}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <div className="text-xs font-inter font-light text-white">Y <span className="text-white/60">{Math.round(customShadow.offsetY)}px</span></div>
            <RangeWithTooltip
              className={SLIDER_W}
              min={-80}
              max={120}
              origin={0}
              value={customShadow.offsetY}
              onValueChange={(v) => setCustomShadow((prev) => ({ ...prev, offsetY: v }))}
              formatValue={(v) => `${v}px`}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <div className="text-xs font-inter font-light text-white">Blur <span className="text-white/60">{Math.round(customShadow.blur)}px</span></div>
            <RangeWithTooltip
              className={SLIDER_W}
              min={0}
              max={160}
              value={customShadow.blur}
              onValueChange={(v) => setCustomShadow((prev) => ({ ...prev, blur: v }))}
              formatValue={(v) => `${v}px`}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <div className="text-xs font-inter font-light text-white">Spread <span className="text-white/60">{Math.round(customShadow.spread)}px</span></div>
            <RangeWithTooltip
              className={SLIDER_W}
              min={-80}
              max={80}
              origin={0}
              value={customShadow.spread}
              onValueChange={(v) => setCustomShadow((prev) => ({ ...prev, spread: v }))}
              formatValue={(v) => `${v}px`}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <div className="text-xs font-inter font-light text-white">Opacity <span className="text-white/60">{Math.round(customShadow.opacity * 100)}%</span></div>
            <RangeWithTooltip
              className={SLIDER_W}
              min={0}
              max={1}
              step={0.01}
              value={customShadow.opacity}
              onValueChange={(v) => setCustomShadow((prev) => ({ ...prev, opacity: v }))}
              formatValue={(v) => `${Math.round(v * 100)}%`}
            />
          </div>
        </div>
      )}
      <div className="flex justify-between items-center mt-3">
        <div className="text-xs font-inter font-light text-white">Curve</div>
        <RangeWithTooltip
          className={SLIDER_W}
          value={curve}
          onValueChange={setCurve}
          dragging={draggingCurve}
          setDragging={setDraggingCurve}
          formatValue={(v) => `${v}px`}
        />
      </div>
      <div className="flex justify-between items-center mt-3">
        <div className="text-xs font-inter font-light text-white">Border</div>
        <RangeWithTooltip
          className={SLIDER_W}
          value={border}
          onValueChange={setBorder}
          dragging={draggingBorder}
          setDragging={setDraggingBorder}
          formatValue={(v) => `${v}px`}
        />
      </div>
      <div className="flex justify-between items-center mt-2">
        <div className="text-xs font-inter font-light text-white">Border color</div>
        <input
          type="color"
          value={borderColor}
          onChange={(e) => setBorderColor(normalizeHexColorInput(e.target.value || '#ffffff'))}
          className="h-[20px] w-[20px] rounded-full border-0 cursor-pointer"
          aria-label="Border color"
        />
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="text-xs font-inter font-light text-white">OS Mockup</div>
        <button
          type="button"
          className="flex items-center gap-1 text-xs font-inter font-light text-[#757575] hover:text-white/70"
          onClick={() => setSelectedOsMockup('none')}
          title="Reset OS mockup"
          aria-label="Reset OS mockup"
        >
          <RotateCcw size={12} />
          <span>Reset</span>
        </button>
      </div>
      <div className="grid grid-cols-5 gap-[6px] mt-[6px] justify-items-start items-start w-full">
        {osMockups.map((m) => {
          const isActive = selectedOsMockup === m.id;
          return (
            <div key={m.id} className="flex flex-col items-center w-full min-w-0">
              <button
                type="button"
                onClick={() => setSelectedOsMockup((prev) => (prev === m.id ? 'none' : m.id))}
                className={(isActive ? 'bg-[#2A2A2A] shadow-[inset_0_0_0_1px_#4A4A4A]' : 'bg-transparent hover:bg-[#232323]') + ' rounded-[10px]'}
                style={{ width: 48, height: 48, padding: 4, boxSizing: 'border-box' }}
                aria-pressed={isActive}
              >
                <div className="w-full h-full rounded-[6px] overflow-hidden">
                  {m.thumb || m.src ? (
                    <img src={m.thumb || m.src} alt={m.label} className="block w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-[6px] border border-dashed border-white/20 bg-[#1F1F1F]" aria-hidden="true" />
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>
      {selectedOsMockup === 'safari-1' && (
        <input
          type="text"
          value={safariMockupText}
          onChange={(e) => setSafariMockupText(e.target.value)}
          className="w-full mt-3 bg-[#2C2C2C] rounded-[4.5px] text-xs font-inter font-light text-white px-2 py-1"
          placeholder="Safari text"
          aria-label="Safari mockup text"
        />
      )}

      <div className="flex justify-between items-center mt-3">
        <div className="text-xs font-inter font-light text-white">UI scale</div>
        <RangeWithTooltip
          className={SLIDER_W}
          value={uiScale}
          onValueChange={setUiScale}
          min={0.5}
          max={2}
          step={0.1}
          dragging={draggingUiScale}
          setDragging={setDraggingUiScale}
          formatValue={(v) => `${Number(v || 1).toFixed(1)}x`}
        />
      </div>
      <div className="flex items-center mt-3">
        <input
          type="checkbox"
          id="show-watermark"
          className="mr-2"
          checked={watermarkEnabled}
          onChange={(e) => setWatermarkEnabled(!!e.target.checked)}
        />
        <label htmlFor="show-watermark" className="text-xs font-inter font-light text-white cursor-pointer">Show watermark</label>
      </div>
      <div className="flex justify-between items-center mt-3">
        <div className="text-xs font-inter font-light text-white">Position:</div>
        <div className="relative">
          <select className="bg-[#2C2C2C] rounded-[4.5px] text-xs font-inter font-light text-white pl-2 pr-8 py-1 appearance-none" value={watermarkPosition} onChange={(e) => setWatermarkPosition(e.target.value)}>
            <option value="inside">Inside screenshot</option>
            <option value="center-bottom">Below screenshot</option>
            <option value="top-left">Top left</option>
            <option value="top-right">Top right</option>
            <option value="center-top">Top center</option>
            <option value="bottom-left">Bottom left</option>
            <option value="bottom-right">Bottom right</option>
            <option value="center-bottom">Bottom center</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
            <ChevronDown size={20} className="text-white" />
          </div>
        </div>
      </div>
      <input
        type="text"
        value={watermarkText}
        onChange={(e) => setWatermarkText(e.target.value)}
        className="w-full mt-3 bg-[#2C2C2C] rounded-[4.5px] text-xs font-inter font-light text-white px-2 py-1"
        placeholder="Made with SiteShot"
      />
      <div className="mt-3 grid grid-cols-2 gap-2 py-2">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="twitter-logo"
            className="mr-2"
            checked={watermarkPrefix === 'twitter'}
            onChange={(e) => {
              const on = !!e.target.checked;
              const next = on ? 'twitter' : 'none';
              setWatermarkPrefix(next);
              setWatermarkShowTwitter(next === 'twitter');
            }}
          />
          <label htmlFor="twitter-logo" className="text-xs font-inter font-light text-white cursor-pointer">Twitter logo</label>
        </div>
        <div className="flex items-center justify-end">
          <input
            type="checkbox"
            id="email-logo"
            className="mr-2"
            checked={watermarkPrefix === 'mail'}
            onChange={(e) => {
              const on = !!e.target.checked;
              const next = on ? 'mail' : 'none';
              setWatermarkPrefix(next);
              setWatermarkShowTwitter(next === 'twitter');
            }}
          />
          <label htmlFor="email-logo" className="text-xs font-inter font-light text-white cursor-pointer">Email logo</label>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="youtube-logo"
            className="mr-2"
            checked={watermarkPrefix === 'youtube'}
            onChange={(e) => {
              const on = !!e.target.checked;
              const next = on ? 'youtube' : 'none';
              setWatermarkPrefix(next);
              setWatermarkShowTwitter(next === 'twitter');
            }}
          />
          <label htmlFor="youtube-logo" className="text-xs font-inter font-light text-white cursor-pointer">Youtube logo</label>
        </div>
        <div className="flex items-center justify-end">
          <input
            type="checkbox"
            id="checkmark"
            className="mr-2"
            checked={watermarkShowVerified}
            onChange={(e) => setWatermarkShowVerified(!!e.target.checked)}
          />
          <label htmlFor="checkmark" className="text-xs font-inter font-light text-white cursor-pointer">Checkmark</label>
        </div>
      </div>
      <div className="mt-4 rounded-[10px] border border-white/10 bg-[#232323]/70 px-3 py-2">
        <button
          type="button"
          className="w-full flex justify-between items-center"
          onClick={() => setIsAdvancedOpen((prev) => !prev)}
        >
          <div className="text-xs font-inter font-light text-white">More position settings</div>
          <motion.div
            className="text-xs font-inter font-light text-white"
            animate={{ rotate: isAdvancedOpen ? 0 : -90 }}
            transition={{ duration: 0.15 }}
          >▾</motion.div>
        </button>
      </div>
      <AnimatePresence>
        {isAdvancedOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            className="mt-3 rounded-[10px] border border-white/10 bg-[#1f1f1f]/85 p-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-inter font-light text-white mb-1">Watermark X</div>
                <input
                  type="number"
                  className="w-full bg-[#2C2C2C] rounded-[4.5px] text-xs font-inter font-light text-white px-2 py-1"
                  value={watermarkOffsetX}
                  onChange={(e) => setWatermarkOffsetX(Number(e.target.value) || 0)}
                />
              </div>
              <div>
                <div className="text-xs font-inter font-light text-white mb-1">Watermark Y</div>
                <input
                  type="number"
                  className="w-full bg-[#2C2C2C] rounded-[4.5px] text-xs font-inter font-light text-white px-2 py-1"
                  value={watermarkOffsetY}
                  onChange={(e) => setWatermarkOffsetY(Number(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center mb-2">
                <div className="text-xs font-inter font-light text-white">Tilt X</div>
                <RangeWithTooltip
                  className={SLIDER_W}
                  min={-50}
                  max={50}
                  origin={0}
                  value={tiltX}
                  onValueChange={setTiltX}
                  dragging={draggingTiltX}
                  setDragging={setDraggingTiltX}
                  formatValue={(v) => `${v}°`}
                />
              </div>
              <div className="flex justify-between items-center mb-2">
                <div className="text-xs font-inter font-light text-white">Tilt Y</div>
                <RangeWithTooltip
                  className={SLIDER_W}
                  min={-50}
                  max={50}
                  origin={0}
                  value={tiltY}
                  onValueChange={setTiltY}
                  dragging={draggingTiltY}
                  setDragging={setDraggingTiltY}
                  formatValue={(v) => `${v}°`}
                />
              </div>
              <div className="flex justify-between items-center mb-2">
                <div className="text-xs font-inter font-light text-white">Rotation</div>
                <RangeWithTooltip
                  className={SLIDER_W}
                  min={-50}
                  max={50}
                  origin={0}
                  value={rotation}
                  onValueChange={setRotation}
                  dragging={draggingRotation}
                  setDragging={setDraggingRotation}
                  formatValue={(v) => `${v}°`}
                />
              </div>
            </div>
            <div className="flex gap-4 mt-4 pt-1">
              <div className="flex items-center">
                <span className="text-xs font-inter font-light text-white mr-2">X:</span>
                <input
                  type="number"
                  className="bg-[#2C2C2C] rounded-[4.5px] text-xs font-inter font-light text-white px-2 py-1 w-16 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={Math.round(Number(transform?.x) || 0)}
                  onChange={(e) => {
                    const nextX = Number(e.target.value);
                    handleTransformChange({ x: Number.isFinite(nextX) ? nextX : 0, y: Number(transform?.y) || 0 });
                  }}
                />
              </div>
              <div className="flex items-center">
                <span className="text-xs font-inter font-light text-white mr-2">Y:</span>
                <input
                  type="number"
                  className="bg-[#2C2C2C] rounded-[4.5px] text-xs font-inter font-light text-white px-2 py-1 w-16 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={Math.round(Number(transform?.y) || 0)}
                  onChange={(e) => {
                    const nextY = Number(e.target.value);
                    handleTransformChange({ x: Number(transform?.x) || 0, y: Number.isFinite(nextY) ? nextY : 0 });
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}


