'use server'

import { redirect } from 'next/navigation'
import { platformReports } from '@/db/schema'
import { requireDb } from '@/db'
import { getCurrentUser } from '@/lib/auth'
import { hasReachedDailyReportLimit } from '@/lib/platform-reports'

export async function submitReportAction(formData: FormData) {
  const user = await getCurrentUser()
  if (!user || !user.isActive || !['student', 'teacher', 'school_admin'].includes(user.role)) redirect('/login?next=/report')
  const category = String(formData.get('category') ?? '')
  const subject = String(formData.get('subject') ?? '').trim()
  const message = String(formData.get('message') ?? '').trim()
  if (!['bug', 'abuse', 'suggestion', 'other'].includes(category) || subject.length < 4 || subject.length > 160 || message.length < 10 || message.length > 5000) redirect('/report?error=invalid')
  if (await hasReachedDailyReportLimit(user.id)) redirect('/report?error=rate_limited')
  await requireDb().insert(platformReports).values({ reporterId: user.id, category, subject, message })
  redirect('/report?sent=1')
}
