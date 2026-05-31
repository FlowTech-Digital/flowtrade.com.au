type Variant = 'quotes' | 'jobs' | 'invoices'

interface FeatureItem {
  title: string
  subtitle: string
  description: string
  benefits: string[]
  variant: Variant
}

const features: FeatureItem[] = [
  {
    title: 'Professional Quoting',
    subtitle: 'Your customers will think you hired a designer.',
    description:
      'Create quotes in under 5 minutes with pre-built templates, photo attachments, and material lists. Track views and responses in real-time.',
    benefits: [
      'Pre-built job templates',
      'Add photos and notes',
      'Track views and responses',
      'Send via SMS or email',
    ],
    variant: 'quotes',
  },
  {
    title: 'Job Management',
    subtitle: 'Know where every job stands, always.',
    description:
      "Drag-and-drop scheduling, real-time job status updates, and offline capability for when you're in the field without signal.",
    benefits: [
      'Drag-and-drop scheduling',
      'Works offline',
      'Real-time status updates',
      'Assign to team members',
    ],
    variant: 'jobs',
  },
  {
    title: 'Smart Invoicing',
    subtitle: 'Get paid faster with automated invoicing.',
    description:
      'Convert quotes to invoices in one tap. Auto-sync with Xero or MYOB. Accept card payments on-site and send payment reminders automatically.',
    benefits: [
      'One-tap quote to invoice',
      'Xero & MYOB sync',
      'On-site card payments',
      'Automatic reminders',
    ],
    variant: 'invoices',
  },
]

interface TileData {
  label: string
  value: string
  accent?: boolean
}

interface RowData {
  title: string
  sub: string
  amount?: string
  badge: string
  badgeSolid?: boolean
}

interface MockupData {
  heading: string
  sub: string
  cta: string
  tiles: TileData[]
  rows: RowData[]
}

const MOCKUPS: Record<Variant, MockupData> = {
  quotes: {
    heading: 'Quotes',
    sub: 'Create and manage customer quotes',
    cta: 'New Quote',
    tiles: [
      { label: 'Total Quotes', value: '6' },
      { label: 'Pending', value: '4' },
      { label: 'Conversion', value: '33%', accent: true },
      { label: 'Total Value', value: '$4,178' },
    ],
    rows: [
      { title: 'QTE-202512-0859', sub: 'Smith Renovations Pty Ltd', amount: '$1,045.00', badge: 'Draft' },
      { title: 'QTE-202512-9712', sub: 'Smith Renovations Pty Ltd', amount: '$488.40', badge: 'Sent', badgeSolid: true },
    ],
  },
  jobs: {
    heading: 'Jobs',
    sub: 'Track and manage active jobs',
    cta: 'New Job',
    tiles: [
      { label: 'Total Jobs', value: '2' },
      { label: 'Active', value: '1', accent: true },
      { label: 'Completed', value: '1' },
      { label: 'Scheduled', value: '1' },
    ],
    rows: [
      { title: 'Kitchen Renovation', sub: 'Smith Residence', badge: 'In Progress', badgeSolid: true },
      { title: 'Bathroom Fit-out', sub: 'Johnson Project', badge: 'Scheduled' },
    ],
  },
  invoices: {
    heading: 'Invoices',
    sub: 'Send invoices and track payments',
    cta: 'New Invoice',
    tiles: [
      { label: 'Outstanding', value: '$1,533' },
      { label: 'Paid (30d)', value: '$12,480', accent: true },
      { label: 'Overdue', value: '$0' },
    ],
    rows: [
      { title: 'INV-2026-0042', sub: 'Smith Residence', amount: '$1,045.00', badge: 'Paid', badgeSolid: true },
      { title: 'INV-2026-0043', sub: 'Johnson Project', amount: '$488.40', badge: 'Sent' },
    ],
  },
}

function StatTile({ label, value, accent = false }: TileData) {
  return (
    <div className="bg-flowtrade-navy/60 rounded-lg p-3 border border-flowtrade-navy">
      <div className="text-[11px] text-flowtrade-slate">{label}</div>
      <div className={`text-lg font-bold ${accent ? 'text-flowtrade-cyan' : 'text-flowtrade-light'}`}>
        {value}
      </div>
    </div>
  )
}

function Badge({ label, solid = false }: { label: string; solid?: boolean }) {
  return (
    <span
      className={`px-2 py-0.5 text-[11px] font-medium rounded ${
        solid ? 'bg-flowtrade-cyan/15 text-flowtrade-cyan' : 'bg-flowtrade-navy text-flowtrade-slate'
      }`}
    >
      {label}
    </span>
  )
}

function RowItem({ title, sub, amount, badge, badgeSolid = false }: RowData) {
  return (
    <div className="flex items-center justify-between bg-flowtrade-navy/40 rounded-lg px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-sm font-medium text-flowtrade-light/90 truncate">{title}</div>
        <div className="text-xs text-flowtrade-slate truncate">{sub}</div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {amount && <span className="text-sm font-semibold text-flowtrade-light">{amount}</span>}
        <Badge label={badge} solid={badgeSolid} />
      </div>
    </div>
  )
}

function FeatureMockup({ variant }: { variant: Variant }) {
  const m = MOCKUPS[variant]
  return (
    <div className="w-full" aria-hidden="true">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-flowtrade-light">{m.heading}</div>
          <div className="text-xs text-flowtrade-slate truncate">{m.sub}</div>
        </div>
        <span className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg bg-flowtrade-cyan text-flowtrade-dark">
          + {m.cta}
        </span>
      </div>

      {/* Stat tiles */}
      <div className={`grid gap-3 mb-4 ${m.tiles.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {m.tiles.map((t) => (
          <StatTile key={t.label} label={t.label} value={t.value} accent={t.accent} />
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {m.rows.map((r) => (
          <RowItem
            key={r.title}
            title={r.title}
            sub={r.sub}
            amount={r.amount}
            badge={r.badge}
            badgeSolid={r.badgeSolid}
          />
        ))}
      </div>
    </div>
  )
}

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

              {/* Visual - coded brand mockup (replaces raster screenshots) */}
              <div className="lg:w-1/2 w-full">
                <div className="bg-flowtrade-dark border border-flowtrade-navy rounded-2xl shadow-2xl p-5">
                  <FeatureMockup variant={feature.variant} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
