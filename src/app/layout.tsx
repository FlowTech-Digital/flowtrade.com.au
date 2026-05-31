import type { Metadata } from 'next'
import { IBM_Plex_Sans, Michroma } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { Providers } from '@/providers/Providers'

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans',
  display: 'swap',
})

const michroma = Michroma({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-michroma',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'FlowTrade — Quote · Schedule · Invoice',
    template: '%s | FlowTrade',
  },
  description:
    'Job-management software for Australian trades. Quote, schedule, invoice and track every job from first quote to paid invoice — all from your phone.',
  keywords: ['job management', 'quoting', 'scheduling', 'invoicing', 'trades', 'electricians', 'plumbers', 'HVAC', 'Australia'],
  authors: [{ name: 'FlowTrade' }],
  creator: 'FlowTrade',
  publisher: 'FlowTech AI PTY LTD',
  metadataBase: new URL('https://flowtrade.com.au'),
  icons: {
    icon: { url: '/favicon.svg', type: 'image/svg+xml' },
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'en_AU',
    url: 'https://flowtrade.com.au',
    title: 'FlowTrade — Quote · Schedule · Invoice',
    description:
      'Job-management software for Australian trades — quoting, scheduling, invoicing and job tracking.',
    siteName: 'FlowTrade',
    images: [
      {
        url: 'https://flowtrade.com.au/og-image-v5.png',
        width: 1200,
        height: 630,
        alt: 'FlowTrade — Quote · Schedule · Invoice',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FlowTrade — Quote · Schedule · Invoice',
    description:
      'Job-management software for Australian trades — quoting, scheduling, invoicing and job tracking.',
    images: ['https://flowtrade.com.au/og-image-v5.png'],
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
    <html lang="en" className={`${ibmPlexSans.variable} ${michroma.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  )
}
