import { useCallback } from 'react'
import { isProbablyHexColor, normalizeHexColorInput } from '../utils/color/colorInput.js'
import { sanitizeCustomShadowState } from '../AppHelpers.jsx'

/**
 * Provides preset capture/apply helpers.
 */
export function usePresets({
  ratioChoice, customRatio, padding, inset, curve, border, borderColor,
  tiltX, tiltY, rotation, transform, uiScale, selectedOsMockup, safariMockupText,
  wallpaperType, backgroundSelection, autoCropEnabled, selectedShadowStyle, customShadow,
  annotationColor, watermarkEnabled, watermarkText, watermarkPosition, watermarkPrefix,
  watermarkOffsetX, watermarkOffsetY, watermarkShowTwitter, watermarkShowVerified,
  exportScale, exportFormat, exportQuality,
  setRatioChoice, setCustomRatio, setPadding, setInset, setCurve, setBorder, setBorderColor,
  setTiltX, setTiltY, setRotation, setTransform, setUiScale, setSelectedOsMockup, setSafariMockupText,
  setWallpaperType, setBackgroundSelection, setAutoCropEnabled, setSelectedShadowStyle, setCustomShadow,
  setAnnotationColor, setWatermarkEnabled, setWatermarkText, setWatermarkPosition, setWatermarkPrefix,
  setWatermarkOffsetX, setWatermarkOffsetY, setWatermarkShowTwitter, setWatermarkShowVerified,
  setExportScale, setExportFormat, setExportQuality,
  osMockups, pushToast, systemWallpapers, setSelectedSystemWallpaper, defaultBackgroundSelection,
}) {
  const capturePresetSnapshot = useCallback(() => {
    return {
      ratioChoice,
      customRatio: { ...customRatio },
      padding,
      inset,
      curve,
      border,
      borderColor,
      tiltX,
      tiltY,
      rotation,
      transform: { ...transform },
      uiScale,
      selectedOsMockup,
      safariMockupText,
      wallpaperType,
      backgroundSelection: backgroundSelection ? JSON.parse(JSON.stringify(backgroundSelection)) : null,
      autoCropEnabled,
      selectedShadowStyle,
      customShadow: { ...customShadow },
      annotationColor,
      watermarkEnabled,
      watermarkText,
      watermarkPosition,
      watermarkPrefix,
      watermarkOffsetX,
      watermarkOffsetY,
      watermarkShowTwitter,
      watermarkShowVerified,
      exportScale,
      exportFormat,
      exportQuality,
    }
  }, [annotationColor, autoCropEnabled, backgroundSelection, border, borderColor, curve, customRatio, customShadow, exportFormat, exportQuality, exportScale, inset, padding, ratioChoice, rotation, safariMockupText, selectedOsMockup, selectedShadowStyle, tiltX, tiltY, transform, uiScale, wallpaperType, watermarkEnabled, watermarkOffsetX, watermarkOffsetY, watermarkPosition, watermarkPrefix, watermarkShowTwitter, watermarkShowVerified, watermarkText])

  const applyPresetSnapshot = useCallback((snap) => {
    if (!snap) return
    if (snap.ratioChoice) setRatioChoice(String(snap.ratioChoice))
    if (snap.customRatio && typeof snap.customRatio === 'object') {
      const w = Math.max(1, Math.min(4000, Math.round(Number(snap.customRatio.w) || 16)))
      const h = Math.max(1, Math.min(4000, Math.round(Number(snap.customRatio.h) || 9)))
      setCustomRatio({ w, h })
    }
    setPadding(Number(snap.padding) || 0)
    setInset(Number(snap.inset) || 0)
    setCurve(Number(snap.curve) || 0)
    setBorder(Number(snap.border) || 0)
    if (isProbablyHexColor(snap.borderColor)) {
      setBorderColor(normalizeHexColorInput(String(snap.borderColor)))
    }
    setTiltX(Number(snap.tiltX) || 0)
    setTiltY(Number(snap.tiltY) || 0)
    setRotation(Number(snap.rotation) || 0)
    if (snap.transform && typeof snap.transform === 'object') {
      setTransform({
        x: Number(snap.transform.x) || 0,
        y: Number(snap.transform.y) || 0,
      })
    }
    setUiScale(Number(snap.uiScale) || 1)
    if (snap.selectedOsMockup) {
      const nextMockup = String(snap.selectedOsMockup)
      if (osMockups.some((m) => m?.id === nextMockup)) {
        setSelectedOsMockup(nextMockup)
      } else {
        pushToast(`Preset mockup unavailable: ${nextMockup}`, { variant: 'error', durationMs: 3400 })
      }
    }
    if (snap.safariMockupText != null) {
      setSafariMockupText(String(snap.safariMockupText || '').trim())
    }
    if (snap.wallpaperType) {
      const nextType = String(snap.wallpaperType)
      if (nextType === 'system' || nextType === 'gradients' || nextType === 'colors' || nextType === 'image') {
        setWallpaperType(nextType)
      }
    }
    if (snap.backgroundSelection && typeof snap.backgroundSelection === 'object') {
      const nextBackground = { ...snap.backgroundSelection }
      const isSystemWallpaper =
        nextBackground?.type === 'wallpaper' &&
        nextBackground?.wallpaper?.source === 'system' &&
        !!nextBackground?.wallpaper?.filePath

      if (isSystemWallpaper) {
        const nextFilePath = String(nextBackground.wallpaper.filePath)
        const matched = systemWallpapers.find((w) => String(w?.filePath || '') === nextFilePath) || null
        if (!matched) {
          pushToast('Preset wallpaper is not available on this device', { variant: 'error', durationMs: 3800 })
        } else {
          setSelectedSystemWallpaper({ name: matched.name, filePath: matched.filePath })
          setBackgroundSelection(nextBackground)
        }
      } else {
        setBackgroundSelection(nextBackground)
      }
    }
    setAutoCropEnabled(!!snap.autoCropEnabled)
    if (snap.selectedShadowStyle) {
      const v = String(snap.selectedShadowStyle)
      setSelectedShadowStyle(v === 'Realistic' ? 'Heavy' : v)
    }
    if (snap.customShadow && typeof snap.customShadow === 'object') {
      setCustomShadow(sanitizeCustomShadowState(snap.customShadow))
    }
    if (snap.annotationColor) {
      const nextColor = normalizeHexColorInput(String(snap.annotationColor))
      if (isProbablyHexColor(nextColor)) setAnnotationColor(nextColor)
    }
    setWatermarkEnabled(!!snap.watermarkEnabled)
    setWatermarkText(String(snap.watermarkText || 'Made with SiteShot'))
    setWatermarkPosition(String(snap.watermarkPosition || 'inside'))
    setWatermarkPrefix(String(snap.watermarkPrefix || (snap.watermarkShowTwitter ? 'twitter' : 'none')))
    setWatermarkOffsetX(Number(snap.watermarkOffsetX ?? 0) || 0)
    setWatermarkOffsetY(Number(snap.watermarkOffsetY ?? 0) || 0)
    setWatermarkShowTwitter(!!snap.watermarkShowTwitter)
    setWatermarkShowVerified(!!snap.watermarkShowVerified)
    if (snap.exportScale != null) {
      const nextScale = Math.max(1, Math.min(4, Math.round(Number(snap.exportScale) || 2)))
      setExportScale(nextScale)
    }
    if (snap.exportFormat) {
      const nextFormat = String(snap.exportFormat).toLowerCase()
      if (nextFormat === 'png' || nextFormat === 'jpeg' || nextFormat === 'webp') {
        setExportFormat(nextFormat)
      }
    }
    if (snap.exportQuality != null) {
      const nextQ = Number(snap.exportQuality)
      if (Number.isFinite(nextQ)) {
        setExportQuality(Math.max(0.1, Math.min(1, nextQ)))
      }
    }
  }, [osMockups, pushToast, systemWallpapers, setAnnotationColor, setAutoCropEnabled, setBackgroundSelection, setBorder, setBorderColor, setCurve, setCustomRatio, setCustomShadow, setExportFormat, setExportQuality, setExportScale, setInset, setPadding, setRatioChoice, setRotation, setSafariMockupText, setSelectedOsMockup, setSelectedShadowStyle, setSelectedSystemWallpaper, setTiltX, setTiltY, setTransform, setUiScale, setWallpaperType, setWatermarkEnabled, setWatermarkOffsetX, setWatermarkOffsetY, setWatermarkPosition, setWatermarkPrefix, setWatermarkShowTwitter, setWatermarkShowVerified, setWatermarkText])

  const applyDefaultPreset = useCallback(() => {
    applyPresetSnapshot({
      ratioChoice: 'auto',
      customRatio: { w: 16, h: 9 },
      padding: 32,
      inset: 0,
      curve: 30,
      border: 0,
      borderColor: '#ffffff',
      tiltX: 0,
      tiltY: 0,
      rotation: 0,
      transform: { x: 0, y: 0 },
      uiScale: 1,
      selectedOsMockup: 'none',
      safariMockupText: '',
      wallpaperType: 'gradients',
      backgroundSelection: defaultBackgroundSelection,
      autoCropEnabled: true,
      selectedShadowStyle: 'Hug',
      customShadow: sanitizeCustomShadowState(null),
      annotationColor: '#7c3aed',
      watermarkEnabled: false,
      watermarkText: 'Made with SiteShot',
      watermarkPosition: 'inside',
      watermarkPrefix: 'none',
      watermarkOffsetX: 0,
      watermarkOffsetY: 0,
      watermarkShowTwitter: false,
      watermarkShowVerified: false,
      exportScale: 2,
      exportFormat: 'png',
      exportQuality: 0.92,
    })
  }, [applyPresetSnapshot, defaultBackgroundSelection])

  return { capturePresetSnapshot, applyPresetSnapshot, applyDefaultPreset }
}
