'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // TODO: Implement Supabase password reset
    console.log('Password reset for:', email)
    
    setTimeout(() => {
      setLoading(false)
      setSent(true)
    }, 1000)
  }

  if (sent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8 text-center">
          <h1 className="text-2xl font-bold text-flowtrade-blue">Check your email</h1>
          <p className="text-muted-foreground">
            We&apos;ve sent a password reset link to <strong>{email}</strong>
          </p>
          <Link href="/login" className="text-flowtrade-blue hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-flowtrade-blue">FlowTrade</h1>
          <h2 className="mt-4 text-xl">Reset your password</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-input px-3 py-2 focus:border-flowtrade-blue focus:ring-flowtrade-blue"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-flowtrade-blue text-white rounded-lg hover:bg-flowtrade-blue-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Remember your password?{' '}
          <Link href="/login" className="text-flowtrade-blue hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
