// Annotation toolbar + preset dropdown bar — fixed at top-center of canvas area.
import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, PenLine, Square, Circle, Type, RotateCcw } from 'lucide-react'
import { CircleOneIcon } from './AppHelpers'
import { useAppContext } from './AppContext'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

// SVG Filter for Glass Effect
const GlassFilter = () => (
  <svg style={{ display: "none" }}>
    <filter
      id="glass-distortion"
      x="0%"
      y="0%"
      width="100%"
      height="100%"
      filterUnits="objectBoundingBox">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.001 0.005"
        numOctaves="1"
        seed="17"
        result="turbulence" />
      <feComponentTransfer in="turbulence" result="mapped">
        <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
        <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
        <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
      </feComponentTransfer>
      <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
      <feSpecularLighting
        in="softMap"
        surfaceScale="5"
        specularConstant="1"
        specularExponent="100"
        lightingColor="white"
        result="specLight">
        <fePointLight x="-200" y="-200" z="300" />
      </feSpecularLighting>
      <feComposite
        in="specLight"
        operator="arithmetic"
        k1="0"
        k2="1"
        k3="1"
        k4="0"
        result="litImage" />
      <feDisplacementMap
        in="SourceGraphic"
        in2="softMap"
        scale="200"
        xChannelSelector="R"
        yChannelSelector="G" />
    </filter>
  </svg>
)

