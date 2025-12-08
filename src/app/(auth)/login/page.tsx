'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const { error: signInError } = await signIn(email, password)
    
    if (signInError) {
      setError(signInError.message)
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
          <img
            src="/logo-header.svg"
            alt="FlowTrade"
            width={180}
            height={40}
            className="mb-6"
          />
          <h2 className="text-xl text-white">Sign in to your account</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-400 bg-red-900/30 border border-red-800/50 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-flowtrade-navy-lighter bg-flowtrade-navy-light px-3 py-2 text-white placeholder-gray-500 focus:border-flowtrade-cyan focus:ring-1 focus:ring-flowtrade-cyan"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center justify-between">
            <Link href="/forgot-password" className="text-sm text-flowtrade-cyan hover:text-flowtrade-cyan-light">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-flowtrade-cyan text-flowtrade-navy font-semibold rounded-lg hover:bg-flowtrade-cyan-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-flowtrade-cyan hover:text-flowtrade-cyan-light">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
