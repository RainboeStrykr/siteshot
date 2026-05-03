import { AnimatedNavFramer } from "@/components/navigation-menu"
import { HeroSection } from "@/components/sections/hero-section"
import { VideoScrollHero } from "@/components/ui/video-scroll-hero"
import { ImpactSection } from "@/components/sections/impact-section"
import { FeaturesSection } from "@/components/sections/features-section"
import { TestimonialsSection } from "@/components/sections/testimonials-section"
import { CinematicFooter } from "@/components/ui/motion-footer"

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950">
      <AnimatedNavFramer />
      <HeroSection />
      <VideoScrollHero videoSrc="/video/walkthrough.mp4" />
      <ImpactSection />
      <FeaturesSection />
      <TestimonialsSection />
      <CinematicFooter />
    </main>
  )
}
