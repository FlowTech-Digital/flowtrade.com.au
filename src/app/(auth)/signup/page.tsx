'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

const TRADE_OPTIONS = [
  { value: 'hvac', label: 'HVAC / Air Conditioning' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'guttering', label: 'Guttering' },
  { value: 'fencing', label: 'Fencing' },
  { value: 'general_construction', label: 'General Construction' },
]

export default function SignupPage() {
  const router = useRouter()
  const { signUpWithOrg } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    trade: 'hvac',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    // Validate password strength
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    // Validate business name
    if (formData.businessName.trim().length < 2) {
      setError('Please enter a valid business name')
      setLoading(false)
      return
    }

    const { error: signUpError } = await signUpWithOrg({
      email: formData.email,
      password: formData.password,
      businessName: formData.businessName.trim(),
      primaryTrade: formData.trade,
    })
    
    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }
    
    // Success - redirect to dashboard
    router.push('/dashboard')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-flowtrade-navy p-8">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center">
          <Image
            src="/logo-header.png"
            alt="FlowTrade"
            width={180}
            height={40}
            className="mb-6"
            priority
          />
          <h2 className="text-xl text-white">Create your account</h2>
          <p className="mt-2 text-sm text-gray-400">
            Start your 14-day free trial
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-400 bg-red-900/30 border border-red-800/50 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="businessName" className="block text-sm font-medium text-gray-300">
              Business Name
            </label>
            <input
              id="businessName"
              type="text"
              required
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-flowtrade-navy-lighter bg-flowtrade-navy-light px-3 py-2 text-white placeholder-gray-500 focus:border-flowtrade-cyan focus:ring-1 focus:ring-flowtrade-cyan"
              placeholder="Your Business Name"
            />
          </div>

          <div>
            <label htmlFor="trade" className="block text-sm font-medium text-gray-300">
              Primary Trade
            </label>
            <select
              id="trade"
              value={formData.trade}
              onChange={(e) => setFormData({ ...formData, trade: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-flowtrade-navy-lighter bg-flowtrade-navy-light px-3 py-2 text-white focus:border-flowtrade-cyan focus:ring-1 focus:ring-flowtrade-cyan"
            >
              {TRADE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-flowtrade-navy-lighter bg-flowtrade-navy-light px-3 py-2 text-white placeholder-gray-500 focus:border-flowtrade-cyan focus:ring-1 focus:ring-flowtrade-cyan"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-flowtrade-navy-lighter bg-flowtrade-navy-light px-3 py-2 text-white placeholder-gray-500 focus:border-flowtrade-cyan focus:ring-1 focus:ring-flowtrade-cyan"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-flowtrade-navy-lighter bg-flowtrade-navy-light px-3 py-2 text-white placeholder-gray-500 focus:border-flowtrade-cyan focus:ring-1 focus:ring-flowtrade-cyan"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-flowtrade-orange text-white font-semibold rounded-lg hover:bg-flowtrade-orange-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating account...' : 'Start Free Trial'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="text-flowtrade-cyan hover:text-flowtrade-cyan-light">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
