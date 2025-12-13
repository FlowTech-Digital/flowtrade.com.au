export default function TrustBar() {
  return (
    <section className="bg-slate-800/50 border-y border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Australian Badge */}
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🇦🇺</span>
            <span className="text-slate-200 font-medium">Australian-Owned & Operated</span>
          </div>

          {/* Integration Logos */}
          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-300">Xero</div>
              <div className="text-xs text-slate-500">Accounting</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-300">MYOB</div>
              <div className="text-xs text-slate-500">Accounting</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-300">Stripe</div>
              <div className="text-xs text-slate-500">Payments</div>
            </div>
          </div>

          {/* ABN */}
          <div className="text-slate-400 text-sm">
            ABN: 76689878420
          </div>
        </div>
      </div>
    </section>
  )
}
