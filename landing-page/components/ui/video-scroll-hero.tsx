"use client";

import { useRef, useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

interface VideoScrollHeroProps {
  videoSrc?: string;
  enableAnimations?: boolean;
  className?: string;
  startScale?: number;
}

export function VideoScrollHero({
  videoSrc = "/video/walkthrough.mp4",
  enableAnimations = true,
  className = "",
  startScale = 0.6,
}: VideoScrollHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [scrollScale, setScrollScale] = useState(startScale);

  useEffect(() => {
    if (!enableAnimations || shouldReduceMotion) return;

    const handleScroll = () => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const containerHeight = containerRef.current.offsetHeight;
      const windowHeight = window.innerHeight;

      const scrolled = Math.max(0, -rect.top);
      const maxScroll = containerHeight - windowHeight;
      const progress = Math.min(scrolled / maxScroll, 1);

      const newScale = startScale + progress * (1 - startScale);
      setScrollScale(newScale);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [enableAnimations, shouldReduceMotion, startScale]);

  const shouldAnimate = enableAnimations && !shouldReduceMotion;

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="relative h-[200vh] bg-zinc-950">
        <div className="sticky top-0 w-full h-screen flex items-center justify-center z-10">
          <div
            className="will-change-transform px-6 w-full flex items-center justify-center"
            style={{
              transform: shouldAnimate ? `scale(${scrollScale})` : "scale(1)",
              transformOrigin: "center center",
            }}
          >
            {/* Outer glow */}
            <div className="relative w-full max-w-5xl">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-zinc-700/30 to-transparent blur-xl pointer-events-none" />
              {/* Video frame */}
              <div className="relative rounded-2xl border border-zinc-800/80 bg-zinc-900/50 overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/5">
                {/* Fake browser chrome */}
                <div className="flex items-center gap-1.5 px-4 py-3 border-b border-zinc-800/80 bg-zinc-900">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                </div>
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-auto object-cover block"
                >
                  <source src={videoSrc} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
