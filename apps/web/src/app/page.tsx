import Link from 'next/link'

const features = [
  {
    title: 'Equity Calculator',
    description: 'Calculate equity between hand ranges with board cards. Explore matchups with heatmaps, charts, and detailed breakdowns.',
    href: '/equity',
    icon: '📊',
  },
  {
    title: 'Study',
    description: 'Interactive GTO training with preflop ranges, postflop analysis, and street-by-street navigation.',
    href: '/study',
    icon: '🎓',
  },
  {
    title: 'Practice',
    description: 'Practice GTO concepts with interactive quizzes, spot recognition, and performance tracking.',
    href: '/practice',
    icon: '🎯',
  },
  {
    title: 'Analyze',
    description: 'Upload and analyze hand histories. Identify leaks, review decisions, and track progress over time.',
    href: '/analyze',
    icon: '🔍',
  },
  {
    title: 'ICM Calculator',
    description: 'Make better tournament decisions with ICM-aware analysis. Factor in bubble pressure and prize structures.',
    href: '/icm',
    icon: '🏆',
  },
  {
    title: 'Courses',
    description: 'Structured learning paths covering fundamental to advanced GTO poker strategy concepts.',
    href: '/courses',
    icon: '📚',
  },
  {
    title: 'Push/Fold Charts',
    description: 'Tournament push/fold Nash equilibrium ranges by position and stack depth.',
    href: '/push-fold',
    icon: '📈',
  },
  {
    title: 'Range Explorer',
    description: 'Explore GTO ranges with interactive matrix. Visualize frequencies by position and stack depth.',
    href: '/range-explorer',
    icon: '🔬',
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
    title: 'Game Variants',
    description: 'Equity calculations for PLO, Omaha Hi-Lo, Short Deck, Stud, Razz, Badugi, and more.',
    href: '/variants',
    icon: '🃏',
  },
  {
    title: 'Hand History',
    description: 'Import and review your hands. Track decisions, compare vs GTO, and fix leaks.',
    href: '/hand-history',
    icon: '📝',
  },
]

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 lg:py-10">
      {/* Hero Section */}
      <section className="text-center mb-10 sm:mb-12 lg:mb-14">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-5 relative"
          style={{
            background: 'linear-gradient(135deg, rgba(0,200,83,0.15) 0%, rgba(0,200,83,0.05) 100%)',
            border: '1px solid rgba(0,200,83,0.2)',
          }}>
          <span className="text-4xl">♠</span>
          <div className="absolute -inset-0.5 rounded-2xl opacity-0 hover:opacity-100 transition-opacity"
            style={{
              background: 'linear-gradient(135deg, rgba(0,200,83,0.08), transparent)',
              zIndex: -1,
            }} />
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-3 tracking-tight">
          <span style={{ color: 'var(--green)' }}>GTO</span>{' '}
          <span style={{ color: 'var(--text)' }}>Wizard</span>
        </h1>
        <p className="text-sm sm:text-base max-w-xl mx-auto px-4 mb-8" style={{ color: 'var(--muted)' }}>
          Master optimal poker strategy with cutting-edge GTO analysis tools.
          Train smarter, analyze deeper, and play better.
        </p>
        <div className="flex flex-wrap justify-center gap-3 relative">
          {/* Radial gradient glow behind CTA buttons */}
          <div className="absolute inset-0 -z-10 opacity-60 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(0,200,83,0.25) 0%, transparent 70%)',
              filter: 'blur(20px)',
              transform: 'translateY(10px)',
            }}
          />
          <Link
            href="/study"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:brightness-110"
            style={{ backgroundColor: 'var(--green)', color: '#000' }}
          >
            🎓 Start Studying
          </Link>
          <Link
            href="/equity"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--text)',
              backgroundColor: 'var(--panel)',
            }}
          >
            📊 Calculate Equity
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {features.map((feature) => (
          <Link
            key={feature.title}
            href={feature.href}
            className="feature-card group block rounded-xl"
            style={{
              backgroundColor: 'var(--panel)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                  style={{ backgroundColor: 'var(--green-dim)' }}
                >
                  {feature.icon}
                </div>
                <h2
                  className="text-sm sm:text-base font-semibold transition-colors group-hover:text-[var(--green)]"
                  style={{ color: 'var(--text)' }}
                >
                  {feature.title}
                </h2>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                {feature.description}
              </p>
            </div>
          </Link>
        ))}
      </section>

      {/* Stats / Trust Bar */}
      <section className="mt-12 pt-8 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Hands Analyzed', value: '1M+' },
            { label: 'Active Users', value: '10K+' },
            { label: 'GTO Solutions', value: '500+' },
            { label: 'Training Modules', value: '50+' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--green)' }}>
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm mt-1" style={{ color: 'var(--muted)' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="mt-12 text-center">
        <p className="text-xs sm:text-sm" style={{ color: 'var(--muted)' }}>
          Built for serious poker players. Data-driven. GTO-optimized.
        </p>
      </section>
    </div>
  )
}
