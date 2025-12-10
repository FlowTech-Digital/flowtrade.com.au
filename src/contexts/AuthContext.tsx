'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, AuthError, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

type SignUpWithOrgParams = {
  email: string
  password: string
  businessName: string
  primaryTrade: string
}

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, metadata?: { full_name?: string }) => Promise<{ error: AuthError | null }>
  signUpWithOrg: (params: SignUpWithOrgParams) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  
  const supabase = createClient()

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: { message: 'Auth not available' } as AuthError }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUp = async (email: string, password: string, metadata?: { full_name?: string }) => {
    if (!supabase) return { error: { message: 'Auth not available' } as AuthError }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    })
    return { error }
  }

  const signUpWithOrg = async ({ email, password, businessName, primaryTrade }: SignUpWithOrgParams) => {
    if (!supabase) return { error: { message: 'Auth not available' } as AuthError }
    
    // Step 1: Create auth user
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          business_name: businessName,
          primary_trade: primaryTrade
        }
      }
    })
    
    if (authError) {
      return { error: authError }
    }

    // Step 2: Wait for session to be established
    // The trigger on_auth_user_created will create public.users record
    // We need the session to call RPC as authenticated user
    if (!data.session) {
      // Email confirmation might be required - user needs to verify
      // In this case, org will be created on first login after verification
      // For now, return success - org creation happens on confirmation callback
      return { error: null }
    }

    // Step 3: Create organization via RPC
    // This calls create_organization_for_user which:
    // - Creates organizations record with 14-day trial
    // - Triggers on_organization_created → creates org_settings
    // - Updates users.org_id to link user to org
    const { error: orgError } = await supabase.rpc('create_organization_for_user', {
      p_name: businessName,
      p_email: email,
      p_phone: null,
      p_primary_trade: primaryTrade,
      p_abn: null
    })
    
    if (orgError) {
      console.error('Organization creation failed:', orgError)
      // Auth succeeded but org failed - user exists but without org
      // They can retry org creation from onboarding or contact support
      return { 
        error: { 
          message: 'Account created but organization setup failed. Please try again or contact support.',
          name: 'OrgCreationError',
          status: 500
        } as AuthError 
      }
    }
    
    return { error: null }
  }

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  const resetPassword = async (email: string) => {
    if (!supabase) return { error: { message: 'Auth not available' } as AuthError }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    return { error }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signUpWithOrg, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
