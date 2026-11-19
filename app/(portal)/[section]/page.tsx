import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { and, desc, eq, gt, isNull, or } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'
import { requireDb } from '@/db'
import { assignmentSubmissions, assignments, assessments, attendanceRecords, calendarEvents, grades, messageRequests, notifications, subjects } from '@/db/schema'
import { saveAccountAction, saveSocialPreferencesAction } from '@/app/account/actions'
import Link from 'next/link'

const sections = ['grades', 'assignments', 'attendance', 'calendar', 'notifications', 'messages', 'account']
const empty = (message: string) => <section className="panel official-empty">{message}</section>
const date = (value: Date | null) => value ? new Intl.DateTimeFormat('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' }).format(value) : '—'

export function generateStaticParams() { return sections.map(section => ({ section })) }

export default async function StudentSectionPage({ params }: PageProps<'/[section]'>) {
  await connection()
  const { section } = await params
  if (!sections.includes(section)) notFound()
  const user = await getCurrentUser()
  if (!user) notFound()
  const db = requireDb()

  if (section === 'grades') {
    if (user.role !== 'student') return empty('الدرجات المنشورة للطلاب تظهر في هذه الصفحة.')
    const rows = await db.select({ id: grades.id, assessment: assessments.titleAr, subject: subjects.nameAr, score: grades.score, maxScore: assessments.maxScore, date: grades.gradedAt, feedback: grades.feedback }).from(grades).innerJoin(assessments, eq(assessments.id, grades.assessmentId)).innerJoin(subjects, eq(subjects.id, assessments.subjectId)).where(and(eq(grades.studentId, user.id), eq(assessments.published, true), ...(user.schoolId ? [eq(grades.schoolId, user.schoolId)] : []))).orderBy(desc(grades.gradedAt)).limit(100)
    return <section className="panel official-list"><h2>الدرجات المنشورة</h2>{rows.length ? rows.map(row => <article key={row.id}><h3>{row.assessment}</h3><p>{row.subject} · {row.score} / {row.maxScore}</p>{row.feedback && <p>{row.feedback}</p>}<time>{date(row.date)}</time></article>) : <p className="official-empty">لا توجد درجات منشورة حاليًا.</p>}</section>
  }

  if (section === 'assignments') {
    if (user.role !== 'student' || !user.classId) return empty('لا توجد واجبات مرتبطة بحسابك حاليًا.')
    const rows = await db.select({ id: assignments.id, title: assignments.titleAr, description: assignments.descriptionAr, dueAt: assignments.dueAt, subject: subjects.nameAr, submittedAt: assignmentSubmissions.submittedAt }).from(assignments).innerJoin(subjects, eq(subjects.id, assignments.subjectId)).leftJoin(assignmentSubmissions, and(eq(assignmentSubmissions.assignmentId, assignments.id), eq(assignmentSubmissions.studentId, user.id))).where(and(eq(assignments.classId, user.classId), eq(assignments.published, true), ...(user.schoolId ? [eq(assignments.schoolId, user.schoolId)] : []))).orderBy(assignments.dueAt).limit(100)
    return <section className="panel official-list"><h2>الواجبات</h2>{rows.length ? rows.map(row => <article key={row.id}><h3>{row.title}</h3>{row.description && <p>{row.description}</p>}<p>{row.subject} · موعد التسليم: {date(row.dueAt)}</p><small>{row.submittedAt ? `تم التسليم · ${date(row.submittedAt)}` : 'لم يتم التسليم'}</small></article>) : <p className="official-empty">لا توجد واجبات منشورة لصفك.</p>}</section>
  }

  if (section === 'attendance') {
    if (user.role !== 'student') return empty('سجل الحضور متاح للطالب.')
    const rows = await db.select({ id: attendanceRecords.id, date: attendanceRecords.date, status: attendanceRecords.status, note: attendanceRecords.note }).from(attendanceRecords).where(and(eq(attendanceRecords.studentId, user.id), ...(user.schoolId ? [eq(attendanceRecords.schoolId, user.schoolId)] : []))).orderBy(desc(attendanceRecords.date)).limit(100)
    return <section className="panel official-list"><h2>سجل الحضور</h2>{rows.length ? rows.map(row => <article key={row.id}><h3>{new Intl.DateTimeFormat('ar-IQ', { dateStyle: 'full' }).format(row.date)}</h3><p>{attendanceLabel(row.status)}</p>{row.note && <small>{row.note}</small>}</article>) : <p className="official-empty">لا توجد سجلات حضور مرتبطة بحسابك.</p>}</section>
  }

  if (section === 'calendar') {
    const rows = user.schoolId ? await db.select({ id: calendarEvents.id, title: calendarEvents.titleAr, description: calendarEvents.descriptionAr, startsAt: calendarEvents.startsAt, location: calendarEvents.location }).from(calendarEvents).where(and(eq(calendarEvents.schoolId, user.schoolId), gt(calendarEvents.startsAt, new Date()), or(isNull(calendarEvents.classId), user.classId ? eq(calendarEvents.classId, user.classId) : isNull(calendarEvents.classId)))).orderBy(calendarEvents.startsAt).limit(100) : []
    return <section className="panel official-list"><h2>تقويم المدرسة</h2>{rows.length ? rows.map(row => <article key={row.id}><h3>{row.title}</h3><p>{date(row.startsAt)}{row.location ? ` · ${row.location}` : ''}</p>{row.description && <small>{row.description}</small>}</article>) : <p className="official-empty">لا توجد مواعيد قادمة مسجلة.</p>}</section>
  }

  if (section === 'notifications') {
    const rows = await db.select({ id: notifications.id, title: notifications.titleAr, body: notifications.bodyAr, readAt: notifications.readAt, createdAt: notifications.createdAt }).from(notifications).where(and(or(eq(notifications.userId, user.id), isNull(notifications.userId)), user.schoolId ? or(eq(notifications.schoolId, user.schoolId), isNull(notifications.schoolId)) : isNull(notifications.schoolId))).orderBy(desc(notifications.createdAt)).limit(100)
    return <section className="panel official-list"><h2>الإشعارات</h2>{rows.length ? rows.map(row => <article key={row.id}><h3>{row.title}</h3><p>{row.body}</p><small>{date(row.createdAt)} · {row.readAt ? 'مقروء' : 'جديد'}</small></article>) : <p className="official-empty">لا توجد إشعارات جديدة.</p>}</section>
  }

  if (section === 'messages') {
    const rows = await db.select({ id: messageRequests.id, senderId: messageRequests.senderId, recipientId: messageRequests.recipientId, subject: messageRequests.subject, body: messageRequests.body, status: messageRequests.status, createdAt: messageRequests.createdAt }).from(messageRequests).where(and(or(eq(messageRequests.senderId, user.id), eq(messageRequests.recipientId, user.id)), user.schoolId ? or(eq(messageRequests.schoolId, user.schoolId), isNull(messageRequests.schoolId)) : isNull(messageRequests.schoolId))).orderBy(desc(messageRequests.createdAt)).limit(100)
    return <section className="panel official-list"><h2>الرسائل</h2>{rows.length ? rows.map(row => <article key={row.id}><h3>{row.subject || 'رسالة'}</h3><p>{row.body}</p><small>{row.senderId === user.id ? 'مرسلة' : 'واردة'} · {messageLabel(row.status)} · {date(row.createdAt)}</small></article>) : <p className="official-empty">لا توجد رسائل في حسابك.</p>}</section>
  }

  if (section === 'account') {
    return <section className="panel official-account"><h2>معلومات الحساب</h2><form action={saveAccountAction}><label>الاسم بالعربي<input name="fullNameAr" defaultValue={user.fullNameAr} required maxLength={160}/></label><label>الاسم بالإنجليزي<input name="fullNameEn" defaultValue={user.fullNameEn} required maxLength={160}/></label><label>اسم المستخدم<input name="username" defaultValue={user.username ?? ''} minLength={5} maxLength={32}/></label><label>رقم الهاتف<input name="phone" defaultValue={user.phone ?? ''} maxLength={40}/></label><p>البريد الإلكتروني: {user.email}</p><button className="primary-btn">حفظ المعلومات</button></form>{['student', 'teacher'].includes(user.role) && <form action={saveSocialPreferencesAction} className="official-social"><h3>إعدادات المجتمع</h3><label><input type="checkbox" name="socialEnabled" defaultChecked={user.preferences?.socialEnabled !== false}/> تفعيل المشاركة</label><label>نطاق الرسائل الاجتماعية<select name="socialMessageAudience" defaultValue={user.preferences?.socialMessageAudience ?? 'platform'}><option value="contacts">جهات الاتصال</option><option value="school">المدرسة</option><option value="platform">المنصة</option></select></label><button className="primary-btn">حفظ الإعدادات</button></form>}<Link href="/report">إرسال بلاغ إلى إدارة المنصة</Link></section>
  }
  return null
}

function attendanceLabel(status: string) { return ({ present: 'حاضر', late: 'متأخر', absent: 'غائب', excused: 'غياب بعذر' } as Record<string, string>)[status] ?? status }
function messageLabel(status: string) { return ({ pending: 'بانتظار الرد', accepted: 'مقبولة', rejected: 'مرفوضة', read: 'مقروءة' } as Record<string, string>)[status] ?? status }
