import Link from 'next/link'

const features = [
  {
    title: 'Equity Calculator',
    description: 'Calculate equity between hand ranges with board cards. Explore matchups with heatmaps, charts, and detailed breakdowns.',
    href: '/equity',
    icon: '📊',
  },
  {
    title: 'ICM Calculator',
    description: 'Make better tournament decisions with ICM-aware analysis. Factor in bubble pressure and prize pool structures.',
    href: '/icm',
    icon: '🏆',
  },
  {
    title: 'Training Mode',
    description: 'Practice GTO concepts with interactive quizzes, spot recognition, and performance tracking.',
    href: '/train',
    icon: '🎯',
  },
  {
    title: 'Courses',
    description: 'Structured learning paths covering fundamental to advanced GTO poker strategy concepts.',
    href: '/courses',
    icon: '📚',
  },
  {
    title: 'Analyze',
    description: 'Upload and analyze hand histories. Identify leaks, review decisions, and track your progress over time.',
    href: '/analyze',
    icon: '🔍',
  },
  {
    title: 'Strategy Explorer',
    description: 'Browse GTO solutions by spot, position, and stack depth. Compare strategies and export data.',
    href: '/strategy',
    icon: '♠',
  },
  {
    title: 'Spots Database',
    description: 'Search and filter common poker spots. Study preflop and postflop GTO solutions.',
    href: '/spots',
    icon: '🎲',
  },
  {
    title: 'Strategies',
    description: 'Access a library of pre-solved GTO strategies. Filter by game type, position, and stack depth.',
    href: '/strategies',
    icon: '📋',
  },
]

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 lg:py-10">
      {/* Hero Section */}
      <section className="text-center mb-8 sm:mb-10 lg:mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-[--panel] border border-[--border] mb-4">
          <span className="text-3xl">♠</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
          <span style={{ color: 'var(--green)' }}>GTO</span>{' '}
          <span style={{ color: 'var(--text)' }}>Wizard</span>
        </h1>
        <p className="text-sm sm:text-base text-[--muted] max-w-xl mx-auto px-4 mb-6">
          Master optimal poker strategy with cutting-edge GTO analysis tools.
          Train smarter, analyze deeper, and play better.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/equity"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all"
            style={{ backgroundColor: 'var(--green)', color: '#000' }}
          >
            <span>📊</span> Get Started
          </Link>
          <Link
            href="/train"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all border"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            <span>🎯</span> Start Training
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {features.map((feature) => (
          <Link
            key={feature.title}
            href={feature.href}
            className="group block p-4 sm:p-5 rounded-lg transition-all hover:-translate-y-0.5 hover:border-[var(--green)] hover:shadow-[0_4px_20px_rgba(0,200,83,0.08)]"
            style={{
              backgroundColor: 'var(--panel)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">{feature.icon}</div>
            <h2
              className="text-base sm:text-lg font-semibold mb-1.5 transition-colors"
              style={{ color: 'var(--text)' }}
            >
              {feature.title}
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              {feature.description}
            </p>
          </Link>
        ))}
      </section>

      {/* Stats / Trust Bar */}
      <section
        className="mt-10 sm:mt-12 lg:mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 border-t pt-6 sm:pt-8"
        style={{ borderColor: 'var(--border)' }}
      >
        {[
          { label: 'Hands Analyzed', value: '1M+' },
          { label: 'Active Users', value: '10K+' },
          { label: 'GTO Solutions', value: '500+' },
          { label: 'Training Modules', value: '50+' },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--green)' }}>
              {stat.value}
            </div>
            <div className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </section>

      {/* Bottom CTA */}
      <section className="mt-10 sm:mt-12 text-center">
        <p className="text-xs sm:text-sm" style={{ color: 'var(--muted)' }}>
          Built for serious poker players. Data-driven. GTO-optimized.
        </p>
      </section>
    </div>
  )
}
