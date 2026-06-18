import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/landing/Header'
import Footer from '@/components/landing/Footer'

export const metadata: Metadata = {
  title: 'Privacy Policy | FlowTrade',
  description: 'Privacy Policy for FlowTrade — how we collect, use, and protect your information.',
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-flowtrade-dark">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <Link href="/" className="text-flowtrade-cyan hover:underline text-sm">← Back to home</Link>
            <h1 className="text-4xl font-bold text-flowtrade-light mt-4 mb-2">Privacy Policy</h1>
            <p className="text-flowtrade-slate">Last updated: 18 June 2026</p>
          </div>

          <div className="prose prose-invert max-w-none text-flowtrade-slate">
            <p>FlowTrade ("we", "us", or "our") operates the FlowTrade platform. This page informs you of our policies regarding the collection, use, and disclosure of personal information when you use our Service.</p>

            <h2>Information We Collect</h2>
            <p>We collect information you provide directly to us, including name, email address, phone number, business details, and payment information when you register for an account or use our services.</p>

            <h2>How We Use Your Information</h2>
            <p>We use the information we collect to provide, maintain, and improve our services, to process transactions, to communicate with you, and to comply with legal obligations.</p>

            <h2>Data Security</h2>
            <p>We implement appropriate technical and organisational measures to protect your personal information. However, no method of transmission over the Internet is 100% secure.</p>

            <h2>Your Rights</h2>
            <p>You may request access to, correction of, or deletion of your personal information by contacting us at hello@flowtrade.com.au.</p>

            <h2>Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at hello@flowtrade.com.au.</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
