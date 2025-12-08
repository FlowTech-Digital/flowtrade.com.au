'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null; user: User | null }>
  signUpWithOrg: (params: SignUpWithOrgParams) => Promise<{ error: Error | null; user: User | null }>
  signOut: () => Promise<void>
}

interface SignUpWithOrgParams {
  email: string
  password: string
  businessName: string
  primaryTrade: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { error, user: data.user }
  }

  /**
   * Sign up with organization creation
   * 1. Creates auth user via Supabase Auth
   * 2. Creates organization record in organizations table
   * 3. Creates user record in users table linked to org
   */
  const signUpWithOrg = async (params: SignUpWithOrgParams) => {
    const { email, password, businessName, primaryTrade } = params

    try {
      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) {
        return { error: authError, user: null }
      }

      if (!authData.user) {
        return { error: new Error('User creation failed'), user: null }
      }

      // Step 2: Create organization record
      // Calculate trial end date (14 days from now)
      const trialEndsAt = new Date()
      trialEndsAt.setDate(trialEndsAt.getDate() + 14)

      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: businessName,
          primary_trade: primaryTrade,
          subscription_status: 'trial',
          trial_ends_at: trialEndsAt.toISOString(),
        })
        .select()
        .single()

      if (orgError) {
        // Cleanup: delete the auth user if org creation fails
        // Note: In production, consider a better cleanup strategy
        console.error('Organization creation failed:', orgError)
        return { error: orgError, user: null }
      }

      // Step 3: Create user record linked to organization
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id, // Same ID as auth.users
          org_id: orgData.id,
          email: email,
          role: 'owner', // First user is always owner
        })

      if (userError) {
        console.error('User record creation failed:', userError)
        return { error: userError, user: null }
      }

      return { error: null, user: authData.user }
    } catch (err) {
      return { error: err as Error, user: null }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signUpWithOrg,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
