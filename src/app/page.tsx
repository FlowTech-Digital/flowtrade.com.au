import {
  Header,
  Hero,
  TrustBar,
  FourPillars,
  Features,
  Integrations,
  Pricing,
  Testimonials,
  FinalCTA,
  Footer,
} from '@/components/landing'

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <TrustBar />
        <FourPillars />
        <Features />
        <Integrations />
        <Pricing />
        <Testimonials />
        <FinalCTA />
      </main>
      <Footer />
    </>
  )
}
