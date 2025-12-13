const integrations = [
  { name: 'Xero', category: 'Accounting', status: 'available' },
  { name: 'MYOB', category: 'Accounting', status: 'available' },
  { name: 'Stripe', category: 'Payments', status: 'available' },
  { name: 'Square', category: 'Payments', status: 'available' },
  { name: 'ClickSend', category: 'SMS', status: 'available' },
  { name: 'Google Calendar', category: 'Scheduling', status: 'available' },
  { name: 'Google Maps', category: 'Routing', status: 'available' },
  { name: 'ABN Lookup', category: 'Verification', status: 'available' },
]

const comingSoon = [
  { name: 'Reece', category: 'Plumbing Supplier' },
  { name: 'Rexel', category: 'Electrical Supplier' },
  { name: 'Tradelink', category: 'Plumbing Supplier' },
]

export default function Integrations() {
  return (
    <section id="integrations" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-flowtrade-navy mb-4">
            Connects to the Tools You Already Use
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            FlowTrade syncs with your accounting software, payment providers, and Australian suppliers.
          </p>
        </div>

        {/* Integration Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
          {integrations.map((integration, index) => (
            <div
              key={index}
              className="p-6 bg-gray-50 rounded-xl border border-gray-100 hover:border-flowtrade-cyan/30 hover:shadow-md transition-all text-center"
            >
              <div className="text-2xl font-bold text-flowtrade-navy mb-2">
                {integration.name}
              </div>
              <div className="text-sm text-gray-500 mb-3">
                {integration.category}
              </div>
              <div className="inline-flex items-center text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
                Available
              </div>
            </div>
          ))}
        </div>

        {/* Coming Soon */}
        <div className="bg-gray-50 rounded-2xl p-8">
          <h3 className="text-lg font-semibold text-flowtrade-navy mb-4">
            Coming Soon: Australian Supplier Integrations
          </h3>
          <div className="flex flex-wrap gap-4">
            {comingSoon.map((item, index) => (
              <div
                key={index}
                className="inline-flex items-center px-4 py-2 bg-white rounded-lg border border-gray-200"
              >
                <span className="text-gray-700 font-medium">{item.name}</span>
                <span className="ml-2 text-xs text-gray-500">({item.category})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
