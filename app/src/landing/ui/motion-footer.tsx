import * as React from 'react'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { cn } from '@/landing/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');

.cinematic-footer-wrapper {
  font-family: 'Plus Jakarta Sans', sans-serif;
  -webkit-font-smoothing: antialiased;

  --pill-bg-1: rgba(255, 255, 255, 0.06);
  --pill-bg-2: rgba(255, 255, 255, 0.03);
  --pill-shadow: rgba(0, 0, 0, 0.4);
  --pill-highlight: rgba(255, 255, 255, 0.12);
  --pill-inset-shadow: rgba(0, 0, 0, 0.3);
  --pill-border: rgba(255, 255, 255, 0.12);

  --pill-bg-1-hover: rgba(255, 255, 255, 0.12);
  --pill-bg-2-hover: rgba(255, 255, 255, 0.06);
  --pill-border-hover: rgba(255, 255, 255, 0.28);
  --pill-shadow-hover: rgba(0, 0, 0, 0.5);
  --pill-highlight-hover: rgba(255, 255, 255, 0.2);
}

@keyframes footer-breathe {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
  100% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
}

@keyframes footer-heartbeat {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 5px color-mix(in oklch, var(--destructive) 50%, transparent)); }
  15%, 45% { transform: scale(1.2); filter: drop-shadow(0 0 10px color-mix(in oklch, var(--destructive) 80%, transparent)); }
  30% { transform: scale(1); }
}

.animate-footer-breathe {
  animation: footer-breathe 8s ease-in-out infinite alternate;
}

.animate-footer-heartbeat {
  animation: footer-heartbeat 2s cubic-bezier(0.25, 1, 0.5, 1) infinite;
}

.footer-bg-grid {
  background-size: 60px 60px;
  background-image:
    linear-gradient(to right, color-mix(in oklch, var(--foreground) 3%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in oklch, var(--foreground) 3%, transparent) 1px, transparent 1px);
  mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
}

.footer-aurora {
  background: radial-gradient(
    circle at 50% 50%,
    color-mix(in oklch, var(--primary) 15%, transparent) 0%,
    color-mix(in oklch, var(--secondary) 15%, transparent) 40%,
    transparent 70%
  );
}

