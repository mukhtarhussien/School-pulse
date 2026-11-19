'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export function VisitTracker() {
  const pathname = usePathname()
  useEffect(() => {
    if (!pathname || pathname.startsWith('/api/')) return
    const previous = Number(sessionStorage.getItem(`schools-pulse:visit:${pathname}`) ?? 0)
    const now = Date.now()
    if (now - previous < 60_000) return
    sessionStorage.setItem(`schools-pulse:visit:${pathname}`, String(now))
    void fetch('/api/diagnostics/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => {})
  }, [pathname])
  return null
}
