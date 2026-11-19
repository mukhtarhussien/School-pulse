import 'server-only'
import { and, count, eq, gt } from 'drizzle-orm'
import { requireDb } from '@/db'
import { platformReports } from '@/db/schema'

const REPORTS_PER_DAY = 5

export async function hasReachedDailyReportLimit(userId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const [result] = await requireDb().select({ total: count() }).from(platformReports).where(and(
    eq(platformReports.reporterId, userId),
    gt(platformReports.createdAt, since),
  ))
  return (result?.total ?? 0) >= REPORTS_PER_DAY
}
