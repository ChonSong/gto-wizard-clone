'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

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
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Close menu on navigation
  useEffect(() => { setMenuOpen(false) }, [pathname])

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

      {/* Desktop nav tabs */}
      {!isMobile && (
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
                  borderLeft: active ? '2px solid var(--green-lime)' : '2px solid transparent',
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
      )}

      {/* Mobile hamburger button */}
      {isMobile && (
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 8, display: 'flex', flexDirection: 'column', gap: 4,
            position: 'relative', zIndex: 60,
          }}
        >
          <span style={{ display: 'block', width: 20, height: 2, background: '#fff', borderRadius: 1, transition: 'all .2s', transform: menuOpen ? 'rotate(45deg) translate(4px, 4px)' : 'none' }} />
          <span style={{ display: 'block', width: 20, height: 2, background: '#fff', borderRadius: 1, transition: 'all .2s', opacity: menuOpen ? 0 : 1 }} />
          <span style={{ display: 'block', width: 20, height: 2, background: '#fff', borderRadius: 1, transition: 'all .2s', transform: menuOpen ? 'rotate(-45deg) translate(4px, -4px)' : 'none' }} />
        </button>
      )}

      {/* Mobile dropdown menu */}
      {isMobile && menuOpen && (
        <div
          className="nav-mobile-dropdown"
          style={{
            position: 'fixed', top: 52, left: 0, right: 0,
            background: '#111111', borderBottom: '1px solid #262626',
            padding: '8px 14px 14px',
            display: 'flex', flexDirection: 'column', gap: 2,
            zIndex: 55, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            maxHeight: 'calc(100vh - 52px)', overflowY: 'auto',
          }}
        >
          {navTabs.map((tab) => {
            const active = isActive(tab.href)
            return (
              <Link key={tab.href} href={tab.href}
                style={{
                  padding: '10px 14px', borderRadius: 8, fontSize: 14,
                  color: active ? '#fff' : '#ccc',
                  fontWeight: active ? 600 : 500,
                  textDecoration: 'none',
                  background: active ? '#1a3a2a' : 'transparent',
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: '.1s',
                  borderLeft: active ? '2px solid var(--green-lime)' : '2px solid transparent',
                }}
                onClick={() => setMenuOpen(false)}
              >
                {tab.highlight && '🎓 '}{tab.label}
                {tab.badge && (
                  <span style={{
                    background: '#00C853', color: '#000', fontSize: 10, padding: '2px 6px',
                    borderRadius: 4, fontWeight: 700, lineHeight: 1,
                  }}>{tab.badge}</span>
                )}
              </Link>
            )
          })}
          <div style={{ height: 1, background: '#262626', margin: '8px 0' }} />
          <button style={{
            background: '#00C853', color: '#000', border: 'none', padding: '10px 14px',
            borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer',
            width: '100%', textAlign: 'left',
          }}>👑 Upgrade</button>
        </div>
      )}
    </nav>
  )
}
