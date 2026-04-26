import React, { useLayoutEffect, useMemo, useRef, useState } from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function RangeWithTooltip({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  origin,
  className,
  dragging,
  setDragging,
  formatValue,
  disabled = false,
}) {
  const inputRef = useRef(null)
  const [trackWidth, setTrackWidth] = useState(0)

  const [internalDragging, setInternalDragging] = useState(false)
  const isDragging = typeof dragging === "boolean" ? dragging : internalDragging
  const setIsDragging = typeof setDragging === "function" ? setDragging : setInternalDragging

  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return

    const update = () => {
      const rect = el.getBoundingClientRect()
      setTrackWidth(rect.width)
    }

    update()

    const ro = new ResizeObserver(update)
    ro.observe(el)

    window.addEventListener("resize", update)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", update)
    }
  }, [])

  // Matches thumb width in src/App.css (20px)
  const thumbWidth = 20

  const left = useMemo(() => {
    const range = max - min
    const safeRange = range === 0 ? 1 : range
    const percent = (value - min) / safeRange

    // Center of thumb, constrained to track
    const usable = Math.max(0, trackWidth - thumbWidth)
    return percent * usable + thumbWidth / 2
  }, [value, min, max, trackWidth])

  const content = formatValue ? formatValue(value) : value

  const trackBackground = useMemo(() => {
    const range = max - min
    const safeRange = range === 0 ? 1 : range

    const clampPercent = (p) => Math.min(100, Math.max(0, p))
    const percentForValue = (v) => clampPercent(((v - min) / safeRange) * 100)

    const trackColor = "#2C2C2C"
    const fillColor = "#7700FF"

    const originValue = origin ?? min
    const valuePercent = percentForValue(value)
    const originPercent = percentForValue(originValue)

    const start = Math.min(valuePercent, originPercent)
    const end = Math.max(valuePercent, originPercent)

    // WebKit can render a degenerate (start===end) gradient strangely,
    // making the track look shorter/missing when value==origin.
    if (Math.abs(end - start) < 0.0001) {
      return `linear-gradient(to right, ${trackColor} 0%, ${trackColor} 100%)`
    }

    // Only uses two solid colors; multiple stops are just for hard edges.
    return `linear-gradient(to right, ${trackColor} 0%, ${trackColor} ${start}%, ${fillColor} ${start}%, ${fillColor} ${end}%, ${trackColor} ${end}%, ${trackColor} 100%)`
  }, [value, min, max, origin])

  return (
    <div className="relative w-fit flex items-center">
      <Tooltip open={isDragging}>
        <TooltipTrigger asChild>
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 h-px w-px -translate-y-1/2"
            style={{ left }}
          />
        </TooltipTrigger>
        <TooltipContent side="top" speechBubble>
          {content}
        </TooltipContent>
      </Tooltip>

      <input
        ref={inputRef}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        className={className}
        style={{ background: trackBackground }}
        onChange={(e) => onValueChange(Number(e.target.value))}
        onPointerDown={() => setIsDragging(true)}
        onPointerUp={() => setIsDragging(false)}
        onPointerCancel={() => setIsDragging(false)}
      />
    </div>
  )
}
