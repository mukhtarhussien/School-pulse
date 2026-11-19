import { platformReports } from '@/db/schema'
import { getApiUser, apiError, apiJson, readJson } from '@/lib/api/v1'
import { hasReachedDailyReportLimit } from '@/lib/platform-reports'
import { requireDb } from '@/db'

const categories = ['bug', 'abuse', 'suggestion', 'other'] as const

export async function POST(request: Request) {
  const user = await getApiUser(request)
  if (!user) return apiError('unauthorized', 'سجّل الدخول لإرسال بلاغ.', 401)
  if (await hasReachedDailyReportLimit(user.id)) return apiError('rate_limited', 'وصلت للحد اليومي للبلاغات. حاول غدًا.', 429)
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > 16_384) return apiError('payload_too_large', 'حجم البلاغ أكبر من المسموح.', 413)
  const body = await readJson(request)
  const category = typeof body?.category === 'string' ? body.category : ''
  const subject = typeof body?.subject === 'string' ? body.subject.trim() : ''
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  if (!categories.includes(category as (typeof categories)[number]) || subject.length < 4 || subject.length > 160 || message.length < 10 || message.length > 5000) {
    return apiError('invalid_report', 'تحقق من نوع البلاغ والعنوان والتفاصيل.', 400)
  }
  const [report] = await requireDb().insert(platformReports).values({ reporterId: user.id, category, subject, message }).returning({ id: platformReports.id, createdAt: platformReports.createdAt })
  return apiJson(report, 201)
}
