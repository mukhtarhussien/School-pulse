import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { submitReportAction } from './actions'

export const metadata = { title: 'إرسال بلاغ' }

export default async function ReportPage({ searchParams }: PageProps<'/report'>) {
  const user = await getCurrentUser()
  if (!user || !user.isActive || !['student', 'teacher', 'school_admin'].includes(user.role)) redirect('/login?next=/report')
  const query = await searchParams
  return <main className="platform-manager-gate" dir="rtl"><section className="pm-gate-card pm-report-form-page">
    <p className="pm-eyebrow">مركز المساعدة</p><h1>إرسال بلاغ</h1><p>أرسل مشكلة أو اقتراحًا، وسيصل مباشرة إلى إدارة المنصة.</p>
    {query.sent === '1' && <p className="pm-success">وصل بلاغك إلى الإدارة. شكرًا لمساعدتك.</p>}
    {query.error === 'invalid' && <p className="pm-error">تحقق من العنوان والتفاصيل ثم أعد الإرسال.</p>}
    {query.error === 'rate_limited' && <p className="pm-error">وصلت للحد اليومي للبلاغات. حاول غدًا.</p>}
    <form action={submitReportAction} className="pm-report-form"><label>نوع البلاغ<select name="category"><option value="bug">خلل تقني</option><option value="abuse">إساءة أو محتوى مخالف</option><option value="suggestion">اقتراح</option><option value="other">أخرى</option></select></label><label>العنوان<input name="subject" minLength={4} maxLength={160} required/></label><label>التفاصيل<textarea name="message" minLength={10} maxLength={5000} rows={7} required/></label><button className="pm-primary">إرسال البلاغ</button></form>
  </section></main>
}
