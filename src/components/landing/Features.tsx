const features = [
  {
    title: 'Professional Quoting',
    subtitle: 'Your customers will think you hired a designer.',
    description: 'Create quotes in under 5 minutes with pre-built templates, photo attachments, and material lists. Track views and responses in real-time.',
    benefits: [
      'Pre-built job templates',
      'Add photos and notes',
      'Track views and responses',
      'Send via SMS or email',
    ],
    imageAlt: 'Quote creation interface',
  },
  {
    title: 'Job Management',
    subtitle: 'Know where every job stands, always.',
    description: 'Drag-and-drop scheduling, real-time job status updates, and offline capability for when you\'re in the field without signal.',
    benefits: [
      'Drag-and-drop scheduling',
      'Works offline',
      'Real-time status updates',
      'Assign to team members',
    ],
    imageAlt: 'Job management dashboard',
  },
  {
    title: 'Smart Invoicing',
    subtitle: 'Get paid faster with automated invoicing.',
    description: 'Convert quotes to invoices in one tap. Auto-sync with Xero or MYOB. Accept card payments on-site and send payment reminders automatically.',
    benefits: [
      'One-tap quote to invoice',
      'Xero & MYOB sync',
      'On-site card payments',
      'Automatic reminders',
    ],
    imageAlt: 'Invoicing interface',
  },
]

export default function Features() {
  return (
    <section id="features" className="py-20 bg-flowtrade-navy">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-flowtrade-light mb-4">
            Built for the Way You Work
          </h2>
          <p className="text-xl text-flowtrade-slate max-w-2xl mx-auto">
            Every feature designed with Australian tradies in mind.
          </p>
        </div>

        {/* Features List */}
        <div className="space-y-24">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`flex flex-col lg:flex-row gap-12 items-center ${
                index % 2 === 1 ? 'lg:flex-row-reverse' : ''
              }`}
            >
              {/* Content */}
              <div className="lg:w-1/2 space-y-6">
                <h3 className="text-2xl sm:text-3xl font-bold text-flowtrade-light">
                  {feature.title}
                </h3>
                <p className="text-lg text-flowtrade-cyan font-medium">
                  {feature.subtitle}
                </p>
                <p className="text-flowtrade-slate text-lg leading-relaxed">
                  {feature.description}
                </p>
                <ul className="space-y-3">
                  {feature.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-center text-flowtrade-light/80">
                      <svg className="w-5 h-5 text-flowtrade-cyan mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Visual */}
              <div className="lg:w-1/2">
                <div className="bg-flowtrade-dark border border-flowtrade-navy rounded-2xl p-8 aspect-[4/3] flex items-center justify-center">
                  <div className="text-flowtrade-slate/50 text-lg">{feature.imageAlt}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
