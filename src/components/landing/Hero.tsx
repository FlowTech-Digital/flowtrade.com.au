import Link from 'next/link'
import Image from 'next/image'

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Copy */}
          <div className="space-y-8">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-flowtrade-navy leading-tight">
              Professional Quotes in{' '}
              <span className="text-flowtrade-cyan">Minutes</span>, Not Hours
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed max-w-xl">
              The complete trade management platform designed for Australian tradies.
              Quote, track, invoice, and get paid—all from your phone.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-8 py-4 bg-flowtrade-cyan text-white rounded-lg hover:bg-flowtrade-cyan-dark transition-colors font-semibold text-lg shadow-lg shadow-flowtrade-cyan/25"
              >
                Start Free Trial
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-flowtrade-cyan text-flowtrade-cyan rounded-lg hover:bg-flowtrade-cyan/5 transition-colors font-semibold text-lg"
              >
                See Pricing →
              </a>
            </div>
            
            <p className="text-sm text-gray-500">
              14 days free · No credit card required
            </p>
          </div>

          {/* Right Column - Visual */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-flowtrade-navy">
              <div className="aspect-[4/3] flex items-center justify-center p-8">
                <Image
                  src="/logo-hero.svg"
                  alt="FlowTrade Dashboard"
                  width={500}
                  height={375}
                  className="w-full h-auto"
                  priority
                />
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-flowtrade-orange/20 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-flowtrade-cyan/20 rounded-full blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  )
}
