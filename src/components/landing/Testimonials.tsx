const principles = [
  {
    title: 'Quote from the van',
    body: 'Build a quote on site while the job is still fresh - line items, materials and your saved formulas, priced and sent before you drive away.',
  },
  {
    title: 'Your customer just clicks',
    body: 'Quotes land as a link, not an attachment. Your customer opens it on their phone, accepts or declines, and you know the moment they do.',
  },
  {
    title: 'Accepted quote becomes the job',
    body: 'No re-typing. An accepted quote turns into a scheduled job, and the job turns into an invoice - the same numbers the whole way through.',
  },
]

export default function Testimonials() {
  return (
    <section className="py-20 bg-flowtrade-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-flowtrade-light mb-4">
            Built for Australian trades
          </h2>
          <p className="text-xl text-flowtrade-slate max-w-2xl mx-auto">
            Quote, schedule and invoice in one run - without the paperwork night.
          </p>
        </div>

        {/* Capability cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {principles.map((item) => (
            <div
              key={item.title}
              className="p-8 bg-flowtrade-navy rounded-2xl border border-flowtrade-dark"
            >
              <h3 className="text-lg font-semibold text-flowtrade-light mb-3">
                {item.title}
              </h3>
              <p className="text-flowtrade-slate">
                {item.body}
              </p>
            </div>
          ))}
        </div>

        {/* Early Access Note */}
        <div className="text-center mt-12">
          <p className="text-flowtrade-slate text-sm">
            FlowTrade is in early access. Be one of the first Australian tradies to transform your business.
          </p>
        </div>
      </div>
    </section>
  )
}
