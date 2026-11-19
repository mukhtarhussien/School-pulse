import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'
import { requireDb } from '@/db'
import { schools } from '@/db/schema'
import { LOCALE_COOKIE, isLocale, localeFromGeo } from '@/lib/locale'
import { StudentPortal } from '@/components/student-portal'

export default async function PortalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [store, requestHeaders, user] = await Promise.all([cookies(), headers(), getCurrentUser()])
  if (!user || !['student', 'teacher', 'school_admin'].includes(user.role) || !user.isActive) redirect('/login')
  const [school] = user.schoolId ? await requireDb().select({ nameAr: schools.nameAr, nameEn: schools.nameEn }).from(schools).where(eq(schools.id, user.schoolId)).limit(1) : []
  const userLocale = user.preferences?.language
  const savedLocale = store.get(LOCALE_COOKIE)?.value
  const locale = isLocale(savedLocale) ? savedLocale : isLocale(userLocale) ? userLocale : localeFromGeo(requestHeaders.get('x-vercel-ip-country'), requestHeaders.get('x-vercel-ip-country-region'), requestHeaders.get('x-vercel-ip-city'))
  return <StudentPortal initialLocale={locale} profile={{
    name: user.fullNameAr,
    email: user.email,
    role: user.role === 'teacher' ? 'teacher' : user.role === 'school_admin' ? 'school_admin' : 'student',
    schoolName: locale === 'en' ? school?.nameEn ?? '' : school?.nameAr ?? '',
    username: user.username ?? '',
  }}>{children}</StudentPortal>
}
