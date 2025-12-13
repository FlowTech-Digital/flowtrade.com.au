'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-700/50 shadow-lg shadow-slate-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-[72px]">
          {/* Logo - Text based to avoid 404 */}
          <Link href="/" className="flex-shrink-0 flex items-center">
            <span className="text-2xl font-bold text-slate-50">
              Flow<span className="text-teal-500">Trade</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <a href="#features" className="text-slate-300 hover:text-teal-400 transition-colors font-medium">
              Features
            </a>
            <a href="#pricing" className="text-slate-300 hover:text-teal-400 transition-colors font-medium">
              Pricing
            </a>
            <a href="#integrations" className="text-slate-300 hover:text-teal-400 transition-colors font-medium">
              Integrations
            </a>
            <a href="#contact" className="text-slate-300 hover:text-teal-400 transition-colors font-medium">
              Support
            </a>
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center space-x-4">
            <Link
              href="/login"
              className="text-slate-300 hover:text-teal-400 font-medium transition-colors"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="px-6 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors font-semibold shadow-lg shadow-teal-500/25"
            >
              Start Free Trial
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="lg:hidden p-2 text-slate-300 hover:text-teal-400"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-800 border-t border-slate-700">
          <div className="px-4 py-4 space-y-3">
            <a href="#features" className="block py-2 text-slate-300 hover:text-teal-400 font-medium">
              Features
            </a>
            <a href="#pricing" className="block py-2 text-slate-300 hover:text-teal-400 font-medium">
              Pricing
            </a>
            <a href="#integrations" className="block py-2 text-slate-300 hover:text-teal-400 font-medium">
              Integrations
            </a>
            <a href="#contact" className="block py-2 text-slate-300 hover:text-teal-400 font-medium">
              Support
            </a>
            <div className="pt-4 space-y-3">
              <Link href="/login" className="block text-center py-2 text-slate-300 font-medium">
                Login
              </Link>
              <Link
                href="/signup"
                className="block text-center py-3 bg-teal-500 text-white rounded-lg font-semibold"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
