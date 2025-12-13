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
    <section id="integrations" className="py-20 bg-flowtrade-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-flowtrade-light mb-4">
            Connects to the Tools You Already Use
          </h2>
          <p className="text-xl text-flowtrade-slate max-w-2xl mx-auto">
            FlowTrade syncs with your accounting software, payment providers, and Australian suppliers.
          </p>
        </div>

        {/* Integration Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
          {integrations.map((integration, index) => (
            <div
              key={index}
              className="p-6 bg-flowtrade-navy rounded-xl border border-flowtrade-dark hover:border-flowtrade-cyan/30 hover:shadow-md hover:shadow-flowtrade-cyan/5 transition-all text-center"
            >
              <div className="text-2xl font-bold text-flowtrade-light mb-2">
                {integration.name}
              </div>
              <div className="text-sm text-flowtrade-slate mb-3">
                {integration.category}
              </div>
              <div className="inline-flex items-center text-xs font-medium text-flowtrade-cyan bg-flowtrade-cyan/10 px-2 py-1 rounded-full">
                <span className="w-2 h-2 bg-flowtrade-cyan rounded-full mr-1.5"></span>
                Available
              </div>
            </div>
          ))}
        </div>

        {/* Coming Soon */}
        <div className="bg-flowtrade-navy rounded-2xl p-8 border border-flowtrade-dark">
          <h3 className="text-lg font-semibold text-flowtrade-light mb-4">
            Coming Soon: Australian Supplier Integrations
          </h3>
          <div className="flex flex-wrap gap-4">
            {comingSoon.map((item, index) => (
              <div
                key={index}
                className="inline-flex items-center px-4 py-2 bg-flowtrade-dark rounded-lg border border-flowtrade-navy"
              >
                <span className="text-flowtrade-light/80 font-medium">{item.name}</span>
                <span className="ml-2 text-xs text-flowtrade-slate">({item.category})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
