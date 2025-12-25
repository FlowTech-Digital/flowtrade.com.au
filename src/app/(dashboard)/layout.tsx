'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { Home, FileText, Briefcase, Users, Settings, LogOut, Loader2, Menu, X, Receipt, BarChart3, ChevronDown } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'

type NavItem = {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  children?: { name: string; href: string }[]
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Quotes', href: '/quotes', icon: FileText },
  { name: 'Jobs', href: '/jobs', icon: Briefcase },
  { name: 'Invoices', href: '/invoices', icon: Receipt },
  { name: 'Customers', href: '/customers', icon: Users },
  { 
    name: 'Reports', 
    href: '/reports', 
    icon: BarChart3,
    children: [
      { name: 'Overview', href: '/reports' },
      { name: 'Quotes Analytics', href: '/reports/quotes' },
      { name: 'Payment Analytics', href: '/reports/payments' },
      { name: 'Invoice Analytics', href: '/reports/invoices' },
    ]
  },
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
  const [expandedItems, setExpandedItems] = useState<string[]>(['Reports']) // Reports expanded by default

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

  // Auto-expand Reports if on a reports page
  useEffect(() => {
    if (pathname.startsWith('/reports') && !expandedItems.includes('Reports')) {
      setExpandedItems(prev => [...prev, 'Reports'])
    }
  }, [pathname, expandedItems])

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const toggleExpanded = (name: string) => {
    setExpandedItems(prev => 
      prev.includes(name) 
        ? prev.filter(item => item !== name)
        : [...prev, name]
    )
  }

  const isItemActive = (item: NavItem) => {
    if (item.children) {
      return pathname.startsWith(item.href)
    }
    return pathname === item.href || pathname.startsWith(item.href + '/')
  }

  const isChildActive = (href: string) => {
    if (href === '/reports') {
      return pathname === '/reports'
    }
    return pathname === href || pathname.startsWith(href + '/')
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

  const renderNavItem = (item: NavItem, isMobile: boolean = false) => {
    const isActive = isItemActive(item)
    const isExpanded = expandedItems.includes(item.name)
    const hasChildren = item.children && item.children.length > 0

    if (hasChildren) {
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleExpanded(item.name)}
            className={`flex items-center justify-between w-full px-3 ${isMobile ? 'py-3 text-base' : 'py-2 text-sm'} font-medium rounded-lg transition-colors ${
              isActive
                ? 'bg-flowtrade-cyan/10 text-flowtrade-cyan'
                : 'text-gray-400 hover:text-white hover:bg-flowtrade-navy-lighter'
            }`}
          >
            <div className="flex items-center">
              <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-flowtrade-cyan' : ''}`} />
              {item.name}
            </div>
            <ChevronDown 
              className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
            />
          </button>
          
          {/* Submenu */}
          <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="ml-8 mt-1 space-y-1">
              {item.children?.map((child) => {
                const childActive = isChildActive(child.href)
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={`block px-3 ${isMobile ? 'py-2 text-sm' : 'py-1.5 text-xs'} font-medium rounded-lg transition-colors ${
                      childActive
                        ? 'text-flowtrade-cyan bg-flowtrade-cyan/5'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-flowtrade-navy-lighter/50'
                    }`}
                  >
                    {child.name}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )
    }

    return (
      <Link
        key={item.name}
        href={item.href}
        className={`flex items-center px-3 ${isMobile ? 'py-3 text-base' : 'py-2 text-sm'} font-medium rounded-lg transition-colors ${
          isActive
            ? 'bg-flowtrade-cyan/10 text-flowtrade-cyan'
            : 'text-gray-400 hover:text-white hover:bg-flowtrade-navy-lighter'
        }`}
      >
        <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-flowtrade-cyan' : ''}`} />
        {item.name}
      </Link>
    )
  }

  return (
    <div className="flex min-h-screen bg-flowtrade-navy overflow-x-hidden">
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
          {/* FlowTrade Logo - PRIMARY BRANDING (always visible at top) */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-flowtrade-navy-lighter bg-flowtrade-navy">
            <Link href="/dashboard" className="flex items-center" onClick={() => setMobileMenuOpen(false)}>
              <Image
                src="/flowtrade-logo.svg"
                alt="FlowTrade"
                width={120}
                height={32}
                className="h-8 w-auto"
                priority
              />
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Organization - SECONDARY BRANDING (below FlowTrade logo) */}
          {orgInfo && (
            <div className="px-4 py-3 border-b border-flowtrade-navy-lighter">
              <div className="flex items-center gap-3">
                {orgInfo.logo_url ? (
                  <Image
                    src={orgInfo.logo_url}
                    alt={orgInfo.name}
                    width={40}
                    height={40}
                    className="h-10 w-10 object-contain bg-white rounded p-1 flex-shrink-0"
                    unoptimized
                  />
                ) : (
                  <div className="h-10 w-10 bg-flowtrade-navy-lighter rounded flex items-center justify-center flex-shrink-0">
                    <span className="text-flowtrade-cyan font-bold text-lg">
                      {orgInfo.name?.charAt(0) || 'O'}
                    </span>
                  </div>
                )}
                <p className="text-sm text-gray-300 truncate font-medium">{orgInfo.name}</p>
              </div>
            </div>
          )}

          {/* Mobile Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => renderNavItem(item, true))}
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
          {/* FlowTrade Logo - PRIMARY BRANDING (always visible at top) */}
          <div className="flex items-center h-16 px-4 border-b border-flowtrade-navy-lighter bg-flowtrade-navy">
            <Link href="/dashboard" className="flex items-center">
              <Image
                src="/flowtrade-logo.svg"
                alt="FlowTrade"
                width={120}
                height={32}
                className="h-8 w-auto"
                priority
              />
            </Link>
          </div>

          {/* User Organization - SECONDARY BRANDING (below FlowTrade logo) */}
          {orgInfo && (
            <div className="px-4 py-3 border-b border-flowtrade-navy-lighter">
              <div className="flex items-center gap-3">
                {orgInfo.logo_url ? (
                  <Image
                    src={orgInfo.logo_url}
                    alt={orgInfo.name}
                    width={40}
                    height={40}
                    className="h-10 w-10 object-contain bg-white rounded p-1 flex-shrink-0"
                    unoptimized
                  />
                ) : (
                  <div className="h-10 w-10 bg-flowtrade-navy-lighter rounded flex items-center justify-center flex-shrink-0">
                    <span className="text-flowtrade-cyan font-bold text-lg">
                      {orgInfo.name?.charAt(0) || 'O'}
                    </span>
                  </div>
                )}
                <p className="text-sm text-gray-300 truncate font-medium">{orgInfo.name}</p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => renderNavItem(item, false))}
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

      {/* Main content - MOBILE FIX: Added overflow-x-hidden and max-w-full */}
      <main className="flex-1 lg:pl-64 w-full max-w-full overflow-x-hidden">
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
          <Link href="/dashboard" className="flex items-center">
            <Image
              src="/flowtrade-logo.svg"
              alt="FlowTrade"
              width={105}
              height={28}
              className="h-7 w-auto"
              priority
            />
          </Link>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Page content - MOBILE FIX: Added overflow-x-hidden and box-sizing control */}
        <div className="p-4 sm:p-6 lg:p-8 w-full max-w-full overflow-x-hidden box-border">
          {children}
        </div>
      </main>
    </div>
  )
}
