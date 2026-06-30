'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const footerIcons = [
  { href: '/study', label: 'Main menu', symbol: '☰', ariaLabel: 'Open main menu' },
  { href: '/study', label: 'Session', symbol: '🪙', ariaLabel: 'Session settings' },
  { href: '/study', label: 'Audio', symbol: '🔊', ariaLabel: 'Audio settings' },
  { href: '/study', label: 'Profile', symbol: '👤', ariaLabel: 'User profile' },
  { href: '/study', label: 'Settings', symbol: '⚙', ariaLabel: 'Display settings' },
  { href: '/study', label: 'Visibility', symbol: '👁', ariaLabel: 'Toggle visibility' },
]

export default function Footer() {
  const pathname = usePathname()

  return (
    <footer
      role="contentinfo"
      style={{
        height: 44,
        background: '#0d0d0d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: '0 12px',
        borderTop: '1px solid #1a1a1a',
        flexShrink: 0,
      }}
      className="no-print"
    >
      {footerIcons.map((icon) => {
        const active = pathname === icon.href
        return (
          <Link
            key={icon.label}
            href={icon.href}
            aria-label={icon.ariaLabel}
            tabIndex={0}
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              fontSize: 18,
              color: active ? '#00C853' : '#888',
              background: active ? 'rgba(0,200,83,0.12)' : 'transparent',
              textDecoration: 'none',
              transition: 'color 0.15s, background 0.15s',
              cursor: 'pointer',
              flexShrink: 0,
              lineHeight: 1,
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.color = '#ccc'
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.color = '#888'
            }}
          >
            {icon.symbol}
          </Link>
        )
      })}
    </footer>
  )
}
