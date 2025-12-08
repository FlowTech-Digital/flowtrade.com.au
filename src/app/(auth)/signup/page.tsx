'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
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

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }
    
    // TODO: Implement Supabase auth + organization creation
    console.log('Signup attempt:', formData)
    
    // Placeholder - redirect to dashboard
    setTimeout(() => {
      setLoading(false)
      router.push('/dashboard')
    }, 1000)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-flowtrade-blue">FlowTrade</h1>
          <h2 className="mt-4 text-xl">Create your account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Start your 14-day free trial
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="businessName" className="block text-sm font-medium">
              Business Name
            </label>
            <input
              id="businessName"
              type="text"
              required
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-input px-3 py-2 focus:border-flowtrade-blue focus:ring-flowtrade-blue"
              placeholder="Your Business Name"
            />
          </div>

          <div>
            <label htmlFor="trade" className="block text-sm font-medium">
              Primary Trade
            </label>
            <select
              id="trade"
              value={formData.trade}
              onChange={(e) => setFormData({ ...formData, trade: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-input px-3 py-2 focus:border-flowtrade-blue focus:ring-flowtrade-blue"
            >
              <option value="hvac">HVAC / Air Conditioning</option>
              <option value="electrical">Electrical</option>
              <option value="plumbing">Plumbing</option>
            </select>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-input px-3 py-2 focus:border-flowtrade-blue focus:ring-flowtrade-blue"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-input px-3 py-2 focus:border-flowtrade-blue focus:ring-flowtrade-blue"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-input px-3 py-2 focus:border-flowtrade-blue focus:ring-flowtrade-blue"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-flowtrade-blue text-white rounded-lg hover:bg-flowtrade-blue-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating account...' : 'Start Free Trial'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-flowtrade-blue hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
