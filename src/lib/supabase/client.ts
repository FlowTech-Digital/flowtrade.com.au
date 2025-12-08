import { createBrowserClient } from '@supabase/ssr'

// Build-time safety: Provide fallbacks for static generation
// Real values are injected at runtime via CloudFlare Pages env vars
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export function createClient() {
  // Skip client creation during build if no real env vars
  if (typeof window === 'undefined' && supabaseUrl === 'https://placeholder.supabase.co') {
    // Return a mock client for SSG/build time
    return null as any
  }
  
  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )
}
