// Annotation toolbar + preset dropdown bar — fixed at top-center of canvas area.
import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, PenLine, Square, Circle, Type, RotateCcw } from 'lucide-react'
import { CircleOneIcon } from './AppHelpers'
import { useAppContext } from './AppContext'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

export default function AnnotationBar() {
  const {
    annotationBarRef, annotationBarLeft,
    annotationTool, setAnnotationTool,
    shapeMode, setShapeMode,
    annotationColor, setAnnotationColor,
    clearAnnotations,
  } = useAppContext()

  return (
    <motion.div
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
      ref={annotationBarRef}
      className="absolute top-4 h-[44px] pl-[9px] pr-[4px] rounded-[100px] shadow-[inset_0_0_0_1px_#1b1f23,0_1px_4px_rgba(0,0,0,0.25)] flex items-center gap-[4px] select-none window-no-drag siteshot-chrome-panel z-30"
      style={{ left: annotationBarLeft }}
    >
      {/* Pen */}
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setAnnotationTool(annotationTool === 'pen' ? null : 'pen')}
            className="h-full px-[4px] flex items-center"
            aria-label="Pen tool"
            aria-pressed={annotationTool === 'pen'}
          >
            <div className={(annotationTool === 'pen' ? 'bg-[#307b52]' : 'bg-transparent hover:bg-[#232323]') + ' rounded-full w-[34px] h-[34px] grid place-items-center'}>
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
            className="h-full px-[4px] flex items-center"
            aria-label="Text tool"
            aria-pressed={annotationTool === 'text'}
          >
            <div className={(annotationTool === 'text' ? 'bg-[#307b52]' : 'bg-transparent hover:bg-[#232323]') + ' rounded-full w-[34px] h-[34px] grid place-items-center'}>
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
            className="h-full px-[4px] flex items-center"
            aria-label="Arrow tool"
            aria-pressed={annotationTool === 'arrow'}
          >
            <div className={(annotationTool === 'arrow' ? 'bg-[#307b52]' : 'bg-transparent hover:bg-[#232323]') + ' rounded-full w-[34px] h-[34px] grid place-items-center'}>
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
            className="h-full px-[4px] flex items-center"
            aria-label="Shape tool"
            aria-pressed={annotationTool === 'shape'}
          >
            <div className={(annotationTool === 'shape' ? 'bg-[#307b52]' : 'bg-transparent hover:bg-[#232323]') + ' rounded-full w-[34px] h-[34px] grid place-items-center'}>
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
                  className="h-full flex items-center"
                  aria-label="Rectangle"
                  aria-pressed={shapeMode === 'rect'}
                >
                  <div className={(shapeMode === 'rect' ? 'bg-[#307b52]' : 'bg-transparent hover:bg-[#232323]') + ' rounded-[6px] px-[6px] py-[7px] transition-colors'}>
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
                  className="h-full flex items-center"
                  aria-label="Ellipse"
                  aria-pressed={shapeMode === 'ellipse'}
                >
                  <div className={(shapeMode === 'ellipse' ? 'bg-[#307b52]' : 'bg-transparent hover:bg-[#232323]') + ' rounded-[6px] px-[6px] py-[7px] transition-colors'}>
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
            className="h-full px-[4px] flex items-center"
            aria-label="Circle label"
            aria-pressed={annotationTool === 'circle1'}
          >
            <div className={(annotationTool === 'circle1' ? 'bg-[#307b52]' : 'bg-transparent hover:bg-[#232323]') + ' rounded-full w-[34px] h-[34px] grid place-items-center'}>
              <CircleOneIcon size={16} />
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>Circle label</TooltipContent>
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
            className="h-full px-[4px] flex items-center"
            onClick={clearAnnotations}
            aria-label="Clear all annotations"
          >
            <div className="bg-transparent hover:bg-[#232323] rounded-full w-[34px] h-[34px] grid place-items-center">
              <RotateCcw size={16} className="text-white" />
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>Clear all</TooltipContent>
      </Tooltip>
    </motion.div>
  )
}

