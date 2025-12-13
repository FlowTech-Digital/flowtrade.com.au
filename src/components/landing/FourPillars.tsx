const pillars = [
  {
    icon: '🎯',
    title: 'Win More Work',
    description: 'Create professional quotes in minutes. Impress customers with branded proposals that win jobs.',
  },
  {
    icon: '⚡',
    title: 'Work Smarter',
    description: 'Schedule jobs, dispatch your team, and track progress—all from your phone.',
  },
  {
    icon: '💰',
    title: 'Get Paid Faster',
    description: 'Send invoices instantly. Connect to Xero or MYOB. Accept card payments on-site.',
  },
  {
    icon: '📈',
    title: 'Grow Your Business',
    description: 'See what\'s working with real-time reports. Make smarter decisions with data.',
  },
]

export default function FourPillars() {
  return (
    <section className="py-20 bg-flowtrade-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-flowtrade-light mb-4">
            Everything You Need to Run Your Trade Business
          </h2>
          <p className="text-xl text-flowtrade-slate max-w-2xl mx-auto">
            From your first quote to your last invoice, FlowTrade handles it all.
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {pillars.map((pillar, index) => (
            <div
              key={index}
              className="group p-8 bg-flowtrade-navy rounded-2xl border border-flowtrade-dark hover:border-flowtrade-cyan/30 hover:shadow-xl hover:shadow-flowtrade-cyan/5 transition-all duration-300"
            >
              <div className="text-5xl mb-6">{pillar.icon}</div>
              <h3 className="text-xl font-bold text-flowtrade-light mb-3">
                {pillar.title}
              </h3>
              <p className="text-flowtrade-slate leading-relaxed">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
