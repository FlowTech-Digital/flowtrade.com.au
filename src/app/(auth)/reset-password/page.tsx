'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState(false)

  // Supabase puts the user in a temporary PASSWORD_RECOVERY session when they
  // land here from the emailed link. If there is no such session, the link is
  // missing, expired, or already used.
  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true)
      } else {
        setError('This reset link is invalid or has expired. Request a new one.')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
        setError(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    if (!supabase) {
      setError('Auth not available. Please try again.')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
    // updateUser leaves the user signed in - send them straight to the app.
    setTimeout(() => router.push('/dashboard'), 1500)
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-flowtrade-navy p-8">
        <div className="w-full max-w-md space-y-6 text-center">
          <Image src="/flowtrade-logo.svg" alt="FlowTrade" width={180} height={40} className="mx-auto mb-6" priority />
          <h1 className="text-2xl font-bold text-white">Password updated</h1>
          <p className="text-gray-400">Taking you to your dashboard&hellip;</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-flowtrade-navy p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <Image src="/flowtrade-logo.svg" alt="FlowTrade" width={180} height={40} className="mb-6" priority />
          <h1 className="text-2xl font-bold text-white">Choose a new password</h1>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
            {!ready && (
              <>
                {' '}
                <Link href="/forgot-password" className="underline hover:text-red-200">
                  Request a new link
                </Link>
              </>
            )}
          </div>
        )}

        {ready && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                New password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="mt-1 block w-full rounded-lg border border-flowtrade-navy-lighter bg-flowtrade-navy-light px-3 py-2 text-white placeholder-gray-500 focus:border-flowtrade-cyan focus:ring-1 focus:ring-flowtrade-cyan"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="mt-1 block w-full rounded-lg border border-flowtrade-navy-lighter bg-flowtrade-navy-light px-3 py-2 text-white placeholder-gray-500 focus:border-flowtrade-cyan focus:ring-1 focus:ring-flowtrade-cyan"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-flowtrade-cyan px-4 py-2 font-semibold text-flowtrade-navy transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-400">
          <Link href="/login" className="text-flowtrade-cyan hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
