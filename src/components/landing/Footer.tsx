import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand - Text based to avoid 404 */}
          <div className="md:col-span-1">
            <div className="text-2xl font-bold text-slate-50 mb-4">
              Flow<span className="text-teal-500">Trade</span>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              Trade management made simple for Australian tradies.
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-lg">🇦🇺</span>
              <span className="text-slate-400 text-sm">Made in Australia</span>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-slate-50 font-semibold mb-4">Product</h3>
            <ul className="space-y-3">
              <li>
                <a href="#features" className="text-slate-400 hover:text-teal-400 text-sm transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-slate-400 hover:text-teal-400 text-sm transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#integrations" className="text-slate-400 hover:text-teal-400 text-sm transition-colors">
                  Integrations
                </a>
              </li>
              <li>
                <Link href="/login" className="text-slate-400 hover:text-teal-400 text-sm transition-colors">
                  Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-slate-50 font-semibold mb-4">Company</h3>
            <ul className="space-y-3">
              <li>
                <a href="https://flowtechai.com.au" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-teal-400 text-sm transition-colors">
                  About FlowTech
                </a>
              </li>
              <li>
                <a href="mailto:hello@flowtechdigital.com.au" className="text-slate-400 hover:text-teal-400 text-sm transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-slate-50 font-semibold mb-4">Support</h3>
            <ul className="space-y-3">
              <li>
                <a href="mailto:hello@flowtechdigital.com.au" className="text-slate-400 hover:text-teal-400 text-sm transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="mailto:hello@flowtechdigital.com.au" className="text-slate-400 hover:text-teal-400 text-sm transition-colors">
                  Contact Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">
              © 2025 FlowTech AI PTY LTD (ABN: 76689878420). All rights reserved.
            </p>
            <div className="flex items-center space-x-6">
              <a href="#" className="text-slate-500 hover:text-slate-400 text-sm transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-slate-500 hover:text-slate-400 text-sm transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
