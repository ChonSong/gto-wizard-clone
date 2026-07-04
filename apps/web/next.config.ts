import withPWAInit from '@ducanh2912/next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@gto-wizard/ui-components', '@gto-wizard/types'],
  compress: true,
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: '/range',
        destination: '/range-explorer',
        permanent: true,
      },
    ]
  },
  images: {
    formats: ['image/avif', 'image/webp'] as unknown as ['image/avif' | 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  typescript: {
    // Type checking enabled — all errors resolved
  },
  // Proxy /api, /icm, /plo4, /double-board, /bomb-pot, /ws to backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/api/:path*`,
      },
      {
        source: '/icm/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/icm/:path*`,
      },
      {
        source: '/omaha/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/omaha/:path*`,
      },
      {
        source: '/plo4/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/plo4/:path*`,
      },
      {
        source: '/double-board/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/double-board/:path*`,
      },
      {
        source: '/bomb-pot/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/bomb-pot/:path*`,
      },
      {
        source: '/ws/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/ws/:path*`,
      },
    ]
  },
}

export default withPWA(nextConfig)
