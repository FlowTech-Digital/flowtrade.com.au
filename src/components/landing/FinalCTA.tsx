import Link from 'next/link'

export default function FinalCTA() {
  return (
    <section id="contact" className="py-20 bg-flowtrade-navy">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
          Ready to Simplify Your Trade Business?
        </h2>
        <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
          Start your 14-day free trial today. No credit card required.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-8 py-4 bg-flowtrade-cyan text-white rounded-lg hover:bg-flowtrade-cyan-dark transition-colors font-semibold text-lg shadow-lg"
          >
            Start Free Trial
          </Link>
          <a
            href="mailto:hello@flowtechdigital.com.au"
            className="inline-flex items-center justify-center px-8 py-4 border-2 border-white/30 text-white rounded-lg hover:bg-white/10 transition-colors font-semibold text-lg"
          >
            Schedule a Demo
          </a>
        </div>

        <p className="text-white/60 text-sm">
          Questions? Email us at{' '}
          <a href="mailto:hello@flowtechdigital.com.au" className="text-flowtrade-cyan hover:underline">
            hello@flowtechdigital.com.au
          </a>
        </p>
      </div>
    </section>
  )
}
