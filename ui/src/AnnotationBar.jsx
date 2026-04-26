// Annotation toolbar + preset dropdown bar — fixed at top-center of canvas area.
import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, PenLine, Square, Circle, Type, RotateCcw } from 'lucide-react'
import { CircleOneIcon } from './AppHelpers'
import { useAppContext } from './AppContext'

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
      <button
        type="button"
        onClick={() => setAnnotationTool(annotationTool === 'pen' ? null : 'pen')}
        className="h-full px-[4px] flex items-center"
      >
        <div className={(annotationTool === 'pen' ? 'bg-[#7700FF]' : 'bg-transparent hover:bg-[#232323]') + ' rounded-full w-[34px] h-[34px] grid place-items-center'}>
          <PenLine size={16} className="text-white" />
        </div>
      </button>

      <button
        type="button"
        onClick={() => setAnnotationTool(annotationTool === 'text' ? null : 'text')}
        className="h-full px-[4px] flex items-center"
      >
        <div className={(annotationTool === 'text' ? 'bg-[#7700FF]' : 'bg-transparent hover:bg-[#232323]') + ' rounded-full w-[34px] h-[34px] grid place-items-center'}>
          <Type size={16} className="text-white" />
        </div>
      </button>

      <button
        type="button"
        onClick={() => setAnnotationTool(annotationTool === 'arrow' ? null : 'arrow')}
        className="h-full px-[4px] flex items-center"
      >
        <div className={(annotationTool === 'arrow' ? 'bg-[#7700FF]' : 'bg-transparent hover:bg-[#232323]') + ' rounded-full w-[34px] h-[34px] grid place-items-center'}>
          <ArrowUpRight size={16} className="text-white" />
        </div>
      </button>

      <button
        type="button"
        onClick={() => setAnnotationTool(annotationTool === 'shape' ? null : 'shape')}
        className="h-full px-[4px] flex items-center"
      >
        <div className={(annotationTool === 'shape' ? 'bg-[#7700FF]' : 'bg-transparent hover:bg-[#232323]') + ' rounded-full w-[34px] h-[34px] grid place-items-center'}>
          {shapeMode === 'ellipse' ? <Circle size={16} className="text-white" /> : <Square size={16} className="text-white" />}
        </div>
      </button>

      <AnimatePresence>
      {annotationTool === 'shape' && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 'auto', opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{ overflow: 'hidden' }}
          className="h-full flex items-center gap-0.5 px-[2px]">
          <button
            type="button"
            onClick={() => setShapeMode('rect')}
            className="h-full flex items-center"
            title="Rectangle"
          >
            <div className={(shapeMode === 'rect' ? 'bg-[#7700FF]' : 'bg-transparent hover:bg-[#232323]') + ' rounded-[6px] px-[6px] py-[7px] transition-colors'}>
              <Square size={14} className="text-white" />
            </div>
          </button>
          <button
            type="button"
            onClick={() => setShapeMode('ellipse')}
            className="h-full flex items-center"
            title="Ellipse"
          >
            <div className={(shapeMode === 'ellipse' ? 'bg-[#7700FF]' : 'bg-transparent hover:bg-[#232323]') + ' rounded-[6px] px-[6px] py-[7px] transition-colors'}>
              <Circle size={14} className="text-white" />
            </div>
          </button>
        </motion.div>
      )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setAnnotationTool(annotationTool === 'circle1' ? null : 'circle1')}
        className="h-full px-[4px] flex items-center"
      >
        <div className={(annotationTool === 'circle1' ? 'bg-[#7700FF]' : 'bg-transparent hover:bg-[#232323]') + ' rounded-full w-[34px] h-[34px] grid place-items-center'}>
          <CircleOneIcon size={16} />
        </div>
      </button>

      <div className="h-full px-[4px] flex items-center">
          <input
            aria-label="Annotation color"
            type="color"
            value={annotationColor}
            onChange={(e) => setAnnotationColor(e.target.value)}
            className="annotation-color h-[20px] w-[20px] rounded-full border-0 cursor-pointer"
          />
      </div>

      <button
        type="button"
        className="h-full px-[4px] flex items-center"
        onClick={clearAnnotations}
        title="Clear all annotations"
        aria-label="Clear all annotations"
      >
        <div className="bg-transparent hover:bg-[#232323] rounded-full w-[34px] h-[34px] grid place-items-center">
          <RotateCcw size={16} className="text-white" />
        </div>
      </button>
    </motion.div>
  )
}

