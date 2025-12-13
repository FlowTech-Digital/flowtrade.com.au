import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
  return (
    <footer className="bg-flowtrade-navy-light border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Image
              src="/logo-header.png"
              alt="FlowTrade"
              width={140}
              height={35}
              className="h-8 w-auto mb-4 brightness-0 invert"
            />
            <p className="text-white/60 text-sm mb-4">
              Trade management made simple for Australian tradies.
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-lg">🇦🇺</span>
              <span className="text-white/60 text-sm">Made in Australia</span>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-white font-semibold mb-4">Product</h3>
            <ul className="space-y-3">
              <li>
                <a href="#features" className="text-white/60 hover:text-flowtrade-cyan text-sm transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-white/60 hover:text-flowtrade-cyan text-sm transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#integrations" className="text-white/60 hover:text-flowtrade-cyan text-sm transition-colors">
                  Integrations
                </a>
              </li>
              <li>
                <Link href="/login" className="text-white/60 hover:text-flowtrade-cyan text-sm transition-colors">
                  Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-3">
              <li>
                <a href="https://flowtechai.com.au" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-flowtrade-cyan text-sm transition-colors">
                  About FlowTech
                </a>
              </li>
              <li>
                <a href="mailto:hello@flowtechdigital.com.au" className="text-white/60 hover:text-flowtrade-cyan text-sm transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-semibold mb-4">Support</h3>
            <ul className="space-y-3">
              <li>
                <a href="mailto:hello@flowtechdigital.com.au" className="text-white/60 hover:text-flowtrade-cyan text-sm transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="mailto:hello@flowtechdigital.com.au" className="text-white/60 hover:text-flowtrade-cyan text-sm transition-colors">
                  Contact Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/40 text-sm">
              © 2025 FlowTech AI PTY LTD (ABN: 76689878420). All rights reserved.
            </p>
            <div className="flex items-center space-x-6">
              <a href="#" className="text-white/40 hover:text-white/60 text-sm transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-white/40 hover:text-white/60 text-sm transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
