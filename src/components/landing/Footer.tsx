import Link from 'next/link'
import FlowTradeLogo from '../FlowTradeLogo'

export default function Footer() {
  return (
    <footer className="bg-flowtrade-dark border-t border-flowtrade-navy">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="mb-4">
              <FlowTradeLogo width={140} height={24} />
            </div>
            <p className="text-flowtrade-slate text-sm mb-4">
              Trade management made simple for Australian tradies.
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-lg">🇦🇺</span>
              <span className="text-flowtrade-slate text-sm">Made in Australia</span>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-flowtrade-light font-semibold mb-4">Product</h3>
            <ul className="space-y-3">
              <li>
                <a href="#features" className="text-flowtrade-slate hover:text-flowtrade-cyan text-sm transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-flowtrade-slate hover:text-flowtrade-cyan text-sm transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#integrations" className="text-flowtrade-slate hover:text-flowtrade-cyan text-sm transition-colors">
                  Integrations
                </a>
              </li>
              <li>
                <Link href="/login" className="text-flowtrade-slate hover:text-flowtrade-cyan text-sm transition-colors">
                  Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-flowtrade-light font-semibold mb-4">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="text-flowtrade-slate hover:text-flowtrade-cyan text-sm transition-colors">
                  About FlowTrade
                </Link>
              </li>
              <li>
                <a href="mailto:hello@flowtrade.com.au" className="text-flowtrade-slate hover:text-flowtrade-cyan text-sm transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-flowtrade-light font-semibold mb-4">Support</h3>
            <ul className="space-y-3">
              <li>
                <a href="mailto:hello@flowtrade.com.au" className="text-flowtrade-slate hover:text-flowtrade-cyan text-sm transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="mailto:hello@flowtrade.com.au" className="text-flowtrade-slate hover:text-flowtrade-cyan text-sm transition-colors">
                  Contact Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-flowtrade-navy mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-flowtrade-slate text-sm">
              © 2025 FlowTech AI PTY LTD (ABN: 76689878420). All rights reserved.
            </p>
            <div className="flex items-center space-x-6">
              <a href="#" className="text-flowtrade-slate hover:text-flowtrade-light text-sm transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-flowtrade-slate hover:text-flowtrade-light text-sm transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
