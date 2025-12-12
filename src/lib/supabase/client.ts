import { createBrowserClient } from '@supabase/ssr'

// Build-time safety: Provide fallbacks for static generation
// Real values are injected at runtime via CloudFlare Pages env vars
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Return type explicitly includes null for SSG/build time
type SupabaseClientReturn = ReturnType<typeof createBrowserClient> | null

export function createClient(): SupabaseClientReturn {
  // Skip client creation during build if no real env vars
  if (typeof window === 'undefined' && supabaseUrl === 'https://placeholder.supabase.co') {
    // Return null for SSG/build time - callers must handle this
    return null
  }
  
  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )
}
