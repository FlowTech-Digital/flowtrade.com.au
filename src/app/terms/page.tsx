import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/landing/Header'
import Footer from '@/components/landing/Footer'

export const metadata: Metadata = {
  title: 'Terms of Service | FlowTrade',
  description: 'Terms of Service for FlowTrade — the rules and guidelines for using our platform.',
}

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-flowtrade-dark">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <Link href="/" className="text-flowtrade-cyan hover:underline text-sm">← Back to home</Link>
            <h1 className="text-4xl font-bold text-flowtrade-light mt-4 mb-2">Terms of Service</h1>
            <p className="text-flowtrade-slate">Last updated: 18 June 2026</p>
          </div>

          <div className="prose prose-invert max-w-none text-flowtrade-slate">
            <p>By accessing or using FlowTrade, you agree to be bound by these Terms of Service.</p>

            <h2>Accounts</h2>
            <p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials.</p>

            <h2>Acceptable Use</h2>
            <p>You agree not to use the Service for any illegal purpose or in any way that could damage, disable, or impair the Service.</p>

            <h2>Payment Terms</h2>
            <p>Subscription fees are billed in advance on a monthly or annual basis. You may cancel your subscription at any time. Refunds are provided in accordance with our refund policy.</p>

            <h2>Intellectual Property</h2>
            <p>The Service and its original content, features, and functionality are owned by FlowTech AI PTY LTD and are protected by copyright and trademark laws.</p>

            <h2>Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, FlowTrade shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service.</p>

            <h2>Contact</h2>
            <p>Questions about these Terms should be sent to hello@flowtrade.com.au.</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
