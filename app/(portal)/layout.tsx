import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { LOCALE_COOKIE, isLocale, localeFromGeo } from '@/lib/locale'
import { headers } from 'next/headers'

export default async function PortalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [store, requestHeaders, user] = await Promise.all([cookies(), headers(), getCurrentUser()])
  const preview = process.env.NODE_ENV !== 'production' && store.get('school_pulse_preview')?.value === '1'
  if (!preview && (!user || !['student', 'teacher', 'school_admin'].includes(user.role) || !user.isActive)) redirect('/login')
  const userLocale = user?.preferences?.language
  const savedLocale = store.get(LOCALE_COOKIE)?.value
  const locale = isLocale(savedLocale) ? savedLocale : isLocale(userLocale) ? userLocale : localeFromGeo(requestHeaders.get('x-vercel-ip-country'), requestHeaders.get('x-vercel-ip-country-region'), requestHeaders.get('x-vercel-ip-city'))
  const { StudentPortal } = await import('@/components/student-portal')
  return <StudentPortal section="/" preview={preview} initialLocale={locale} socialEnabled={user?.preferences?.socialEnabled !== false} socialAudience={user?.preferences?.socialMessageAudience ?? 'platform'}>{children}</StudentPortal>
}
