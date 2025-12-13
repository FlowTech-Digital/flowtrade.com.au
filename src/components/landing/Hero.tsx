import Link from 'next/link'

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Copy */}
          <div className="space-y-8">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-50 leading-tight">
              Professional Quotes in{' '}
              <span className="text-teal-400">Minutes</span>, Not Hours
            </h1>
            <p className="text-xl text-slate-400 leading-relaxed max-w-xl">
              The complete trade management platform designed for Australian tradies.
              Quote, track, invoice, and get paid—all from your phone.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-8 py-4 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors font-semibold text-lg shadow-lg shadow-teal-500/25"
              >
                Start Free Trial
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-teal-500 text-teal-400 rounded-lg hover:bg-teal-500/10 transition-colors font-semibold text-lg"
              >
                See Pricing →
              </a>
            </div>
            
            <p className="text-sm text-slate-500">
              14 days free · No credit card required
            </p>
          </div>

          {/* Right Column - Visual */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-slate-800 border border-slate-700">
              <div className="aspect-[4/3] flex items-center justify-center p-8">
                {/* Decorative dashboard mockup instead of missing image */}
                <div className="w-full h-full flex flex-col gap-4">
                  {/* Mock header bar */}
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-700">
                    <div className="text-xl font-bold text-slate-50">
                      Flow<span className="text-teal-400">Trade</span>
                    </div>
                    <div className="ml-auto flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-slate-600"></div>
                      <div className="w-3 h-3 rounded-full bg-slate-600"></div>
                      <div className="w-3 h-3 rounded-full bg-teal-500"></div>
                    </div>
                  </div>
                  {/* Mock stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <div className="text-xs text-slate-500">Quotes Sent</div>
                      <div className="text-xl font-bold text-teal-400">247</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <div className="text-xs text-slate-500">Jobs Active</div>
                      <div className="text-xl font-bold text-slate-50">12</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <div className="text-xs text-slate-500">Revenue</div>
                      <div className="text-xl font-bold text-teal-400">$48K</div>
                    </div>
                  </div>
                  {/* Mock job list */}
                  <div className="flex-1 space-y-2">
                    <div className="bg-slate-700/30 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-300">Kitchen Renovation</div>
                        <div className="text-xs text-slate-500">Smith Residence</div>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium bg-teal-500/20 text-teal-400 rounded">In Progress</span>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-300">Bathroom Fit-out</div>
                        <div className="text-xs text-slate-500">Johnson Project</div>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium bg-amber-500/20 text-amber-400 rounded">Quoted</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-amber-500/20 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-teal-500/20 rounded-full blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  )
}
