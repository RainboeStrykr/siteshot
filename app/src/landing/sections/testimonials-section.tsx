import { motion } from 'motion/react'
import { TestimonialsColumn } from '@/landing/ui/testimonials-column'

const testimonials = [
  {
    text: 'Love it. This app is so easy to use.',
    image: 'https://ph-avatars.imgix.net/490814/c2948e4b-a340-423c-b6d7-cb3dec53b471.png?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=32&h=32&fit=crop&frame=1&dpr=2',
    name: 'Anita Kirkovska',
    role: 'GenAI Growth lead at Vellum.AI',
  },
  {
    text: 'Love it! Thanks a million!!!',
    image: 'https://ph-avatars.imgix.net/1755591/e34a3725-b393-4cd3-a218-2cffa43f8201.png?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=120&h=120&fit=crop&frame=1&dpr=2',
    name: 'Obie Akpachiogu',
    role: 'Founder, ContentBazr LLC',
  },
  {
    text: 'Great!',
    image: 'https://ph-avatars.imgix.net/3255763/9fe1b27a-bb9c-4dce-98d5-10a0f60f06fe.jpeg?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=120&h=120&fit=crop&frame=1&dpr=2',
    name: 'Páraic McLean',
    role: 'Social Media Manager @ Justworks',
  },
  {
    text: 'Great tool, thank you for sharing.',
    image: 'https://ph-avatars.imgix.net/3824249/b4f44168-f56b-4411-b3ea-442e48a59aad.png?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=120&h=120&fit=crop&frame=1&dpr=2',
    name: 'Sanja Williams',
    role: 'Law grad. HR Business Partner. England',
  },
  {
    text: 'Love it :)',
    image: 'https://ph-avatars.imgix.net/3594270/7fedef77-08a9-442e-a269-a3933f589f3e.jpeg?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=120&h=120&fit=crop&frame=1&dpr=2',
    name: 'Bertha Kgokong',
    role: 'Software Developer & Entrepreneur',
  },
  {
    text: "Cool product! Not saving screenshots is a smart option. Good luck with it further development ;)",
    image: 'https://ph-avatars.imgix.net/3825165/original.jpeg?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=120&h=120&fit=crop&frame=1&dpr=2',
    name: 'Nikolas Tellar',
    role: 'CEO, Engineer & Designer at Sferatron',
  },
  {
    text: 'Congrats on the launch, would love to have this as a chrome extension',
    image: 'https://ph-avatars.imgix.net/461284/4c7c1473-f32b-4542-a849-08f61dece651.jpeg?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=120&h=120&fit=crop&frame=1&dpr=2',
    name: 'Deepu',
    role: 'Product Manager',
  },
  {
    text: 'Love this, the design of the website is great :)',
    image: 'https://ph-avatars.imgix.net/3804001/7b5fcc29-53a2-4bff-b500-ec2b72d0759c.jpeg?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=120&h=120&fit=crop&frame=1&dpr=2',
    name: 'Choudhary Abdullah',
    role: 'Tech Founder | SuperDev Pro',
  },
  {
    text: "Seems like a cool idea, but a lot of SAAS will require logins, what's the way around that?",
    image: 'https://ph-avatars.imgix.net/2728588/043fb2a9-5ef1-4c7d-8dee-2af9e26370a7.jpeg?auto=compress&codec=mozjpeg&cs=strip&auto=format&w=120&h=120&fit=crop&frame=1&dpr=2',
    name: 'Lane Wagner',
    role: 'Founder of Boot.dev',
  },
]

const firstColumn = testimonials.slice(0, 3)
const secondColumn = testimonials.slice(3, 6)
const thirdColumn = testimonials.slice(6, 9)

const logos = ['Google', 'Tesla', 'Infosys', 'IBM', 'Zomato', 'Zerodha', 'Oyo']

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="px-6 py-24 bg-zinc-900/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="flex flex-col items-center justify-center max-w-xl mx-auto mb-12"
        >
          <div className="border border-zinc-800 py-1.5 px-4 rounded-full text-sm text-zinc-400">Testimonials</div>

          <h2 className="font-display text-4xl md:text-5xl font-bold text-zinc-100 mt-6 text-center tracking-tight">
            What our users say
          </h2>
          <p className="text-center mt-4 text-zinc-500 text-lg text-balance">
            See what our customers have to say about us.
          </p>
        </motion.div>

        <div className="flex justify-center gap-6 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[740px] overflow-hidden">
          <TestimonialsColumn testimonials={firstColumn} duration={15} />
          <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={19} />
          <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={17} />
        </div>

        <div className="mt-16 pt-16 border-t border-zinc-800/50">
          <p className="text-center text-sm text-zinc-500 mb-8">Trusted by people working in</p>
          <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
            <motion.div
              className="flex gap-12 md:gap-16"
              animate={{
                x: ['0%', '-50%'],
              }}
              transition={{
                x: {
                  duration: 20,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'linear',
                },
              }}
            >
              {/* Duplicate logos for seamless loop */}
              {[...logos, ...logos].map((logo, index) => (
                <span
                  key={`${logo}-${index}`}
                  className="text-xl font-semibold text-zinc-700 whitespace-nowrap flex-shrink-0"
                >
                  {logo}
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
