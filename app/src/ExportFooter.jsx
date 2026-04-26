// Bottom export bar — fixed at bottom of canvas area.
import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Trash2 } from 'lucide-react'
import { useAppContext } from './AppContext'
import { Button } from '@/components/ui/button'

export default function ExportFooter() {
  const {
    footerBarRef, footerBarLeft,
    exportBusy, exportDrawerOpen, setExportDrawerOpen,
    exportDrawerRef,
    exportScale, setExportScale,
    exportFormat, setExportFormat,
    exportQuality, setExportQuality,
    copyOutput, saveOutput,
    resetCanvas,
  } = useAppContext()

  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.15 }}
      ref={footerBarRef}
      className="absolute bottom-4 bg-transparent flex items-center gap-[8px] px-[8px] select-none z-20"
      style={{ left: footerBarLeft }}
    >
      {/* Export settings drawer */}
      <div className="relative" ref={exportDrawerRef}>
        <Button
          variant="secondary"
          data-siteshot-react-wired="1"
          className="siteshot-footer-btn bg-[#2C2C2C] text-[13px] font-inter font-light text-white gap-1.5 w-[124px] hover:bg-[#383838]"
          disabled={exportBusy}
          onClick={() => setExportDrawerOpen((prev) => !prev)}
          title="Export settings"
        >
          <span>{exportScale}x</span>
          <span className="text-white/40">•</span>
          <span>{exportFormat.toUpperCase()}</span>
          <ChevronDown size={14} className={'text-white/60 transition-transform ' + (exportDrawerOpen ? 'rotate-180' : '')} />
        </Button>

        <AnimatePresence>
          {exportDrawerOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-[calc(100%+8px)] left-0 w-[220px] rounded-[10px] shadow-[0_8px_30px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(255,255,255,0.08)] p-3 flex flex-col gap-3 siteshot-panel z-50"
              style={{ backgroundColor: 'rgba(28,28,28,0.92)' }}
            >
              {/* Scale */}
              <div>
                <div className="text-[11px] font-inter font-light text-white mb-1.5">Scale</div>
                <div className="flex gap-1">
                  {[0.5, 1, 1.5, 2, 3].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={'flex-1 h-[28px] rounded-[5px] text-[11px] font-inter font-light transition-colors ' +
                        (exportScale === s ? 'bg-[#7700FF] text-white' : 'bg-[#2C2C2C] text-white/70 hover:bg-[#383838]')
                      }
                      onClick={() => setExportScale(s)}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Format */}
              <div>
                <div className="text-[11px] font-inter font-light text-white mb-1.5">Format</div>
                <div className="flex gap-1">
                  {['png', 'jpeg', 'webp'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={'flex-1 h-[28px] rounded-[5px] text-[11px] font-inter font-light transition-colors ' +
                        (exportFormat === f ? 'bg-[#7700FF] text-white' : 'bg-[#2C2C2C] text-white/70 hover:bg-[#383838]')
                      }
                      onClick={() => setExportFormat(f)}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality (only for JPEG/WebP) */}
              {exportFormat !== 'png' && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="text-[11px] font-inter font-light text-white">Quality</div>
                    <div className="text-[11px] font-inter font-light text-white">{Math.round(exportQuality * 100)}%</div>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={exportQuality}
                    onChange={(e) => setExportQuality(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Button
        variant="secondary"
        data-siteshot-react-wired="1"
        className={'siteshot-footer-btn bg-[#2C2C2C] font-inter font-light text-white w-[124px] hover:bg-[#383838] ' + (exportBusy ? 'opacity-60 cursor-not-allowed' : '')}
        disabled={exportBusy}
        onClick={copyOutput}
      >
        Copy
      </Button>
      <Button
        data-siteshot-react-wired="1"
        className={'siteshot-footer-btn bg-[#7700FF] font-inter font-light text-white w-[124px] hover:bg-[#6600e0] ' + (exportBusy ? 'opacity-60 cursor-not-allowed' : '')}
        disabled={exportBusy}
        onClick={saveOutput}
      >
        Save
      </Button>

      {/* Bin: clear screenshot and revert to upload zone */}
      <Button
        variant="secondary"
        size="icon"
        data-siteshot-react-wired="1"
        className="siteshot-footer-btn bg-[#2C2C2C] text-white/70 !w-[34px] !h-[34px] hover:bg-[#383838] hover:text-white"
        onClick={resetCanvas}
        title="Clear — discard screenshot and return to upload zone"
        aria-label="Clear canvas"
      >
        <Trash2 size={13} />
      </Button>
    </motion.div>
  )
}

