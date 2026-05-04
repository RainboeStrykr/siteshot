import { AnimatedNavFramer } from '@/landing/navigation-menu'
import { HeroSection } from '@/landing/sections/hero-section'
import { ImpactSection } from '@/landing/sections/impact-section'
import { FeaturesSection } from '@/landing/sections/features-section'
import { TestimonialsSection } from '@/landing/sections/testimonials-section'
import { CinematicFooter } from '@/landing/ui/motion-footer'
import { LenisProvider } from '@/landing/providers/lenis-provider'

export default function LandingPage() {
  return (
    <LenisProvider>
      <main className="landing-root min-h-screen bg-zinc-950">
        <AnimatedNavFramer />
        <HeroSection />
        <ImpactSection />
        <FeaturesSection />
        <TestimonialsSection />
        <CinematicFooter />
      </main>
    </LenisProvider>
  )
}

