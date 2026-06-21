'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navTabs = [
  { href: '/equity', label: "Hold'em" },
  { href: '/equity/plo', label: 'PLO' },
  { href: '/equity/stud', label: 'Stud' },
  { href: '/equity/razz', label: 'Razz' },
  { href: '/equity/badugi', label: 'Badugi' },
  { href: '/play', label: 'Play' },
  { href: '/study', label: 'Study', highlight: true },
  { href: '/push-fold', label: 'Push/Fold', badge: 'NEW' },
  { href: '/range-explorer', label: 'Range', badge: 'NEW' },
  { href: '/practice', label: 'Practice' },
  { href: '/analyze', label: 'Analyze' },
]

export default function Header() {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <nav style={{
      height: 52, background: '#111111', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '0 14px', borderBottom: '1px solid #1a1a1a',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link href="/study" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6, background: '#00C853',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, color: '#000', fontSize: 18, letterSpacing: -0.5,
          }}>W</div>
        </Link>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        background: '#0a0a0a', padding: 3, borderRadius: 10, border: '1px solid #1d1d1d',
      }} className="nav-center">
        {navTabs.map((tab) => {
          const active = isActive(tab.href)
          return (
            <Link key={tab.href} href={tab.href}
              style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 13,
                color: active ? '#fff' : '#9a9a9a', cursor: 'pointer',
                fontWeight: tab.highlight && active ? 600 : 500,
                display: 'flex', alignItems: 'center', gap: 6,
                whiteSpace: 'nowrap', transition: '.15s', textDecoration: 'none',
                background: tab.highlight && active ? '#00C853'
                  : active ? '#222' : 'transparent',
              }}
            >
              {tab.highlight && (active ? '🎓 ' : '🎓 ')}{tab.label}
              {tab.badge && (
                <span style={{
                  background: '#00C853', color: '#000', fontSize: 10, padding: '2px 5px',
                  borderRadius: 4, fontWeight: 700, lineHeight: 1,
                }}>{tab.badge}</span>
              )}
            </Link>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button style={{
          background: '#00C853', color: '#000', border: 'none', padding: '7px 13px',
          borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer',
        }}>👑 Upgrade</button>
      </div>
    </nav>
  )
}
