import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-8">
        <img 
          src="/flowtrade-logo.svg" 
          alt="FlowTrade" 
          className="h-16 w-auto mx-auto"
        />
        <p className="text-xl text-muted-foreground max-w-2xl">
          Smart Estimating for Australian Trades.
          AI-powered quoting for HVAC, Electrical, and Plumbing businesses.
        </p>
        <div className="flex gap-4 justify-center">
          <Link 
            href="/login"
            className="px-6 py-3 bg-flowtrade-blue text-white rounded-lg hover:bg-flowtrade-blue-dark transition-colors"
          >
            Sign In
          </Link>
          <Link 
            href="/signup"
            className="px-6 py-3 border border-flowtrade-blue text-flowtrade-blue rounded-lg hover:bg-flowtrade-blue/10 transition-colors"
          >
            Get Started
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          🚧 App under development - Sprint 1 Week 1
        </p>
      </div>
    </main>
  )
}
