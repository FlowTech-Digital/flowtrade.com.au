import Link from 'next/link'

export default function FinalCTA() {
  return (
    <section id="contact" className="py-20 bg-flowtrade-dark">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-flowtrade-light mb-6">
          Ready to Simplify Your Trade Business?
        </h2>
        <p className="text-xl text-flowtrade-slate mb-8 max-w-2xl mx-auto">
          Start your 14-day free trial today. No credit card required.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-8 py-4 bg-flowtrade-cyan text-flowtrade-dark rounded-lg hover:bg-flowtrade-cyan-light transition-colors font-semibold text-lg shadow-lg shadow-flowtrade-cyan/25"
          >
            Start Free Trial
          </Link>
          <a
            href="mailto:hello@flowtechdigital.com.au"
            className="inline-flex items-center justify-center px-8 py-4 border-2 border-flowtrade-navy text-flowtrade-light/80 rounded-lg hover:bg-flowtrade-navy transition-colors font-semibold text-lg"
          >
            Schedule a Demo
          </a>
        </div>

        <p className="text-flowtrade-slate text-sm">
          Questions? Email us at{' '}
          <a href="mailto:hello@flowtechdigital.com.au" className="text-flowtrade-cyan hover:underline">
            hello@flowtechdigital.com.au
          </a>
        </p>
      </div>
    </section>
  )
}