export default function AnnotationBar() {
  const {
    annotationBarRef, annotationBarLeft,
    annotationTool, setAnnotationTool,
    shapeMode, setShapeMode,
    annotationColor, setAnnotationColor,
    clearAnnotations,
  } = useAppContext()

  return (
    <>
      <GlassFilter />
      <motion.div
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
        ref={annotationBarRef}
        className="absolute top-4 h-[44px] pl-[9px] pr-[4px] rounded-[100px] flex items-center gap-[4px] select-none window-no-drag siteshot-chrome-panel z-30 overflow-hidden"
        style={{ 
          left: annotationBarLeft,
          boxShadow: "0 6px 6px rgba(0, 0, 0, 0.2), 0 0 20px rgba(0, 0, 0, 0.1)",
          transitionTimingFunction: "cubic-bezier(0.175, 0.885, 0.32, 2.2)",
        }}
      >
        {/* Glass Layers */}
        <div
          className="absolute inset-0 z-0 overflow-hidden rounded-[100px]"
          style={{
            backdropFilter: "blur(10px)",
            filter: "url(#glass-distortion)",
            isolation: "isolate",
          }}
        />
        <div
          className="absolute inset-0 z-10 rounded-[100px]"
          style={{ background: "rgba(255, 255, 255, 0.1)" }}
        />
        <div
          className="absolute inset-0 z-20 rounded-[100px] overflow-hidden"
          style={{
            boxShadow:
              "inset 2px 2px 1px 0 rgba(255, 255, 255, 0.3), inset -1px -1px 1px 1px rgba(255, 255, 255, 0.2)",
          }}
        />

        {/* Content */}
        <div className="relative z-30 flex items-center gap-[4px] w-full">
          {/* Title */}
          <div className="px-[8px] text-xs font-inter font-light text-white/90">
            Annotations
          </div>
          
          {/* Separator */}
          <div className="h-[24px] w-[1px] bg-white/20 mx-[2px]" />

          {/* Pen */}
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setAnnotationTool(annotationTool === 'pen' ? null : 'pen')}
                className="h-full px-[4px] flex items-center transition-all duration-200"
                aria-label="Pen tool"
                aria-pressed={annotationTool === 'pen'}
              >
                <div className={(annotationTool === 'pen' ? 'bg-white/30' : 'bg-transparent hover:bg-white/10') + ' rounded-full w-[34px] h-[34px] grid place-items-center transition-all duration-200'}>
                  <PenLine size={16} className="text-white" />
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>Pen</TooltipContent>
          </Tooltip>

          {/* Text */}
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setAnnotationTool(annotationTool === 'text' ? null : 'text')}
                className="h-full px-[4px] flex items-center transition-all duration-200"
                aria-label="Text tool"
                aria-pressed={annotationTool === 'text'}
              >
                <div className={(annotationTool === 'text' ? 'bg-white/30' : 'bg-transparent hover:bg-white/10') + ' rounded-full w-[34px] h-[34px] grid place-items-center transition-all duration-200'}>
                  <Type size={16} className="text-white" />
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>Text</TooltipContent>
          </Tooltip>

          {/* Arrow */}
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setAnnotationTool(annotationTool === 'arrow' ? null : 'arrow')}
                className="h-full px-[4px] flex items-center transition-all duration-200"
                aria-label="Arrow tool"
                aria-pressed={annotationTool === 'arrow'}
              >
                <div className={(annotationTool === 'arrow' ? 'bg-white/30' : 'bg-transparent hover:bg-white/10') + ' rounded-full w-[34px] h-[34px] grid place-items-center transition-all duration-200'}>
                  <ArrowUpRight size={16} className="text-white" />
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>Arrow</TooltipContent>
          </Tooltip>

          {/* Shape */}
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setAnnotationTool(annotationTool === 'shape' ? null : 'shape')}
                className="h-full px-[4px] flex items-center transition-all duration-200"
                aria-label="Shape tool"
                aria-pressed={annotationTool === 'shape'}
              >
                <div className={(annotationTool === 'shape' ? 'bg-white/30' : 'bg-transparent hover:bg-white/10') + ' rounded-full w-[34px] h-[34px] grid place-items-center transition-all duration-200'}>
                  {shapeMode === 'ellipse' ? <Circle size={16} className="text-white" /> : <Square size={16} className="text-white" />}
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>Shape</TooltipContent>
          </Tooltip>

          {/* Shape sub-options (rect / ellipse) */}
          <AnimatePresence>
            {annotationTool === 'shape' && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{ overflow: 'hidden' }}
                className="h-full flex items-center gap-0.5 px-[2px]"
              >
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setShapeMode('rect')}
                      className="h-full flex items-center transition-all duration-200"
                      aria-label="Rectangle"
                      aria-pressed={shapeMode === 'rect'}
                    >
                      <div className={(shapeMode === 'rect' ? 'bg-white/30' : 'bg-transparent hover:bg-white/10') + ' rounded-[6px] px-[6px] py-[7px] transition-all duration-200'}>
                        <Square size={14} className="text-white" />
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={6}>Rectangle</TooltipContent>
                </Tooltip>

                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setShapeMode('ellipse')}
                      className="h-full flex items-center transition-all duration-200"
                      aria-label="Ellipse"
                      aria-pressed={shapeMode === 'ellipse'}
                    >
                      <div className={(shapeMode === 'ellipse' ? 'bg-white/30' : 'bg-transparent hover:bg-white/10') + ' rounded-[6px] px-[6px] py-[7px] transition-all duration-200'}>
                        <Circle size={14} className="text-white" />
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={6}>Ellipse</TooltipContent>
                </Tooltip>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Circle-1 */}
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setAnnotationTool(annotationTool === 'circle1' ? null : 'circle1')}
                className="h-full px-[4px] flex items-center transition-all duration-200"
                aria-label="Circle label"
                aria-pressed={annotationTool === 'circle1'}
              >
                <div className={(annotationTool === 'circle1' ? 'bg-white/30' : 'bg-transparent hover:bg-white/10') + ' rounded-full w-[34px] h-[34px] grid place-items-center transition-all duration-200'}>
                  <CircleOneIcon size={16} />
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>Numbering</TooltipContent>
          </Tooltip>

          {/* Color picker — no tooltip needed, visually self-explanatory */}
          <div className="h-full px-[4px] flex items-center">
            <input
              aria-label="Annotation color"
              type="color"
              value={annotationColor}
              onChange={(e) => setAnnotationColor(e.target.value)}
              className="annotation-color h-[20px] w-[20px] rounded-full border-0 cursor-pointer"
            />
          </div>

          {/* Clear */}
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="h-full px-[4px] flex items-center transition-all duration-200"
                onClick={clearAnnotations}
                aria-label="Clear all annotations"
              >
                <div className="bg-transparent hover:bg-white/10 rounded-full w-[34px] h-[34px] grid place-items-center transition-all duration-200">
                  <RotateCcw size={16} className="text-white" />
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>Clear all</TooltipContent>
          </Tooltip>
        </div>
      </motion.div>
    </>
  )
}
