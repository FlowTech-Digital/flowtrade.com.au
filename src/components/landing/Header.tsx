'use client'

import { useState } from 'react'
import Link from 'next/link'
import FlowTradeLogo from '../FlowTradeLogo'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <header className="sticky top-0 z-50 bg-flowtrade-dark border-b border-flowtrade-navy/50 shadow-lg shadow-flowtrade-dark/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-[72px]">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center">
            <FlowTradeLogo width={160} height={28} />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <a href="#features" className="text-flowtrade-light/80 hover:text-flowtrade-cyan transition-colors font-medium">
              Features
            </a>
            <a href="#pricing" className="text-flowtrade-light/80 hover:text-flowtrade-cyan transition-colors font-medium">
              Pricing
            </a>
            <a href="#integrations" className="text-flowtrade-light/80 hover:text-flowtrade-cyan transition-colors font-medium">
              Integrations
            </a>
            <a href="#contact" className="text-flowtrade-light/80 hover:text-flowtrade-cyan transition-colors font-medium">
              Support
            </a>
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center space-x-4">
            <Link
              href="/login"
              className="text-flowtrade-light/80 hover:text-flowtrade-cyan font-medium transition-colors"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="px-6 py-2.5 bg-flowtrade-cyan text-flowtrade-dark rounded-lg hover:bg-flowtrade-cyan-light transition-colors font-semibold shadow-lg shadow-flowtrade-cyan/25"
            >
              Start Free Trial
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="lg:hidden p-2 text-flowtrade-light/80 hover:text-flowtrade-cyan"
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
        <div className="lg:hidden bg-flowtrade-navy border-t border-flowtrade-dark">
          <div className="px-4 py-4 space-y-3">
            <a href="#features" onClick={closeMobileMenu} className="block py-2 text-flowtrade-light/80 hover:text-flowtrade-cyan font-medium">
              Features
            </a>
            <a href="#pricing" onClick={closeMobileMenu} className="block py-2 text-flowtrade-light/80 hover:text-flowtrade-cyan font-medium">
              Pricing
            </a>
            <a href="#integrations" onClick={closeMobileMenu} className="block py-2 text-flowtrade-light/80 hover:text-flowtrade-cyan font-medium">
              Integrations
            </a>
            <a href="#contact" onClick={closeMobileMenu} className="block py-2 text-flowtrade-light/80 hover:text-flowtrade-cyan font-medium">
              Support
            </a>
            <div className="pt-4 space-y-3">
              <Link href="/login" onClick={closeMobileMenu} className="block text-center py-2 text-flowtrade-light/80 font-medium">
                Login
              </Link>
              <Link
                href="/signup"
                onClick={closeMobileMenu}
                className="block text-center py-3 bg-flowtrade-cyan text-flowtrade-dark rounded-lg font-semibold"
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
