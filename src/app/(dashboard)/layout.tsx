'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Home, FileText, Briefcase, Users, Settings, LogOut, Loader2, Menu, X, Receipt, BarChart3, Building2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Quotes', href: '/quotes', icon: FileText },
  { name: 'Jobs', href: '/jobs', icon: Briefcase },
  { name: 'Invoices', href: '/invoices', icon: Receipt },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

type OrgInfo = {
  name: string
  logo_url: string | null
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null)

  // Fetch organization info
  useEffect(() => {
    async function fetchOrgInfo() {
      if (!user) return
      
      const supabase = createClient()
      if (!supabase) return

      // Get user's org_id
      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userData?.org_id) return

      // Get organization details
      const { data: orgData } = await supabase
        .from('organizations')
        .select('name, logo_url')
        .eq('id', userData.org_id)
        .single()

      if (orgData) {
        setOrgInfo(orgData)
      }
    }

    fetchOrgInfo()
  }, [user])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-flowtrade-navy">
        <Loader2 className="h-8 w-8 animate-spin text-flowtrade-cyan" />
      </div>
    )
  }

  // Don't render dashboard if not authenticated
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-flowtrade-navy">
        <Loader2 className="h-8 w-8 animate-spin text-flowtrade-cyan" />
      </div>
    )
  }

  // Logo component - shows org logo if available, otherwise FlowTrade logo
  const LogoDisplay = ({ className = "h-8 w-auto" }: { className?: string }) => {
    if (orgInfo?.logo_url) {
      return (
        <div className="flex items-center gap-3">
          <img
            src={orgInfo.logo_url}
            alt={orgInfo.name}
            className={`${className} object-contain bg-white rounded p-1`}
          />
        </div>
      )
    }
    return (
      <img
        src="/flowtrade-logo.svg"
        alt="FlowTrade"
        width={140}
        height={32}
        className={className}
      />
    )
  }

  return (
    <div className="flex min-h-screen bg-flowtrade-navy">
      {/* Mobile menu backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-flowtrade-navy-light border-r border-flowtrade-navy-lighter transform transition-transform duration-300 ease-in-out lg:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo with close button */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-flowtrade-navy-lighter">
            <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
              <LogoDisplay />
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Organization name if logo present */}
          {orgInfo?.logo_url && orgInfo?.name && (
            <div className="px-6 py-2 border-b border-flowtrade-navy-lighter">
              <p className="text-sm text-gray-400 truncate">{orgInfo.name}</p>
            </div>
          )}

          {/* Mobile Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-3 text-base font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-flowtrade-cyan/10 text-flowtrade-cyan'
                      : 'text-gray-400 hover:text-white hover:bg-flowtrade-navy-lighter'
                  }`}
                >
                  <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-flowtrade-cyan' : ''}`} />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-flowtrade-navy-lighter">
            <div className="mb-3 px-3 text-xs text-gray-500 truncate">
              {user.email}
            </div>
            <button 
              onClick={handleSignOut}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-400 rounded-lg hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-flowtrade-navy-light border-r border-flowtrade-navy-lighter hidden lg:block">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-flowtrade-navy-lighter">
            <Link href="/dashboard">
              <LogoDisplay />
            </Link>
          </div>

          {/* Organization name if logo present */}
          {orgInfo?.logo_url && orgInfo?.name && (
            <div className="px-6 py-2 border-b border-flowtrade-navy-lighter">
              <p className="text-sm text-gray-400 truncate">{orgInfo.name}</p>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-flowtrade-cyan/10 text-flowtrade-cyan'
                      : 'text-gray-400 hover:text-white hover:bg-flowtrade-navy-lighter'
                  }`}
                >
                  <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-flowtrade-cyan' : ''}`} />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-flowtrade-navy-lighter">
            <div className="mb-3 px-3 text-xs text-gray-500 truncate">
              {user.email}
            </div>
            <button 
              onClick={handleSignOut}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-400 rounded-lg hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:pl-64">
        {/* Top bar for mobile */}
        <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 bg-flowtrade-navy-light border-b border-flowtrade-navy-lighter lg:hidden">
          {/* Hamburger menu button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-gray-400 hover:text-white hover:bg-flowtrade-navy-lighter rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Logo */}
          <Link href="/dashboard">
            <LogoDisplay className="h-7 w-auto" />
          </Link>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Page content */}
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
