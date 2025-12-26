const testimonials = [
  {
    initials: 'MT',
    name: 'Mike T.',
    role: 'Plumber, Melbourne',
    quote: "Since switching to FlowTrade, I've been sending quotes from the van right after inspections. Clients love getting a professional quote within the hour.",
  },
  {
    initials: 'JS',
    name: 'James S.',
    role: 'Electrician, Sydney',
    quote: "My quotes look like they came from a much bigger operation now. Already had a couple of clients mention how professional everything feels.",
  },
  {
    initials: 'RK',
    name: 'Rachel K.',
    role: 'HVAC, Brisbane',
    quote: "Finally, software that doesn't make me feel like I need a degree in IT. Set it up in one afternoon and it's been smooth sailing since.",
  },
]

export default function Testimonials() {
  return (
    <section className="py-20 bg-flowtrade-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-flowtrade-light mb-4">
            Trusted by Australian Tradies
          </h2>
          <p className="text-xl text-flowtrade-slate max-w-2xl mx-auto">
            See why businesses like yours choose FlowTrade.
          </p>
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.initials}
              className="p-8 bg-flowtrade-navy rounded-2xl border border-flowtrade-dark"
            >
              <div className="flex items-center mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className="w-5 h-5 text-flowtrade-orange"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-flowtrade-slate mb-6 italic">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-flowtrade-cyan/20 rounded-full flex items-center justify-center text-flowtrade-cyan font-bold">
                  {testimonial.initials}
                </div>
                <div className="ml-4">
                  <div className="font-semibold text-flowtrade-light">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-flowtrade-slate">
                    {testimonial.role}
                  </div>
                </div>
              </div>
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