.footer-glass-pill {
  background: linear-gradient(145deg, var(--pill-bg-1) 0%, var(--pill-bg-2) 100%);
  box-shadow:
    0 10px 30px -10px var(--pill-shadow),
    inset 0 1px 1px var(--pill-highlight),
    inset 0 -1px 2px var(--pill-inset-shadow);
  border: 1px solid var(--pill-border);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.footer-glass-pill:hover {
  background: linear-gradient(145deg, var(--pill-bg-1-hover) 0%, var(--pill-bg-2-hover) 100%);
  border-color: var(--pill-border-hover);
  box-shadow:
    0 20px 40px -10px var(--pill-shadow-hover),
    inset 0 1px 1px var(--pill-highlight-hover);
  color: var(--foreground);
}

.footer-giant-bg-text {
  font-size: 26vw;
  line-height: 0.75;
  font-weight: 900;
  letter-spacing: -0.05em;
  color: transparent;
  -webkit-text-stroke: 1px color-mix(in oklch, var(--foreground) 5%, transparent);
  background: linear-gradient(180deg, color-mix(in oklch, var(--foreground) 10%, transparent) 0%, transparent 60%);
  -webkit-background-clip: text;
  background-clip: text;
}

.footer-text-glow {
  background: linear-gradient(180deg, var(--foreground) 0%, color-mix(in oklch, var(--foreground) 40%, transparent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0px 0px 20px color-mix(in oklch, var(--foreground) 15%, transparent));
}
`

export type MagneticButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    as?: React.ElementType
  }

const MagneticButton = React.forwardRef<HTMLElement, MagneticButtonProps>(
  ({ className, children, as: Component = 'button', ...props }, forwardedRef) => {
    const localRef = useRef<HTMLElement>(null)

    useEffect(() => {
      if (typeof window === 'undefined') return
      const element = localRef.current
      if (!element) return

      const ctx = gsap.context(() => {
        const handleMouseMove = (e: MouseEvent) => {
          const rect = element.getBoundingClientRect()
          const h = rect.width / 2
          const w = rect.height / 2
          const x = e.clientX - rect.left - h
          const y = e.clientY - rect.top - w
          gsap.to(element, {
            x: x * 0.4,
            y: y * 0.4,
            rotationX: -y * 0.15,
            rotationY: x * 0.15,
            scale: 1.05,
            ease: 'power2.out',
            duration: 0.4,
          })
        }
        const handleMouseLeave = () => {
          gsap.to(element, {
            x: 0, y: 0, rotationX: 0, rotationY: 0, scale: 1,
            ease: 'elastic.out(1, 0.3)',
            duration: 1.2,
          })
        }
        element.addEventListener('mousemove', handleMouseMove as any)
        element.addEventListener('mouseleave', handleMouseLeave)
        return () => {
          element.removeEventListener('mousemove', handleMouseMove as any)
          element.removeEventListener('mouseleave', handleMouseLeave)
        }
      }, element)

      return () => ctx.revert()
    }, [])

    return (
      <Component
        ref={(node: HTMLElement) => {
          (localRef as any).current = node
          if (typeof forwardedRef === 'function') forwardedRef(node)
          else if (forwardedRef) (forwardedRef as any).current = node
        }}
        className={cn('cursor-pointer', className)}
        {...props}
      >
        {children}
      </Component>
    )
  }
)
MagneticButton.displayName = 'MagneticButton'

export function CinematicFooter() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const giantTextRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const linksRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!wrapperRef.current) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        giantTextRef.current,
        { y: '10vh', scale: 0.8, opacity: 0 },
        {
          y: '0vh', scale: 1, opacity: 1, ease: 'power1.out',
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: 'top 80%', end: 'bottom bottom', scrub: 1,
          },
        }
      )
      gsap.fromTo(
        [headingRef.current, linksRef.current],
        { y: 50, opacity: 0 },
        {
          y: 0, opacity: 1, stagger: 0.15, ease: 'power3.out',
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: 'top 40%', end: 'bottom bottom', scrub: 1,
          },
        }
      )
    }, wrapperRef)

    return () => ctx.revert()
  }, [])

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div
        ref={wrapperRef}
        className="relative h-screen w-full"
        style={{ clipPath: 'polygon(0% 0, 100% 0%, 100% 100%, 0 100%)' }}
      >
        <footer className="fixed bottom-0 left-0 flex h-screen w-full flex-col justify-between overflow-hidden bg-zinc-950 text-zinc-100 cinematic-footer-wrapper">

          {/* Ambient glow & grid */}
          <div className="footer-aurora absolute left-1/2 top-1/2 h-[60vh] w-[80vw] -translate-x-1/2 -translate-y-1/2 animate-footer-breathe rounded-[50%] blur-[80px] pointer-events-none z-0" />
          <div className="footer-bg-grid absolute inset-0 z-0 pointer-events-none" />

          {/* Giant background text */}
          <div
            ref={giantTextRef}
            className="footer-giant-bg-text absolute -bottom-[5vh] left-1/2 -translate-x-1/2 whitespace-nowrap z-0 pointer-events-none select-none"
          >
            SITESHOT
          </div>

          {/* Main content */}
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 mt-20 w-full max-w-5xl mx-auto">
            <h2
              ref={headingRef}
              className="text-4xl md:text-6xl font-black footer-text-glow tracking-tighter mb-12 text-center"
            >
              Capture. Refine. Share.
            </h2>

            <div ref={linksRef} className="flex flex-col items-center gap-6 w-full">
              <div className="flex flex-wrap justify-center gap-4 w-full">
                <MagneticButton
                  as="a"
                  href="/editor"
                  className="footer-glass-pill px-10 py-5 rounded-full text-zinc-100 font-bold text-sm md:text-base"
                >
                  Get started free
                </MagneticButton>
                <MagneticButton
                  as="a"
                  href="https://github.com/RainboeStrykr/siteshot"
                  className="footer-glass-pill px-10 py-5 rounded-full text-zinc-100 font-bold text-sm md:text-base"
                >
                  Source Code
                </MagneticButton>
              </div>

              <div className="flex flex-wrap justify-center gap-3 md:gap-6 w-full mt-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <MagneticButton className="footer-glass-pill px-6 py-3 rounded-full text-zinc-400 font-medium text-xs md:text-sm hover:text-zinc-100">
                      Privacy Policy
                    </MagneticButton>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-zinc-300 max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-zinc-100 text-xl">Privacy Policy</DialogTitle>
                      <DialogDescription className="text-zinc-500">
                        Last updated: {new Date().toLocaleDateString()}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 text-sm mt-4">
                      <p>At Siteshot, your privacy is our priority. Since our application operates entirely within your browser (local-first), we do not collect, store, or transmit your screenshots or images to any external servers.</p>
                      <h3 className="text-zinc-100 font-medium text-base">1. Information We Do Not Collect</h3>
                      <p>We do not collect any personal data, images, or files you process through Siteshot. All image rendering and processing are handled via your device's resources.</p>
                      <h3 className="text-zinc-100 font-medium text-base">2. Analytics</h3>
                      <p>We may use basic, anonymised analytics to understand how our tool is being used (e.g., page views) to help us improve the platform, but this does not include any user-identifiable data or processed content.</p>
                      <h3 className="text-zinc-100 font-medium text-base">3. Third-Party Services</h3>
                      <p>If you use external background images fetched from third-party APIs (like Unsplash), those requests are subject to the respective privacy policies of those services.</p>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <MagneticButton className="footer-glass-pill px-6 py-3 rounded-full text-zinc-400 font-medium text-xs md:text-sm hover:text-zinc-100">
                      Terms of Service
                    </MagneticButton>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-zinc-300 max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-zinc-100 text-xl">Terms of Service</DialogTitle>
                      <DialogDescription className="text-zinc-500">
                        Last updated: {new Date().toLocaleDateString()}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 text-sm mt-4">
                      <p>By using Siteshot, you agree to these Terms of Service. Please read them carefully.</p>
                      <h3 className="text-zinc-100 font-medium text-base">1. Use of the Service</h3>
                      <p>Siteshot provides a browser-based tool for formatting and enhancing screenshots. You may use this service for personal and commercial purposes.</p>
                      <h3 className="text-zinc-100 font-medium text-base">2. User Content</h3>
                      <p>You retain all rights to the images you process using Siteshot. Because the service is local-first, we have no access to or control over your content.</p>
                      <h3 className="text-zinc-100 font-medium text-base">3. Prohibited Conduct</h3>
                      <p>You agree not to use Siteshot to create or distribute illegal, harmful, or copyright-infringing material. You are solely responsible for the content you generate.</p>
                      <h3 className="text-zinc-100 font-medium text-base">4. Disclaimer of Warranties</h3>
                      <p>Siteshot is provided "as is" without any warranties, express or implied. We do not guarantee that the service will be error-free or uninterrupted.</p>
                    </div>
                  </DialogContent>
                </Dialog>

                <MagneticButton as="a" href="mailto:abhirajbhowmick27@gmail.com" className="footer-glass-pill px-6 py-3 rounded-full text-zinc-400 font-medium text-xs md:text-sm hover:text-zinc-100">
                  Support
                </MagneticButton>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="relative z-20 w-full pb-8 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-zinc-400 text-[10px] md:text-xs font-semibold tracking-widest uppercase order-2 md:order-1">
              © 2026 Siteshot. All rights reserved.
            </div>

            <div className="footer-glass-pill px-6 py-3 rounded-full flex items-center gap-2 order-1 md:order-2 cursor-default">
              <span className="text-zinc-400 text-[10px] md:text-xs font-bold uppercase tracking-widest">Made by Abhiraj with</span>
              <span className="animate-footer-heartbeat text-sm md:text-base text-red-500">❤</span>
            </div>

            <MagneticButton
              as="button"
              onClick={scrollToTop}
              className="w-12 h-12 rounded-full footer-glass-pill flex items-center justify-center text-zinc-400 hover:text-zinc-100 group order-3"
            >
              <svg className="w-5 h-5 transform group-hover:-translate-y-1.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </MagneticButton>
          </div>
        </footer>
      </div>
    </>
  )
}
