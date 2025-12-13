import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/landing/Header'
import Footer from '@/components/landing/Footer'

export const metadata: Metadata = {
  title: 'About FlowTrade | Australian Trade Management Platform',
  description: 'FlowTrade is built by FlowTech AI PTY LTD, an Australian company dedicated to helping tradies streamline their business operations.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-flowtrade-dark">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold text-flowtrade-light mb-6">
              Built for <span className="text-flowtrade-cyan">Australian Tradies</span>
            </h1>
            <p className="text-xl text-flowtrade-slate max-w-2xl mx-auto">
              FlowTrade was created to solve the real problems Australian trade professionals face every day.
            </p>
          </div>

          {/* Our Story */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-flowtrade-light mb-6">Our Story</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-flowtrade-slate text-lg leading-relaxed mb-4">
                FlowTrade is a product of FlowTech AI PTY LTD, an Australian company based in Sydney. We understand the unique challenges Australian tradies face—from quoting jobs on-site to chasing invoices and managing schedules.
              </p>
              <p className="text-flowtrade-slate text-lg leading-relaxed mb-4">
                Too many tradies spend their evenings doing paperwork instead of spending time with family. FlowTrade was built to change that. Our platform handles the admin so you can focus on what you do best—delivering quality work.
              </p>
              <p className="text-flowtrade-slate text-lg leading-relaxed">
                Every feature in FlowTrade was designed with input from real tradies across Australia, from sparkies and plumbers to builders and landscapers.
              </p>
            </div>
          </section>

          {/* Values */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-flowtrade-light mb-8">What We Stand For</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-flowtrade-navy/50 rounded-xl p-6 border border-flowtrade-navy">
                <div className="text-3xl mb-4">🛠️</div>
                <h3 className="text-lg font-semibold text-flowtrade-light mb-2">Built for the Field</h3>
                <p className="text-flowtrade-slate text-sm">
                  Mobile-first design because we know you're on-site, not behind a desk.
                </p>
              </div>
              <div className="bg-flowtrade-navy/50 rounded-xl p-6 border border-flowtrade-navy">
                <div className="text-3xl mb-4">🇦🇺</div>
                <h3 className="text-lg font-semibold text-flowtrade-light mb-2">Proudly Australian</h3>
                <p className="text-flowtrade-slate text-sm">
                  Local support, Australian tax compliance, and pricing in AUD.
                </p>
              </div>
              <div className="bg-flowtrade-navy/50 rounded-xl p-6 border border-flowtrade-navy">
                <div className="text-3xl mb-4">⚡</div>
                <h3 className="text-lg font-semibold text-flowtrade-light mb-2">No Complexity</h3>
                <p className="text-flowtrade-slate text-sm">
                  Simple tools that work. No enterprise bloat or confusing features.
                </p>
              </div>
            </div>
          </section>

          {/* Company Info */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-flowtrade-light mb-6">Company Details</h2>
            <div className="bg-flowtrade-navy/30 rounded-xl p-8 border border-flowtrade-navy">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <dt className="text-flowtrade-slate text-sm">Company Name</dt>
                  <dd className="text-flowtrade-light font-medium">FlowTech AI PTY LTD</dd>
                </div>
                <div>
                  <dt className="text-flowtrade-slate text-sm">ABN</dt>
                  <dd className="text-flowtrade-light font-medium">76 689 878 420</dd>
                </div>
                <div>
                  <dt className="text-flowtrade-slate text-sm">Location</dt>
                  <dd className="text-flowtrade-light font-medium">Sydney, Australia</dd>
                </div>
                <div>
                  <dt className="text-flowtrade-slate text-sm">Contact</dt>
                  <dd className="text-flowtrade-cyan font-medium">
                    <a href="mailto:hello@flowtrade.com.au" className="hover:underline">
                      hello@flowtrade.com.au
                    </a>
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          {/* CTA */}
          <section className="text-center">
            <h2 className="text-2xl font-bold text-flowtrade-light mb-4">
              Ready to simplify your trade business?
            </h2>
            <p className="text-flowtrade-slate mb-8">
              Join thousands of Australian tradies who've already made the switch.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-8 py-4 bg-flowtrade-cyan text-flowtrade-dark rounded-lg hover:bg-flowtrade-cyan/90 transition-colors font-semibold text-lg shadow-lg shadow-flowtrade-cyan/25"
              >
                Start Free Trial
              </Link>
              <Link
                href="/#features"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-flowtrade-navy text-flowtrade-light rounded-lg hover:bg-flowtrade-navy transition-colors font-semibold text-lg"
              >
                See Features
              </Link>
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  )
}
