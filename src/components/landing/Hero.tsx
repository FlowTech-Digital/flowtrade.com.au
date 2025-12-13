import Link from 'next/link'
import FlowTradeLogo from '../FlowTradeLogo'

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-flowtrade-dark to-flowtrade-navy">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Copy */}
          <div className="space-y-8">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-flowtrade-light leading-tight">
              Professional Quotes in{' '}
              <span className="text-flowtrade-cyan">Minutes</span>, Not Hours
            </h1>
            <p className="text-xl text-flowtrade-slate leading-relaxed max-w-xl">
              The complete trade management platform designed for Australian tradies.
              Quote, track, invoice, and get paid—all from your phone.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-8 py-4 bg-flowtrade-cyan text-flowtrade-dark rounded-lg hover:bg-flowtrade-cyan-light transition-colors font-semibold text-lg shadow-lg shadow-flowtrade-cyan/25"
              >
                Start Free Trial
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-flowtrade-cyan text-flowtrade-cyan rounded-lg hover:bg-flowtrade-cyan/10 transition-colors font-semibold text-lg"
              >
                See Pricing →
              </a>
            </div>
            
            <p className="text-sm text-flowtrade-slate">
              14 days free · No credit card required
            </p>
          </div>

          {/* Right Column - Visual */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-flowtrade-navy border border-flowtrade-dark">
              <div className="aspect-[4/3] flex items-center justify-center p-8">
                {/* Decorative dashboard mockup */}
                <div className="w-full h-full flex flex-col gap-4">
                  {/* Mock header bar */}
                  <div className="flex items-center gap-3 pb-4 border-b border-flowtrade-dark">
                    <FlowTradeLogo width={120} height={20} />
                    <div className="ml-auto flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-flowtrade-slate/50"></div>
                      <div className="w-3 h-3 rounded-full bg-flowtrade-slate/50"></div>
                      <div className="w-3 h-3 rounded-full bg-flowtrade-cyan"></div>
                    </div>
                  </div>
                  {/* Mock stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-flowtrade-dark/50 rounded-lg p-3">
                      <div className="text-xs text-flowtrade-slate">Quotes Sent</div>
                      <div className="text-xl font-bold text-flowtrade-cyan">247</div>
                    </div>
                    <div className="bg-flowtrade-dark/50 rounded-lg p-3">
                      <div className="text-xs text-flowtrade-slate">Jobs Active</div>
                      <div className="text-xl font-bold text-flowtrade-light">12</div>
                    </div>
                    <div className="bg-flowtrade-dark/50 rounded-lg p-3">
                      <div className="text-xs text-flowtrade-slate">Revenue</div>
                      <div className="text-xl font-bold text-flowtrade-cyan">$48K</div>
                    </div>
                  </div>
                  {/* Mock job list */}
                  <div className="flex-1 space-y-2">
                    <div className="bg-flowtrade-dark/30 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-flowtrade-light/90">Kitchen Renovation</div>
                        <div className="text-xs text-flowtrade-slate">Smith Residence</div>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium bg-flowtrade-cyan/20 text-flowtrade-cyan rounded">In Progress</span>
                    </div>
                    <div className="bg-flowtrade-dark/30 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-flowtrade-light/90">Bathroom Fit-out</div>
                        <div className="text-xs text-flowtrade-slate">Johnson Project</div>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium bg-flowtrade-orange/20 text-flowtrade-orange rounded">Quoted</span>
                    </div>
                  </div>
                </div>
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
