'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Home, BookOpen, ClipboardCheck, CalendarDays, CalendarCheck, Bell, MessageCircle, UserRound, ChevronLeft, Menu, X, LogOut, UsersRound, Flag } from 'lucide-react'
import { logoutAction } from '@/app/login/actions'
import { t, type MessageKey } from '@/lib/i18n'
import type { Locale } from '@/lib/locale'

const links: { href: string; key: MessageKey; icon: typeof Home }[] = [
  { href: '/', key: 'home', icon: Home }, { href: '/grades', key: 'grades', icon: BookOpen },
  { href: '/assignments', key: 'assignments', icon: ClipboardCheck }, { href: '/attendance', key: 'attendance', icon: CalendarCheck },
  { href: '/calendar', key: 'calendar', icon: CalendarDays }, { href: '/notifications', key: 'notices', icon: Bell },
  { href: '/messages', key: 'messages', icon: MessageCircle }, { href: '/account', key: 'account', icon: UserRound },
]
const titles: Record<string, MessageKey> = { '/': 'home', '/grades': 'grades', '/assignments': 'assignments', '/attendance': 'attendance', '/calendar': 'calendar', '/notifications': 'notices', '/messages': 'messages', '/account': 'account' }
type Profile = { name: string; email: string; role: 'student' | 'teacher' | 'school_admin'; schoolName: string; username: string }

export function StudentPortal({ initialLocale, profile, children }: { initialLocale: Locale; profile: Profile; children: React.ReactNode }) {
  const pathname = usePathname()
  const [locale, setLocale] = useState<Locale>(initialLocale)
  const [menuOpen, setMenuOpen] = useState(false)
  const rtl = locale !== 'en'
  const title = pathname.startsWith('/community') ? (locale === 'en' ? 'Community' : 'المجتمع') : t(locale, titles[pathname] ?? 'home')
  const roleName = profile.role === 'teacher' ? 'مدرس' : profile.role === 'school_admin' ? 'إدارة مدرسة' : 'طالب'
  const initials = profile.name.trim().slice(0, 1) || 'م'
  useEffect(() => setMenuOpen(false), [pathname])
  useEffect(() => {
    document.documentElement.lang = locale === 'ckb' ? 'ckb-IQ' : locale === 'ar' ? 'ar-IQ' : 'en'
    document.documentElement.dir = rtl ? 'rtl' : 'ltr'
    document.cookie = `school_pulse_locale=${locale}; path=/; max-age=31536000; samesite=lax`
  }, [locale, rtl])
  const changeLocale = (value: string) => { if (value === 'ar' || value === 'ckb' || value === 'en') setLocale(value) }
  return <div className={`portal ${rtl ? 'rtl' : 'ltr'}`}>
    {menuOpen && <button className="mobile-scrim" aria-label="إغلاق القائمة" onClick={() => setMenuOpen(false)} />}
    <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><span className="brand-mark"><BookOpen size={21}/></span><span><b>مَدارِس</b><small>بوابة المدرسة</small></span><button className="icon-btn close-menu" onClick={() => setMenuOpen(false)} aria-label="إغلاق"><X size={19}/></button></div>
      <div className="school-chip"><span className="school-avatar">{profile.schoolName.slice(0,1) || 'م'}</span><span><b>{profile.schoolName || 'حساب المنصة'}</b><small>{roleName}</small></span></div>
      <div className="nav-label">القائمة الرئيسية</div>
      <nav className="side-nav">{links.map(({ href, key, icon: Icon }) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={`nav-link ${pathname === href ? 'active' : ''}`}><Icon size={18}/><span>{t(locale, key)}</span></Link>)}<Link href="/community" onClick={() => setMenuOpen(false)} className={`nav-link ${pathname.startsWith('/community') ? 'active' : ''}`}><UsersRound size={18}/><span>{locale === 'en' ? 'Community' : 'المجتمع'}</span></Link><Link href="/report" onClick={() => setMenuOpen(false)} className={`nav-link ${pathname === '/report' ? 'active' : ''}`}><Flag size={18}/><span>إرسال بلاغ</span></Link></nav>
      <div className="sidebar-bottom"><div className="student-mini"><span className="avatar">{initials}</span><span><b>{profile.name}</b><small>{profile.email}</small></span><form action={logoutAction}><button className="icon-btn" aria-label="تسجيل الخروج"><LogOut size={16}/></button></form></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="topbar-start"><button className="icon-btn mobile-menu" onClick={() => setMenuOpen(true)} aria-label="القائمة"><Menu size={20}/></button><div className="crumb"><span>{profile.schoolName || 'بوابة المدرسة'}</span><ChevronLeft size={14}/><b>{title}</b></div></div><div className="top-actions"><select className="locale-select" value={locale} onChange={e => changeLocale(e.target.value)} aria-label="اللغة"><option value="ckb">کوردی</option><option value="ar">العربية</option><option value="en">English</option></select><span className="top-avatar">{initials}</span></div></header>
      <div className="page-wrap"><div className="page-heading"><div><div className="eyebrow">بوابة {roleName}</div><h1>{title}</h1><p>{profile.name}</p></div></div>{children}<footer className="page-footer"><span>© {new Date().getFullYear()} مدارس · نظام إدارة المدرسة</span><span>بوابة المدرسة الرسمية</span></footer></div>
    </main>
    <nav className="mobile-nav">{links.slice(0,5).map(({href,key,icon:Icon})=><Link href={href} key={href} className={pathname===href?'active':''}><Icon size={19}/><span>{t(locale,key)}</span></Link>)}</nav>
  </div>
}
