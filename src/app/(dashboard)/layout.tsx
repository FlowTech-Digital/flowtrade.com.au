'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Home, FileText, Users, Settings, LogOut, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Quotes', href: '/quotes', icon: FileText },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading, signOut } = useAuth()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

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

  return (
    <div className="flex min-h-screen bg-flowtrade-navy">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-flowtrade-navy-light border-r border-flowtrade-navy-lighter hidden lg:block">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-flowtrade-navy-lighter">
            <Link href="/dashboard">
              <img
                src="/flowtrade-logo.svg"
                alt="FlowTrade"
                width={140}
                height={32}
                className="h-8 w-auto"
              />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
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
        <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-6 bg-flowtrade-navy-light border-b border-flowtrade-navy-lighter lg:hidden">
          <Link href="/dashboard">
            <img
              src="/flowtrade-logo.svg"
              alt="FlowTrade"
              width={120}
              height={28}
              className="h-7 w-auto"
            />
          </Link>
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
