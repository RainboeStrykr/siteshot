"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Zap, Globe, Upload, Command } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

export function FeaturesSection() {
  const [tab, setTab] = useState<"url" | "upload">("url")

  return (
    <section id="features" className="px-6 py-24">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">Features</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-zinc-100 mb-4">
            Everything you need. Nothing you don't.
          </h2>
          <p className="text-zinc-500 max-w-xl mx-auto text-balance">
            Make your screenshots look like they belong.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Card 1 - Screenshot input (wider - 3 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:col-span-3 flex"
          >
            <Card className="group w-full overflow-hidden border-zinc-800/50 bg-zinc-900/50 hover:border-zinc-700/50 transition-all duration-300 rounded-2xl">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-3">
                  <motion.div
                    className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center"
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <Globe className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                  </motion.div>
                  <p className="font-heading font-semibold text-zinc-100">Capture or Upload</p>
                </div>
                <p className="text-zinc-500 text-sm mb-5">
                  Enter a URL to auto-capture any website, or upload a screenshot directly from your device.
                </p>

                {/* Tab switcher */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 flex flex-col items-center gap-5">
                  <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-full p-1">
                    {(["upload", "url"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`relative px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ${
                          tab === t ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {tab === t && (
                          <motion.div
                            layoutId="tab-pill"
                            className="absolute inset-0 bg-zinc-700 rounded-full"
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          />
                        )}
                        <span className="relative z-10">{t === "url" ? "From URL" : "Upload"}</span>
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {tab === "url" ? (
                      <motion.div
                        key="url"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                        className="w-full flex flex-col items-center gap-4"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center">
                          <Globe className="w-7 h-7 text-zinc-300" />
                        </div>
                        <div className="text-center">
                          <p className="text-zinc-100 font-medium mb-1">Enter a website URL</p>
                          <p className="text-zinc-500 text-sm">We'll capture a screenshot and load it into the editor</p>
                        </div>
                        <div className="flex w-full gap-2">
                          <input
                            type="text"
                            placeholder="https://example.com"
                            readOnly
                            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-400 placeholder:text-zinc-600 outline-none cursor-default"
                          />
                          <button className="px-4 py-2 bg-[#307b52] hover:bg-[#3d9966] text-white text-sm font-medium rounded-lg transition-colors">
                            Capture
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="upload"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                        className="w-full flex flex-col items-center gap-4"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center">
                          <Upload className="w-7 h-7 text-zinc-300" />
                        </div>
                        <div className="text-center">
                          <p className="text-zinc-100 font-medium mb-1">Drop a screenshot here</p>
                          <p className="text-zinc-500 text-sm">or click to browse — PNG, JPG, WebP supported</p>
                        </div>
                        <button className="px-6 py-2 bg-[#307b52] hover:bg-[#3d9966] text-white text-sm font-medium rounded-lg transition-colors">
                          Upload screenshot
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Card 2 - All features (narrower - 2 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:col-span-2 flex"
          >
            <Card className="group w-full overflow-hidden border-zinc-800/50 bg-zinc-900/50 hover:border-zinc-700/50 transition-all duration-300 rounded-2xl">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-3">
                  <motion.div
                    className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center"
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.4 }}
                  >
                    <Zap className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                  </motion.div>
                  <p className="font-heading font-semibold text-zinc-100">Everything included</p>
                </div>
                <p className="text-zinc-500 text-sm mb-4">
                  Every tool you need to make screenshots look perfect.
                </p>
                {/* Infinite scrolling feature list */}
                <div className="h-[320px] relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
                  {/* Top fade */}
                  <div className="absolute top-0 inset-x-0 h-8 bg-gradient-to-b from-zinc-950 to-transparent z-10 pointer-events-none" />
                  {/* Bottom fade */}
                  <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-zinc-950 to-transparent z-10 pointer-events-none" />
                  <motion.div
                    className="flex flex-col"
                    animate={{ y: ["0%", "-50%"] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  >
                    {[
                      { label: "Custom Background", detail: "Gradients, solid colors, or your own image" },
                      { label: "Aspect Ratio", detail: "16:9, 1:1, 4:3 and more — or go freeform" },
                      { label: "Watermarks", detail: "Branded text or icon overlays with position control" },
                      { label: "Position & Tilt", detail: "3D perspective tilt on X/Y axes plus free rotation" },
                      { label: "OS Mockup", detail: "macOS, Windows, or browser chrome frames" },
                      { label: "Shadow Styling", detail: "Hug, Heavy, Ambient, or fully custom shadows" },
                      { label: "Custom Background", detail: "Gradients, solid colors, or your own image" },
                      { label: "Aspect Ratio", detail: "16:9, 1:1, 4:3 and more — or go freeform" },
                      { label: "Watermarks", detail: "Branded text or icon overlays with position control" },
                      { label: "Position & Tilt", detail: "3D perspective tilt on X/Y axes plus free rotation" },
                      { label: "OS Mockup", detail: "macOS, Windows, or browser chrome frames" },
                      { label: "Shadow Styling", detail: "Hug, Heavy, Ambient, or fully custom shadows" },
                    ].map((feature, i) => (
                      <div
                        key={i}
                        className="group/item flex flex-col items-center justify-center text-center px-4 py-3 cursor-default hover:bg-zinc-800/40 transition-colors duration-150"
                      >
                        <span className="text-sm font-medium text-zinc-300 group-hover/item:text-zinc-100 transition-colors">{feature.label}</span>
                        <span className="text-xs text-zinc-600 group-hover/item:text-zinc-500 transition-colors mt-0.5">{feature.detail}</span>
                      </div>
                    ))}
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Card 3 - Presets (narrower - 2 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="md:col-span-2"
          >
            <Card className="group h-full overflow-hidden border-zinc-800/50 bg-zinc-900/50 hover:border-zinc-700/50 transition-all duration-300 rounded-2xl">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-3">
                  <motion.div
                    className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center"
                    whileHover={{ y: -2 }}
                  >
                    <Command className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                  </motion.div>
                  <p className="font-heading font-semibold text-zinc-100">Save as Preset</p>
                </div>
                <p className="text-zinc-500 text-sm mb-5">Save your design settings as a preset and reuse them instantly.</p>
                <div className="mt-auto flex flex-col items-center gap-3">
                  {/* Trigger button */}
                  <motion.div
                    className="flex items-center justify-between w-48 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl cursor-default"
                    initial={{ opacity: 0, y: -6 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                  >
                    <span className="text-sm font-medium text-zinc-100">Current</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-zinc-400">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </motion.div>

                  {/* Dropdown panel */}
                  <motion.div
                    className="w-48 bg-zinc-800/90 border border-zinc-700/60 rounded-2xl overflow-hidden shadow-2xl shadow-black/50"
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.45, type: "spring", stiffness: 300, damping: 24 }}
                  >
                    {/* Default option */}
                    <div className="px-4 py-3 hover:bg-zinc-700/50 transition-colors cursor-default">
                      <span className="text-sm text-zinc-200">Default</span>
                    </div>
                    {/* Current option — selected */}
                    <div className="px-4 py-3 hover:bg-zinc-700/50 transition-colors cursor-default flex items-center justify-between">
                      <span className="text-sm text-zinc-200">Current</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-zinc-300">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    {/* Divider */}
                    <div className="h-px bg-zinc-700/60" />
                    {/* Save action */}
                    <div className="px-4 py-3 hover:bg-zinc-700/50 transition-colors cursor-default">
                      <span className="text-sm text-[#4db87d]">Save current as preset...</span>
                    </div>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Card 4 - Annotations (wider - 3 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="md:col-span-3"
          >
            <Card className="group h-full overflow-hidden border-zinc-800/50 bg-zinc-900/50 hover:border-zinc-700/50 transition-all duration-300 rounded-2xl">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-3">
                  <motion.div
                    className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center"
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.4 }}
                  >
                    <svg className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                  </motion.div>
                  <p className="font-heading font-semibold text-zinc-100">Annotations</p>
                </div>
                <p className="text-zinc-500 text-sm mb-5">
                  Mark up screenshots with arrows, text, shapes, and numbered steps — right in the browser.
                </p>

                {/* Annotation toolbar dock */}
                <div className="flex flex-1 items-center justify-center">
                  <motion.div
                    className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 shadow-xl shadow-black/40"
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                  >
                    {[
                      {
                        label: "Pen",
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                          </svg>
                        ),
                      },
                      {
                        label: "Text",
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>
                          </svg>
                        ),
                      },
                      {
                        label: "Arrow",
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
                          </svg>
                        ),
                      },
                      {
                        label: "Rectangle",
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                          </svg>
                        ),
                      },
                    ].map((tool, i) => (
                      <Tooltip key={tool.label}>
                        <TooltipTrigger asChild>
                          <motion.button
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                            whileHover={{ scale: 1.2, y: -3 }}
                            whileTap={{ scale: 0.95 }}
                            initial={{ opacity: 0, y: 8 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 + i * 0.07 }}
                          >
                            {tool.icon}
                          </motion.button>
                        </TooltipTrigger>
                        <TooltipContent side="top" sideOffset={8}>{tool.label}</TooltipContent>
                      </Tooltip>
                    ))}

                    <div className="w-px h-6 bg-zinc-700 mx-1" />

                    {/* Step counter */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          className="w-10 h-10 rounded-full bg-zinc-600 flex items-center justify-center cursor-default"
                          initial={{ opacity: 0, scale: 0.5 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.62, type: "spring", stiffness: 300 }}
                          whileHover={{ scale: 1.2, y: -3 }}
                        >
                          <span className="text-sm font-bold text-white">1</span>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={8}>Step Number</TooltipContent>
                    </Tooltip>

                    {/* Color picker dot */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.button
                          className="w-10 h-10 rounded-full bg-green-800 ml-1"
                          whileHover={{ scale: 1.2, y: -3 }}
                          whileTap={{ scale: 0.9 }}
                          initial={{ opacity: 0, scale: 0.5 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.7, type: "spring", stiffness: 300 }}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={8}>Color</TooltipContent>
                    </Tooltip>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
