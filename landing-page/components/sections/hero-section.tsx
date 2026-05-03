"use client"

import Link from "next/link"
import { Sparkles, ArrowRight } from "lucide-react"
import ShinyButton from "@/components/ui/shiny-button"

export function HeroSection() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-20 relative">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/50 via-transparent to-transparent" />

      {/* Content */}
      <div className="relative z-10 text-center max-w-3xl mx-auto">
        {/* Badge - customize your announcement */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/80 border border-zinc-800 mb-8">
          <Sparkles className="w-4 h-4 text-zinc-400" />
          <span className="text-sm text-zinc-400">Introducing v2.0 — More Powerful</span>
        </div>

        {/* Headline - customize your value proposition */}
        <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight mb-6">
          <span className="text-zinc-100 block">Screenshots,</span>
          <span className="bg-gradient-to-r from-zinc-500 via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
            done better.
          </span>
        </h1>

        {/* Subheadline - describe your product */}
        <p className="text-lg md:text-xl text-zinc-500 max-w-2xl mx-auto mb-10 leading-relaxed text-balance">
          Turn any screenshot into a clean, presentation-ready visual in seconds.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="https://siteshot.vercel.app">
            <ShinyButton className="text-base font-bold">
              Use now!
            </ShinyButton>
          </Link>
          <Link
            href="https://github.com/RainboeStrykr/siteshot"
            className="group flex items-center gap-2 px-6 py-3 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <span>See code on Github</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
        </div>

        {/* Social proof */}
        <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-6">
          {/* Product Hunt badge */}
          <a
            href="https://www.producthunt.com/products/cleanshot-2?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-cleanshot-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              alt="Siteshot - Generate clean screenshots for any website from its URLs | Product Hunt"
              width={250}
              height={54}
              src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=317667&theme=dark&t=1777837873637"
            />
          </a>
          <div className="hidden sm:block h-12 w-px bg-zinc-800" />
          <div className="flex items-center gap-4">            
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <svg
                    key={i}
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="#FACC15"
                    stroke="#FACC15"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
                  </svg>
                ))}
                <span className="text-zinc-400 font-medium ml-1 text-sm">#9 day ranking</span>
              </div>
              <p className="text-sm text-zinc-500">
                Trusted by <span className="text-zinc-300 font-medium">100+</span> developers
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
