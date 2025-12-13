export default function TrustBar() {
  return (
    <section className="bg-gray-50 border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Australian Badge */}
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🇦🇺</span>
            <span className="text-gray-700 font-medium">Australian-Owned & Operated</span>
          </div>

          {/* Integration Logos */}
          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400">Xero</div>
              <div className="text-xs text-gray-500">Accounting</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400">MYOB</div>
              <div className="text-xs text-gray-500">Accounting</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400">Stripe</div>
              <div className="text-xs text-gray-500">Payments</div>
            </div>
          </div>

          {/* ABN */}
          <div className="text-gray-500 text-sm">
            ABN: 76689878420
          </div>
        </div>
      </div>
    </section>
  )
}
