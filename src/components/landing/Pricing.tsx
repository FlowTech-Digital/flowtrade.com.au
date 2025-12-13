import Link from 'next/link'

const plans = [
  {
    name: 'Starter',
    price: '$59',
    period: '/month',
    description: 'Perfect for solo tradies getting organised',
    users: '1 user',
    features: [
      'Unlimited quotes',
      'Unlimited invoices',
      'Basic scheduling',
      'Customer CRM',
      'Mobile app',
      'Stripe payments',
      '50 SMS/month',
    ],
    cta: 'Start Free Trial',
    featured: false,
  },
  {
    name: 'Team',
    price: '$149',
    period: '/month',
    description: 'For growing teams that need coordination',
    users: 'Up to 5 users',
    features: [
      'Everything in Starter',
      'Team scheduling',
      'Xero & MYOB sync',
      'Job management',
      'Team timesheets',
      '200 SMS/month',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    featured: true,
  },
  {
    name: 'Business',
    price: '$299',
    period: '/month',
    description: 'For established businesses needing insights',
    users: 'Up to 15 users',
    features: [
      'Everything in Team',
      'Advanced reports',
      'API access',
      'Custom fields',
      'Supplier integrations',
      '500 SMS/month',
      'Dedicated support',
    ],
    cta: 'Start Free Trial',
    featured: false,
  },
]

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-flowtrade-navy">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-flowtrade-light mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-flowtrade-slate max-w-2xl mx-auto">
            All prices in AUD. No hidden fees. Cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative p-8 rounded-2xl ${
                plan.featured
                  ? 'bg-flowtrade-dark text-white ring-4 ring-flowtrade-cyan'
                  : 'bg-flowtrade-dark border border-flowtrade-navy'
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-flowtrade-orange text-white text-sm font-semibold px-4 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className={`text-xl font-bold mb-2 ${plan.featured ? 'text-white' : 'text-flowtrade-light'}`}>
                  {plan.name}
                </h3>
                <div className="mb-2">
                  <span className={`text-4xl font-bold ${plan.featured ? 'text-white' : 'text-flowtrade-light'}`}>
                    {plan.price}
                  </span>
                  <span className={plan.featured ? 'text-white/70' : 'text-flowtrade-slate'}>
                    {plan.period}
                  </span>
                </div>
                <p className={`text-sm ${plan.featured ? 'text-white/80' : 'text-flowtrade-slate'}`}>
                  {plan.users}
                </p>
              </div>

              <p className={`text-center mb-6 ${plan.featured ? 'text-white/80' : 'text-flowtrade-slate'}`}>
                {plan.description}
              </p>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <svg
                      className="w-5 h-5 mr-3 flex-shrink-0 text-flowtrade-cyan"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className={plan.featured ? 'text-white/90' : 'text-flowtrade-light/80'}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className="block w-full text-center py-3 rounded-lg font-semibold transition-colors bg-flowtrade-cyan text-flowtrade-dark hover:bg-flowtrade-cyan-light"
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Enterprise CTA */}
        <div className="text-center mt-12">
          <p className="text-flowtrade-slate mb-4">Need more than 15 users?</p>
          <a
            href="#contact"
            className="text-flowtrade-cyan hover:text-flowtrade-cyan-light font-semibold"
          >
            Contact us for Enterprise pricing →
          </a>
        </div>

        {/* FAQ Preview */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h3 className="text-xl font-bold text-flowtrade-light mb-6 text-center">
            Common Questions
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-flowtrade-dark border border-flowtrade-navy p-6 rounded-xl">
              <h4 className="font-semibold text-flowtrade-light mb-2">Can I change plans later?</h4>
              <p className="text-flowtrade-slate text-sm">Yes, upgrade or downgrade anytime. Changes take effect on your next billing cycle.</p>
            </div>
            <div className="bg-flowtrade-dark border border-flowtrade-navy p-6 rounded-xl">
              <h4 className="font-semibold text-flowtrade-light mb-2">Is there a contract?</h4>
              <p className="text-flowtrade-slate text-sm">No contracts. Cancel anytime with 30 days notice.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
