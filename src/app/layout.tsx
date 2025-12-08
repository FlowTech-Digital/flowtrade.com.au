import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { Providers } from '@/providers/Providers'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'FlowTrade - Smart Estimating for Australian Trades',
    template: '%s | FlowTrade',
  },
  description: 'AI-powered quoting and estimating software for HVAC, Electrical, and Plumbing trades. Create professional quotes in minutes, not hours.',
  keywords: ['quoting software', 'estimating', 'HVAC', 'electrical', 'plumbing', 'trades', 'Australia'],
  authors: [{ name: 'FlowTrade' }],
  creator: 'FlowTrade',
  publisher: 'FlowTech AI PTY LTD',
  metadataBase: new URL('https://flowtrade.com.au'),
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/favicon.svg',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'en_AU',
    url: 'https://flowtrade.com.au',
    title: 'FlowTrade - Smart Estimating for Australian Trades',
    description: 'AI-powered quoting and estimating software for HVAC, Electrical, and Plumbing trades.',
    siteName: 'FlowTrade',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FlowTrade - Smart Estimating for Australian Trades',
    description: 'AI-powered quoting and estimating software for HVAC, Electrical, and Plumbing trades.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  )
}
