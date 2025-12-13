export default function TrustBar() {
  return (
    <section className="bg-flowtrade-navy/50 border-y border-flowtrade-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Australian Badge */}
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🇦🇺</span>
            <span className="text-flowtrade-light font-medium">Australian-Owned & Operated</span>
          </div>

          {/* Integration Logos */}
          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-flowtrade-light/80">Xero</div>
              <div className="text-xs text-flowtrade-slate">Accounting</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-flowtrade-light/80">MYOB</div>
              <div className="text-xs text-flowtrade-slate">Accounting</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-flowtrade-light/80">Stripe</div>
              <div className="text-xs text-flowtrade-slate">Payments</div>
            </div>
          </div>

          {/* ABN */}
          <div className="text-flowtrade-slate text-sm">
            ABN: 76689878420
          </div>
        </div>
      </div>
    </section>
  )
}
